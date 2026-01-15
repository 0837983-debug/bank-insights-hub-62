import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Формируем DATABASE_URL если не установлен
if (!process.env.DATABASE_URL) {
  const password = encodeURIComponent(process.env.DB_PASSWORD || "2Lu125JK$CB#NCJak");
  process.env.DATABASE_URL = 
    `postgresql://${process.env.DB_USER || "pm"}:${password}@${process.env.DB_HOST || "bankdb.ctogouqa8w5k.eu-north-1.rds.amazonaws.com"}:${process.env.DB_PORT || "5432"}/${process.env.DB_NAME || "bankdb"}?sslmode=require`;
}

export default defineConfig({
  datasource: {
    url: env('DATABASE_URL'),
  },
});
