import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Используем те же настройки, что и в database.ts
const requiresSSL = process.env.DB_HOST?.includes("bankdb.ctogouqa8w5k.eu-north-1.rds.amazonaws.com") ||
                    process.env.DATABASE_URL?.includes("bankdb.ctogouqa8w5k.eu-north-1.rds.amazonaws.com");

const poolConfig: any = {
  host: process.env.DB_HOST || "bankdb.ctogouqa8w5k.eu-north-1.rds.amazonaws.com",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "bankdb",
  user: process.env.DB_USER || "pm",
  password: process.env.DB_PASSWORD || "2Lu125JK$CB#NCJak",
  connectionTimeoutMillis: 5000, // 5 секунд таймаут
};

if (requiresSSL) {
  poolConfig.ssl = {
    require: true,
    rejectUnauthorized: false
  };
}

const pool = new Pool(poolConfig);

// Проверка подключения
pool.query('SELECT NOW()')
  .then(() => {
    console.log("OK");
    pool.end();
    process.exit(0);
  })
  .catch((err) => {
    console.error("ERROR:", err.message);
    pool.end();
    process.exit(1);
  });
