import pg from "pg";
import dotenv from "dotenv";

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

async function dropDashboardSchema() {
  const client = await pool.connect();
  try {
    console.log("Dropping dashboard schema...\n");
    
    await client.query("DROP SCHEMA IF EXISTS dashboard CASCADE");
    console.log("✅ Dashboard schema dropped successfully!");
    
  } catch (error) {
    console.error("❌ Failed to drop dashboard schema:", error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

dropDashboardSchema().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

