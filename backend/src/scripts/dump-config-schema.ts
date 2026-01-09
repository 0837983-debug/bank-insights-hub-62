import pg from "pg";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbConfig = {
  host: process.env.DB_HOST || "bankdb.ctogouqa8w5k.eu-north-1.rds.amazonaws.com",
  port: process.env.DB_PORT || "5432",
  database: process.env.DB_NAME || "bankdb",
  user: process.env.DB_USER || "pm",
  password: process.env.DB_PASSWORD || "2Lu125JK$CB#NCJak",
};

async function createDump() {
  try {
    // Create output directory in project root
    const projectRoot = path.resolve(__dirname, "../../../../");
    const outputDir = path.join(projectRoot, "config-mockups");
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`Created output directory: ${outputDir}\n`);
    }

    const dumpFile = path.join(outputDir, "config_schema_dump.sql");
    
    // Build pg_dump command
    const pgDumpCommand = [
      "pg_dump",
      `--host=${dbConfig.host}`,
      `--port=${dbConfig.port}`,
      `--username=${dbConfig.user}`,
      `--dbname=${dbConfig.database}`,
      "--schema=config",
      "--no-owner",
      "--no-privileges",
      "--verbose",
    ].join(" ");

    console.log("Creating SQL dump of config schema...");
    console.log(`Output file: ${dumpFile}\n`);

    // Set PGPASSWORD environment variable for pg_dump
    const env = {
      ...process.env,
      PGPASSWORD: dbConfig.password,
      PGSSLMODE: "require",
    };

    // Execute pg_dump
    const dumpContent = execSync(pgDumpCommand, {
      encoding: "utf-8",
      env: env,
      stdio: ["ignore", "pipe", "inherit"], // stdin ignored, stdout captured, stderr shown
    });

    // Write dump to file
    fs.writeFileSync(dumpFile, dumpContent, "utf-8");

    console.log(`✓ Successfully created dump: ${dumpFile}`);
    console.log(`  File size: ${(dumpContent.length / 1024).toFixed(2)} KB`);

    // Also create a compressed version if possible
    try {
      const compressedFile = path.join(outputDir, "config_schema_dump.sql.gz");
      execSync(`gzip -c "${dumpFile}" > "${compressedFile}"`, { env });
      console.log(`✓ Created compressed version: ${compressedFile}`);
    } catch (err) {
      // gzip might not be available, ignore
      console.log("  (Compressed version skipped)");
    }

  } catch (error: any) {
    console.error("Error creating dump:", error.message);
    if (error.stdout) console.error("Stdout:", error.stdout);
    if (error.stderr) console.error("Stderr:", error.stderr);
    process.exit(1);
  }
}

createDump();
