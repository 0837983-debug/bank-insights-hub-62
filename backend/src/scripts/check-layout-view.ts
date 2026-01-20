import { pool } from "../config/database.js";

async function checkLayoutView() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT * FROM config.layout_sections_json_view WHERE layout_id = 'main_dashboard' LIMIT 1"
    );
    
    if (result.rows.length === 0) {
      console.log("❌ Данные не найдены в layout_sections_json_view");
      return;
    }
    
    console.log("✅ Данные из layout_sections_json_view:");
    console.log(JSON.stringify(result.rows[0], null, 2));
  } finally {
    client.release();
  }
}

checkLayoutView()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Ошибка:", error);
    process.exit(1);
  });
