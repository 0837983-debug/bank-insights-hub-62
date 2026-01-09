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

console.log("⚠️  УДАЛЕНИЕ ВСЕХ ТАБЛИЦ И СХЕМ ИЗ БАЗЫ ДАННЫХ\n");
console.log("Это удалит все данные! Продолжить? (Ctrl+C для отмены)\n");

// Небольшая задержка для возможности отмены
setTimeout(async () => {
  const client = await pool.connect();
  
  try {
    console.log("Начинаю удаление...\n");
    
    // Получаем все схемы (кроме системных)
    const schemasResult = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1')
      ORDER BY schema_name
    `);
    
    const schemas = schemasResult.rows.map(r => r.schema_name);
    console.log(`Найдено схем для удаления: ${schemas.length}`);
    schemas.forEach(schema => console.log(`  - ${schema}`));
    console.log("");
    
    // Для каждой схемы получаем все таблицы и представления
    for (const schema of schemas) {
      console.log(`📁 Обработка схемы: ${schema}`);
      
      // Получаем все таблицы и представления
      const tablesResult = await client.query(`
        SELECT 
          table_name,
          table_type
        FROM information_schema.tables 
        WHERE table_schema = $1
        ORDER BY table_name
      `, [schema]);
      
      if (tablesResult.rows.length > 0) {
        console.log(`   Найдено объектов: ${tablesResult.rows.length}`);
        
        // Удаляем все объекты в схеме
        for (const table of tablesResult.rows) {
          const objectType = table.table_type === 'VIEW' ? 'VIEW' : 'TABLE';
          const dropQuery = `DROP ${objectType} IF EXISTS ${schema}.${table.table_name} CASCADE`;
          
          try {
            await client.query(dropQuery);
            console.log(`   ✓ Удален ${objectType.toLowerCase()}: ${table.table_name}`);
          } catch (err) {
            console.error(`   ✗ Ошибка при удалении ${table.table_name}: ${err.message}`);
          }
        }
      } else {
        console.log(`   Нет объектов для удаления`);
      }
      
      // Удаляем саму схему (если она не public)
      if (schema !== 'public') {
        try {
          await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
          console.log(`   ✓ Схема ${schema} удалена\n`);
        } catch (err) {
          console.error(`   ✗ Ошибка при удалении схемы ${schema}: ${err.message}\n`);
        }
      } else {
        console.log(`   Схема public сохранена\n`);
      }
    }
    
    // Проверяем, что осталось
    const remainingResult = await client.query(`
      SELECT 
        table_schema,
        table_name
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1')
      ORDER BY table_schema, table_name
    `);
    
    console.log("\n" + "=".repeat(50));
    if (remainingResult.rows.length === 0) {
      console.log("✅ Все таблицы и схемы успешно удалены!");
      console.log("База данных готова для создания новой структуры.");
    } else {
      console.log(`⚠️  Осталось объектов: ${remainingResult.rows.length}`);
      remainingResult.rows.forEach(row => {
        console.log(`   ${row.table_schema}.${row.table_name}`);
      });
    }
    console.log("=".repeat(50));
    
  } catch (error) {
    console.error("\n❌ Критическая ошибка:");
    console.error(error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}, 2000); // 2 секунды на отмену

