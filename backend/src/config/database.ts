import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Определяем SSL настройки
// Для AWS RDS с самоподписанными сертификатами нужно отключить проверку
const requiresSSL = process.env.DB_HOST?.includes("bankdb.ctogouqa8w5k.eu-north-1.rds.amazonaws.com") ||
                    process.env.DATABASE_URL?.includes("bankdb.ctogouqa8w5k.eu-north-1.rds.amazonaws.com");

// Создаем Pool для PostgreSQL с правильными SSL настройками
// Используем явные параметры для AWS RDS для лучшей поддержки SSL
const poolConfig: any = {
  host: process.env.DB_HOST || "bankdb.ctogouqa8w5k.eu-north-1.rds.amazonaws.com",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "bankdb",
  user: process.env.DB_USER || "pm",
  password: process.env.DB_PASSWORD || "2Lu125JK$CB#NCJak",
  // Дополнительные настройки для надежности соединения
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// Настраиваем SSL для AWS RDS (всегда требуется для этого хоста)
if (requiresSSL) {
  poolConfig.ssl = {
    require: true,
    rejectUnauthorized: false  // Отключаем проверку сертификата для самоподписанных сертификатов AWS RDS
  };
}

const pool = new Pool(poolConfig);

// Тест подключения при старте
pool.query('SELECT NOW()')
  .then(() => {
    console.log("Database connected successfully");
  })
  .catch((err) => {
    console.error("Failed to connect to database:", err);
  });

// Обработка отключения при завершении приложения
process.on("beforeExit", async () => {
  await pool.end();
});

// Экспортируем pool для использования в сервисах
export { pool };
