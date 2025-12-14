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

console.log("Проверка подключения к PostgreSQL на AWS RDS...");
console.log("Параметры подключения:");
console.log(`  Host: ${process.env.DB_HOST || "bankdb.ctogouqa8w5k.eu-north-1.rds.amazonaws.com"}`);
console.log(`  Port: ${process.env.DB_PORT || "5432"}`);
console.log(`  Database: ${process.env.DB_NAME || "bankdb"}`);
console.log(`  User: ${process.env.DB_USER || "pm"}`);
console.log(`  Password: ${process.env.DB_PASSWORD ? "***" : "***"}`);
console.log(`  SSL: required`);
console.log("");

pool
  .query("SELECT NOW(), version()")
  .then((result) => {
    console.log("✅ Подключение успешно!");
    console.log(`   Время сервера: ${result.rows[0].now}`);
    console.log(`   Версия PostgreSQL: ${result.rows[0].version.split(" ")[0]} ${result.rows[0].version.split(" ")[1]}`);
    
    // Проверка существования базы данных
    return pool.query("SELECT current_database()");
  })
  .then((result) => {
    console.log(`   Текущая база данных: ${result.rows[0].current_database}`);
    
    // Проверка таблиц
    return pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
  })
  .then((result) => {
    if (result.rows.length > 0) {
      console.log(`   Найдено таблиц: ${result.rows.length}`);
      console.log("   Таблицы:", result.rows.map((r) => r.table_name).join(", "));
    } else {
      console.log("   ⚠️  Таблицы не найдены");
    }
    
    pool.end();
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Ошибка подключения:");
    console.error(`   ${err.message}`);
    
    if (err.code === "ECONNREFUSED") {
      console.error("\n   Возможные причины:");
      console.error("   - PostgreSQL сервер не запущен");
      console.error("   - Неверный хост или порт");
    } else if (err.code === "28P01") {
      console.error("\n   Возможные причины:");
      console.error("   - Неверное имя пользователя или пароль");
    } else if (err.code === "3D000") {
      console.error("\n   Возможные причины:");
      console.error("   - База данных не существует");
    }
    
    pool.end();
    process.exit(1);
  });

