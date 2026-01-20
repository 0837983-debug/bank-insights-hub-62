import { pool } from "../config/database.js";

async function checkLayoutQuery() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT * FROM config.component_queries WHERE query_id = 'layout'"
    );
    
    if (result.rows.length === 0) {
      console.log("❌ Query 'layout' не найден в config.component_queries");
      return;
    }
    
    console.log("✅ Query 'layout' найден:");
    console.log(JSON.stringify(result.rows[0], null, 2));
  } finally {
    client.release();
  }
}

checkLayoutQuery()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Ошибка:", error);
    process.exit(1);
  });
