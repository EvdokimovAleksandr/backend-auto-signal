// test-connection.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    // Проверка подключения
    await prisma.$connect();
    console.log("✅ Успешное подключение к БД");

    // Простой запрос для проверки
    const brandsCount = await prisma.brands.count();
    console.log(`✅ Количество марок в БД: ${brandsCount}`);

    // Попробуйте другие простые запросы
    const firstBrand = await prisma.brands.findFirst();
    console.log("✅ Первая марка:", firstBrand);
  } catch (error) {
    console.error("❌ Ошибка подключения или запроса:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
