import { pool } from "../config/database.js";
import { buildQueryFromId } from "../services/queryBuilder/builder.js";

async function testLayoutApiDirect() {
  const client = await pool.connect();
  try {
    console.log("=== Тест layout API напрямую ===\n");

    const paramsJson = JSON.stringify({ layout_id: "main_dashboard" });
    const sql = await buildQueryFromId("layout", paramsJson);
    console.log("SQL:", sql.substring(0, 300) + "...\n");

    const result = await client.query(sql);
    console.log("Rows count:", result.rows.length);
    
    if (result.rows.length > 0) {
      console.log("First row keys:", Object.keys(result.rows[0]));
      
      if (result.rows[0].jsonb_agg) {
        const data = result.rows[0].jsonb_agg;
        console.log("jsonb_agg type:", typeof data);
        console.log("jsonb_agg is array:", Array.isArray(data));
        
        if (Array.isArray(data)) {
          console.log("jsonb_agg length:", data.length);
          if (data.length > 0) {
            console.log("First element keys:", Object.keys(data[0]));
            console.log("First element:", JSON.stringify(data[0], null, 2).substring(0, 500));
          }
        } else {
          console.log("jsonb_agg:", JSON.stringify(data, null, 2).substring(0, 500));
        }
      } else {
        console.log("First row:", JSON.stringify(result.rows[0], null, 2).substring(0, 500));
      }
    }
  } catch (error: any) {
    console.error("❌ Ошибка:", error.message);
    console.error(error);
  } finally {
    client.release();
  }
}

testLayoutApiDirect().catch(console.error);
