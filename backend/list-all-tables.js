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

console.log("Проверка подключения и списка всех таблиц...\n");

pool
  .query("SELECT NOW(), version()")
  .then((result) => {
    console.log("✅ Подключение успешно!");
    console.log(`   Время сервера: ${result.rows[0].now}`);
    console.log(`   Версия PostgreSQL: ${result.rows[0].version.split(" ")[0]} ${result.rows[0].version.split(" ")[1]}\n`);
    
    // Получаем все схемы
    return pool.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name
    `);
  })
  .then((schemasResult) => {
    console.log(`Найдено схем: ${schemasResult.rows.length}`);
    
    // Для каждой схемы получаем таблицы
    const schemaPromises = schemasResult.rows.map(schema => {
      return pool.query(`
        SELECT 
          table_schema,
          table_name,
          table_type
        FROM information_schema.tables 
        WHERE table_schema = $1
        ORDER BY table_name
      `, [schema.schema_name]);
    });
    
    return Promise.all(schemaPromises);
  })
  .then((results) => {
    let totalTables = 0;
    const tablesBySchema = {};
    
    results.forEach((result, index) => {
      if (result.rows.length > 0) {
        const schemaName = result.rows[0].table_schema;
        tablesBySchema[schemaName] = result.rows;
        totalTables += result.rows.length;
      }
    });
    
    console.log(`Всего таблиц: ${totalTables}\n`);
    
    if (totalTables === 0) {
      console.log("   ⚠️  Таблицы не найдены");
    } else {
      // Выводим таблицы по схемам
      Object.keys(tablesBySchema).sort().forEach(schema => {
        const tables = tablesBySchema[schema];
        console.log(`📁 Схема: ${schema} (${tables.length} таблиц)`);
        tables.forEach(table => {
          const type = table.table_type === 'VIEW' ? ' [VIEW]' : '';
          console.log(`   - ${table.table_name}${type}`);
        });
        console.log("");
      });
    }
    
    pool.end();
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Ошибка:");
    console.error(`   ${err.message}`);
    pool.end();
    process.exit(1);
  });

