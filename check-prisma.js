/**
 * Скрипт для проверки подключения Prisma к базе данных
 * Запуск: node check-prisma.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPrisma() {
  console.log('🔍 Проверка подключения Prisma...\n');

  try {
    // Проверка подключения
    console.log('1. Проверка подключения к базе данных...');
    await prisma.$connect();
    console.log('✅ Подключение успешно!\n');

    // Проверка таблицы brands
    console.log('2. Проверка таблицы brands...');
    const brandsCount = await prisma.brands.count();
    console.log(`✅ Таблица brands доступна (записей: ${brandsCount})\n`);

    // Проверка таблицы users
    console.log('3. Проверка таблицы users...');
    const usersCount = await prisma.users.count();
    console.log(`✅ Таблица users доступна (записей: ${usersCount})\n`);

    // Проверка таблицы subscription_prices
    console.log('4. Проверка таблицы subscription_prices...');
    const pricesCount = await prisma.subscription_prices.count();
    console.log(`✅ Таблица subscription_prices доступна (записей: ${pricesCount})\n`);

    console.log('🎉 Все проверки пройдены успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error('\nВозможные решения:');
    console.error('1. Убедитесь, что DATABASE_URL правильно настроен в .env');
    console.error('2. Запустите: npx prisma generate');
    console.error('3. Запустите: npx prisma db push (для создания таблиц)');
    console.error('4. Убедитесь, что PostgreSQL запущен и доступен');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkPrisma();



