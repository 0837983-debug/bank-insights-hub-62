import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pool } from "../config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function createSchemas() {
  const client = await pool.connect();
  try {
    console.log("Creating database schemas...\n");

    // Read migration file
    const migration = await readFile(
      join(__dirname, "../migrations/001_create_schemas.sql"),
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
    console.error("❌ Failed to create schemas:", error);
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

