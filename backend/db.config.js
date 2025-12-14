/**
 * PostgreSQL Database Configuration
 * 
 * Connection parameters for AWS RDS PostgreSQL database
 */

export const dbConfig = {
  host: 'bankdb.ctogouqa8w5k.eu-north-1.rds.amazonaws.com',
  port: 5432,
  database: 'bankdb',
  user: 'pm',
  password: '2Lu125JK$CB#NCJak',
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
};

/**
 * Connection string for psql command line tool
 */
export const psqlConnectionString = 
  `host=${dbConfig.host} port=${dbConfig.port} dbname=${dbConfig.database} user=${dbConfig.user} sslmode=require password=${dbConfig.password}`;

/**
 * Connection string for PostgreSQL URI format
 */
export const connectionUri = 
  `postgresql://${dbConfig.user}:${encodeURIComponent(dbConfig.password)}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}?sslmode=require`;
