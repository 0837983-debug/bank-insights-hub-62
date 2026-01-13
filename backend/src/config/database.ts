import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

// Создаем Prisma Client
// DATABASE_URL должен быть установлен в .env или через переменные окружения
// Если не установлен, формируем из отдельных переменных
if (!process.env.DATABASE_URL) {
  const password = encodeURIComponent(process.env.DB_PASSWORD || "2Lu125JK$CB#NCJak");
  process.env.DATABASE_URL = 
    `postgresql://${process.env.DB_USER || "pm"}:${password}@${process.env.DB_HOST || "bankdb.ctogouqa8w5k.eu-north-1.rds.amazonaws.com"}:${process.env.DB_PORT || "5432"}/${process.env.DB_NAME || "bankdb"}?sslmode=require`;
}

// Создаем экземпляр Prisma Client
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

// Обработка подключения
prisma.$connect()
  .then(() => {
    console.log("Database connected via Prisma");
  })
  .catch((err) => {
    console.error("Failed to connect to database:", err);
  });

// Обработка отключения при завершении приложения
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

// Экспортируем также старый pool для обратной совместимости (можно будет удалить позже)
// @deprecated Используйте prisma вместо pool
export { prisma as pool };
