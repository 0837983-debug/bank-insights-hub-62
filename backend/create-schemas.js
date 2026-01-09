import pg from "pg";
import dotenv from "dotenv";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || "bankdb.ctogouqa8w5k.eu-north-1.rds.amazonaws.com",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "bankdb",
  user: process.env.DB_USER || "pm",
  password: process.env.DB_PASSWORD || "2Lu125JK$CB#NCJak",
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function createSchemas() {
  const client = await pool.connect();
  try {
    console.log("Creating database schemas...\n");

    // Read migration file
    const migration = await readFile(
      join(__dirname, "src/migrations/001_create_schemas.sql"),
      "utf-8"
    );

    // Execute migration
    await client.query(migration);
    console.log("✅ All schemas created successfully!");

    // Verify schemas were created
    const result = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name IN ('sec', 'config', 'dict', 'stg', 'ods', 'mart', 'ing', 'log')
      ORDER BY schema_name
    `);

    console.log(`\nCreated schemas (${result.rows.length}):`);
    result.rows.forEach((row) => {
      console.log(`  ✓ ${row.schema_name}`);
    });

  } catch (error) {
    console.error("❌ Failed to create schemas:", error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createSchemas().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

