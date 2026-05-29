#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_NAME="$(basename "$0")"

AWS_REGION="${AWS_REGION:-eu-central-1}"
PROJECT_NAME="${PROJECT_NAME:-bank-insights}"
AMI_ID="${AMI_ID:-}"
INSTANCE_TYPE_DEV="${INSTANCE_TYPE_DEV:-t3.medium}"
INSTANCE_TYPE_PROD="${INSTANCE_TYPE_PROD:-t3.large}"
VOLUME_SIZE_DEV="${VOLUME_SIZE_DEV:-80}"
VOLUME_SIZE_PROD="${VOLUME_SIZE_PROD:-200}"
SSH_CIDR="${SSH_CIDR:-}"
HTTP_CIDR="${HTTP_CIDR:-0.0.0.0/0}"
VPC_ID="${VPC_ID:-}"
SUBNET_ID="${SUBNET_ID:-}"
KEY_DIR="${KEY_DIR:-${HOME}/.ssh}"
CREATE_KEYS="${CREATE_KEYS:-true}"
DB_NAME_DEV="${DB_NAME_DEV:-bank_insights_dev}"
DB_NAME_PROD="${DB_NAME_PROD:-bank_insights_prod}"
DB_USER_DEV="${DB_USER_DEV:-bank_dev_user}"
DB_USER_PROD="${DB_USER_PROD:-bank_prod_user}"
DB_PASSWORD_DEV="${DB_PASSWORD_DEV:-}"
DB_PASSWORD_PROD="${DB_PASSWORD_PROD:-}"

DEV_KEY_NAME="${DEV_KEY_NAME:-${PROJECT_NAME}-dev-key}"
PROD_KEY_NAME="${PROD_KEY_NAME:-${PROJECT_NAME}-prod-key}"
DEV_SG_NAME="${DEV_SG_NAME:-${PROJECT_NAME}-dev-sg}"
PROD_SG_NAME="${PROD_SG_NAME:-${PROJECT_NAME}-prod-sg}"

log() {
  printf '[%s] %s\n' "${SCRIPT_NAME}" "$1"
}

fail() {
  printf '[%s] ERROR: %s\n' "${SCRIPT_NAME}" "$1" >&2
  exit 1
}

usage() {
  cat <<EOF
Usage:
  AWS_REGION=eu-central-1 SSH_CIDR=1.2.3.4/32 \\
  DB_PASSWORD_DEV='...' DB_PASSWORD_PROD='...' \\
  bash scripts/${SCRIPT_NAME}

Required env:
  SSH_CIDR            CIDR allowed to SSH into instances, e.g. 1.2.3.4/32
  DB_PASSWORD_DEV     PostgreSQL password for dev VM
  DB_PASSWORD_PROD    PostgreSQL password for prod VM

Optional env:
  AWS_REGION          Default: eu-central-1
  PROJECT_NAME        Default: bank-insights
  AMI_ID              Ubuntu AMI. If empty, latest Ubuntu 24.04 LTS amd64 is discovered via SSM
  INSTANCE_TYPE_DEV   Default: t3.medium
  INSTANCE_TYPE_PROD  Default: t3.large
  VOLUME_SIZE_DEV     Default: 80
  VOLUME_SIZE_PROD    Default: 200
  VPC_ID              Default VPC if empty
  SUBNET_ID           AWS chooses subnet if empty
  KEY_DIR             Default: ~/.ssh
  CREATE_KEYS         Default: true. If false, key pairs must already exist in AWS
  DEV_KEY_NAME        Default: bank-insights-dev-key
  PROD_KEY_NAME       Default: bank-insights-prod-key

What it creates:
  - two EC2 instances: \${PROJECT_NAME}-dev and \${PROJECT_NAME}-prod
  - separate SSH key pairs unless CREATE_KEYS=false
  - separate security groups
  - Ubuntu base setup via cloud-init:
    Node.js 20, PostgreSQL, Nginx, Git, PM2, project OS user, DB/user

Important:
  - PostgreSQL 5432 is not opened publicly.
  - Dev and prod get separate security groups, keys and DB passwords.
  - The script does not clone the repository and does not deploy application code.
EOF
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

json_escape() {
  python3 -c 'import json,sys; print(json.dumps(sys.stdin.read())[1:-1])'
}

ensure_inputs() {
  [[ "${1:-}" != "--help" && "${1:-}" != "-h" ]] || { usage; exit 0; }
  [[ -n "${SSH_CIDR}" ]] || fail "SSH_CIDR is required, e.g. SSH_CIDR=1.2.3.4/32"
  [[ -n "${DB_PASSWORD_DEV}" ]] || fail "DB_PASSWORD_DEV is required"
  [[ -n "${DB_PASSWORD_PROD}" ]] || fail "DB_PASSWORD_PROD is required"

  require_cmd aws
  require_cmd python3
  require_cmd chmod
  require_cmd mkdir

  aws sts get-caller-identity >/dev/null || fail "AWS CLI is not authenticated. Run aws configure or set AWS_PROFILE."
}

discover_vpc() {
  if [[ -n "${VPC_ID}" ]]; then
    printf '%s\n' "${VPC_ID}"
    return
  fi

  aws ec2 describe-vpcs \
    --region "${AWS_REGION}" \
    --filters Name=isDefault,Values=true \
    --query 'Vpcs[0].VpcId' \
    --output text
}

discover_ami() {
  if [[ -n "${AMI_ID}" ]]; then
    printf '%s\n' "${AMI_ID}"
    return
  fi

  aws ssm get-parameter \
    --region "${AWS_REGION}" \
    --name /aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id \
    --query 'Parameter.Value' \
    --output text
}

ensure_key_pair() {
  local key_name="$1"
  local key_path="${KEY_DIR}/${key_name}.pem"

  mkdir -p "${KEY_DIR}"

  if aws ec2 describe-key-pairs --region "${AWS_REGION}" --key-names "${key_name}" >/dev/null 2>&1; then
    log "Key pair already exists in AWS: ${key_name}"
    if [[ ! -f "${key_path}" ]]; then
      log "WARNING: Local private key not found: ${key_path}"
      log "You will need the matching private key to SSH."
    fi
    printf '%s\n' "${key_name}"
    return
  fi

  [[ "${CREATE_KEYS}" == "true" ]] || fail "Key pair ${key_name} does not exist and CREATE_KEYS=false"

  log "Creating key pair: ${key_name}"
  aws ec2 create-key-pair \
    --region "${AWS_REGION}" \
    --key-name "${key_name}" \
    --query 'KeyMaterial' \
    --output text > "${key_path}"
  chmod 400 "${key_path}"
  printf '%s\n' "${key_name}"
}

ensure_security_group() {
  local sg_name="$1"
  local description="$2"
  local vpc_id="$3"
  local sg_id

  sg_id="$(
    aws ec2 describe-security-groups \
      --region "${AWS_REGION}" \
      --filters "Name=group-name,Values=${sg_name}" "Name=vpc-id,Values=${vpc_id}" \
      --query 'SecurityGroups[0].GroupId' \
      --output text 2>/dev/null || true
  )"

  if [[ -z "${sg_id}" || "${sg_id}" == "None" ]]; then
    log "Creating security group: ${sg_name}"
    sg_id="$(
      aws ec2 create-security-group \
        --region "${AWS_REGION}" \
        --group-name "${sg_name}" \
        --description "${description}" \
        --vpc-id "${vpc_id}" \
        --query 'GroupId' \
        --output text
    )"
  else
    log "Security group already exists: ${sg_name} (${sg_id})"
  fi

  authorize_ingress "${sg_id}" 22 tcp "${SSH_CIDR}" "SSH"
  authorize_ingress "${sg_id}" 80 tcp "${HTTP_CIDR}" "HTTP"
  authorize_ingress "${sg_id}" 443 tcp "${HTTP_CIDR}" "HTTPS"

  printf '%s\n' "${sg_id}"
}

authorize_ingress() {
  local sg_id="$1"
  local port="$2"
  local protocol="$3"
  local cidr="$4"
  local label="$5"

  if aws ec2 authorize-security-group-ingress \
    --region "${AWS_REGION}" \
    --group-id "${sg_id}" \
    --ip-permissions "IpProtocol=${protocol},FromPort=${port},ToPort=${port},IpRanges=[{CidrIp=${cidr},Description=${label}}]" \
    >/dev/null 2>&1; then
    log "Allowed ${label} ${port}/${protocol} from ${cidr} on ${sg_id}"
  else
    log "Ingress ${label} ${port}/${protocol} from ${cidr} may already exist on ${sg_id}"
  fi
}

build_cloud_init() {
  local env_name="$1"
  local db_name="$2"
  local db_user="$3"
  local db_password="$4"
  local node_env="$5"
  local app_user="bankapp"
  local escaped_password

  escaped_password="$(printf '%s' "${db_password}" | sed "s/'/''/g")"

  cat <<EOF
#cloud-config
package_update: true
package_upgrade: true
packages:
  - curl
  - git
  - unzip
  - build-essential
  - nginx
  - postgresql
  - postgresql-contrib
  - ca-certificates
  - jq
users:
  - default
  - name: ${app_user}
    groups: sudo
    shell: /bin/bash
    sudo: ['ALL=(ALL) NOPASSWD:ALL']
write_files:
  - path: /etc/bank-insights.env
    permissions: '0600'
    owner: root:root
    content: |
      APP_ENV=${env_name}
      NODE_ENV=${node_env}
      DB_HOST=127.0.0.1
      DB_PORT=5432
      DB_NAME=${db_name}
      DB_USER=${db_user}
      DB_PASSWORD=${db_password}
      PORT=3001
      FRONTEND_URL=http://localhost
  - path: /etc/nginx/sites-available/bank-insights
    permissions: '0644'
    owner: root:root
    content: |
      server {
          listen 80 default_server;
          server_name _;

          root /var/www/bank-insights;
          index index.html;

          location / {
              try_files \$uri /index.html;
          }

          location /api/ {
              proxy_pass http://127.0.0.1:3001/api/;
              proxy_http_version 1.1;
              proxy_set_header Host \$host;
              proxy_set_header X-Real-IP \$remote_addr;
              proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
              proxy_set_header X-Forwarded-Proto \$scheme;
          }
      }
runcmd:
  - systemctl enable postgresql
  - systemctl start postgresql
  - sudo -u postgres psql -v ON_ERROR_STOP=1 -d postgres -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${db_user}') THEN CREATE ROLE \\"${db_user}\\" LOGIN PASSWORD '${escaped_password}'; ELSE ALTER ROLE \\"${db_user}\\" WITH LOGIN PASSWORD '${escaped_password}'; END IF; END \$\$;"
  - sudo -u postgres psql -v ON_ERROR_STOP=1 -d postgres -c "SELECT 'CREATE DATABASE \\"${db_name}\\" OWNER \\"${db_user}\\"' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${db_name}')\\gexec"
  - sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${db_name}" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
  - curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  - apt-get install -y nodejs
  - npm install -g pm2
  - mkdir -p /opt/bank-insights /var/www/bank-insights /var/backups/bank-insights
  - chown -R ${app_user}:${app_user} /opt/bank-insights /var/www/bank-insights /var/backups/bank-insights
  - rm -f /etc/nginx/sites-enabled/default
  - ln -sf /etc/nginx/sites-available/bank-insights /etc/nginx/sites-enabled/bank-insights
  - nginx -t
  - systemctl enable nginx
  - systemctl restart nginx
  - echo "${PROJECT_NAME}-${env_name} ready" > /opt/bank-insights/README.INSTANCE
EOF
}

run_instance() {
  local env_name="$1"
  local instance_type="$2"
  local volume_size="$3"
  local key_name="$4"
  local sg_id="$5"
  local ami_id="$6"
  local db_name="$7"
  local db_user="$8"
  local db_password="$9"
  local node_env="${10}"
  local instance_name="${PROJECT_NAME}-${env_name}"
  local user_data_file
  local subnet_args=()
  local instance_id

  user_data_file="$(mktemp)"
  build_cloud_init "${env_name}" "${db_name}" "${db_user}" "${db_password}" "${node_env}" > "${user_data_file}"

  if [[ -n "${SUBNET_ID}" ]]; then
    subnet_args=(--subnet-id "${SUBNET_ID}")
  fi

  log "Launching ${instance_name}"
  instance_id="$(
    aws ec2 run-instances \
      --region "${AWS_REGION}" \
      --image-id "${ami_id}" \
      --instance-type "${instance_type}" \
      --key-name "${key_name}" \
      --security-group-ids "${sg_id}" \
      "${subnet_args[@]}" \
      --block-device-mappings "DeviceName=/dev/sda1,Ebs={VolumeSize=${volume_size},VolumeType=gp3,DeleteOnTermination=true,Encrypted=true}" \
      --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${instance_name}},{Key=Project,Value=${PROJECT_NAME}},{Key=Environment,Value=${env_name}}]" \
      --user-data "file://${user_data_file}" \
      --query 'Instances[0].InstanceId' \
      --output text
  )"

  rm -f "${user_data_file}"
  printf '%s\n' "${instance_id}"
}

describe_instance() {
  local instance_id="$1"
  aws ec2 describe-instances \
    --region "${AWS_REGION}" \
    --instance-ids "${instance_id}" \
    --query 'Reservations[0].Instances[0].{InstanceId:InstanceId,State:State.Name,PublicIp:PublicIpAddress,PrivateIp:PrivateIpAddress,Name:Tags[?Key==`Name`]|[0].Value}' \
    --output table
}

main() {
  ensure_inputs "${1:-}"

  local vpc_id ami_id dev_key prod_key dev_sg prod_sg dev_instance prod_instance
  vpc_id="$(discover_vpc)"
  [[ -n "${vpc_id}" && "${vpc_id}" != "None" ]] || fail "Unable to discover VPC. Set VPC_ID."
  log "Using VPC: ${vpc_id}"

  ami_id="$(discover_ami)"
  [[ -n "${ami_id}" && "${ami_id}" != "None" ]] || fail "Unable to discover Ubuntu AMI. Set AMI_ID."
  log "Using AMI: ${ami_id}"

  dev_key="$(ensure_key_pair "${DEV_KEY_NAME}")"
  prod_key="$(ensure_key_pair "${PROD_KEY_NAME}")"

  dev_sg="$(ensure_security_group "${DEV_SG_NAME}" "${PROJECT_NAME} dev security group" "${vpc_id}")"
  prod_sg="$(ensure_security_group "${PROD_SG_NAME}" "${PROJECT_NAME} prod security group" "${vpc_id}")"

  dev_instance="$(run_instance "dev" "${INSTANCE_TYPE_DEV}" "${VOLUME_SIZE_DEV}" "${dev_key}" "${dev_sg}" "${ami_id}" "${DB_NAME_DEV}" "${DB_USER_DEV}" "${DB_PASSWORD_DEV}" "development")"
  prod_instance="$(run_instance "prod" "${INSTANCE_TYPE_PROD}" "${VOLUME_SIZE_PROD}" "${prod_key}" "${prod_sg}" "${ami_id}" "${DB_NAME_PROD}" "${DB_USER_PROD}" "${DB_PASSWORD_PROD}" "production")"

  log "Waiting for instances to enter running state"
  aws ec2 wait instance-running --region "${AWS_REGION}" --instance-ids "${dev_instance}" "${prod_instance}"

  log "DEV instance:"
  describe_instance "${dev_instance}"
  log "PROD instance:"
  describe_instance "${prod_instance}"

  cat <<EOF

Next steps:
1. Wait 3-8 minutes for cloud-init to finish on each VM.
   Check with:
     ssh -i ${KEY_DIR}/${DEV_KEY_NAME}.pem ubuntu@<DEV_PUBLIC_IP> 'cloud-init status --wait'
     ssh -i ${KEY_DIR}/${PROD_KEY_NAME}.pem ubuntu@<PROD_PUBLIC_IP> 'cloud-init status --wait'

2. Developer gets access only to DEV:
     ssh -i ${KEY_DIR}/${DEV_KEY_NAME}.pem ubuntu@<DEV_PUBLIC_IP>

3. Keep PROD key and /etc/bank-insights.env private.

4. Deploy code manually from Git:
     sudo -iu bankapp
     cd /opt/bank-insights
     git clone <repo-url> app

5. PostgreSQL is local-only on each VM. Do not open 5432 publicly.
EOF
}

main "$@"
