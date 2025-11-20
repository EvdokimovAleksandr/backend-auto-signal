require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('🔍 Проверка базы данных...\n');

  try {
    // 1. Проверка подключения
    console.log('1. Проверка подключения к базе данных...');
    await prisma.$connect();
    console.log('✅ Подключение успешно!\n');

    // 2. Проверка таблицы users
    console.log('2. Проверка таблицы users...');
    const usersCount = await prisma.users.count();
    const users = await prisma.users.findMany({ take: 5 });
    console.log(`   Всего пользователей: ${usersCount}`);
    if (users.length > 0) {
      console.log('   Примеры пользователей:');
      users.forEach(user => {
        console.log(`   - ID: ${user.id}, user_id: ${user.user_id?.toString()}, username: ${user.username || 'N/A'}, name: ${user.name || 'N/A'}`);
      });
    } else {
      console.log('   ⚠️ Таблица users пуста');
    }
    console.log('');

    // 3. Проверка таблицы brands
    console.log('3. Проверка таблицы brands...');
    const brandsCount = await prisma.brands.count();
    const brands = await prisma.brands.findMany({ take: 5 });
    console.log(`   Всего марок: ${brandsCount}`);
    if (brands.length > 0) {
      console.log('   Примеры марок:');
      brands.forEach(brand => {
        console.log(`   - ID: ${brand.id}, brand: ${brand.brand}`);
      });
    } else {
      console.log('   ⚠️ Таблица brands пуста');
    }
    console.log('');

    // 4. Проверка таблицы models
    console.log('4. Проверка таблицы models...');
    const modelsCount = await prisma.models.count();
    const models = await prisma.models.findMany({ take: 5 });
    console.log(`   Всего моделей: ${modelsCount}`);
    if (models.length > 0) {
      console.log('   Примеры моделей:');
      models.forEach(model => {
        console.log(`   - ID: ${model.id}, model: ${model.model}, brand_id: ${model.brand_id}`);
      });
    } else {
      console.log('   ⚠️ Таблица models пуста');
    }
    console.log('');

    // 5. Проверка таблицы years
    console.log('5. Проверка таблицы years...');
    const yearsCount = await prisma.years.count();
    const years = await prisma.years.findMany({ take: 5 });
    console.log(`   Всего годов: ${yearsCount}`);
    if (years.length > 0) {
      console.log('   Примеры годов:');
      years.forEach(year => {
        console.log(`   - ID: ${year.id}, year: ${year.year}, model_id: ${year.model_id}`);
      });
    } else {
      console.log('   ⚠️ Таблица years пуста');
    }
    console.log('');

    // 6. Проверка таблицы files
    console.log('6. Проверка таблицы files...');
    const filesCount = await prisma.files.count();
    const files = await prisma.files.findMany({ take: 3 });
    console.log(`   Всего файлов: ${filesCount}`);
    if (files.length > 0) {
      console.log('   Примеры файлов:');
      files.forEach(file => {
        console.log(`   - ID: ${file.id}, year_id: ${file.year_id}, brand: ${file.brand}, model: ${file.model}, year: ${file.year}`);
        console.log(`     photo: ${file.photo ? 'есть' : 'нет'}, pdf: ${file.pdf ? 'есть' : 'нет'}`);
        console.log(`     premium_photo: ${file.premium_photo ? 'есть' : 'нет'}, premium_pdf: ${file.premium_pdf ? 'есть' : 'нет'}`);
      });
    } else {
      console.log('   ⚠️ Таблица files пуста');
    }
    console.log('');

    // 7. Проверка таблицы admin_users
    console.log('7. Проверка таблицы admin_users...');
    const adminsCount = await prisma.admin_users.count();
    const admins = await prisma.admin_users.findMany({ take: 5 });
    console.log(`   Всего админов: ${adminsCount}`);
    if (admins.length > 0) {
      console.log('   Админы:');
      admins.forEach(admin => {
        console.log(`   - user_id: ${admin.user_id?.toString()}, username: ${admin.username || 'N/A'}, is_super_admin: ${admin.is_super_admin}`);
      });
    } else {
      console.log('   ⚠️ Таблица admin_users пуста');
    }
    console.log('');

    // 8. Проверка таблицы premium_users
    console.log('8. Проверка таблицы premium_users...');
    const premiumCount = await prisma.premium_users.count();
    const premiumUsers = await prisma.premium_users.findMany({ take: 5 });
    console.log(`   Всего премиум пользователей: ${premiumCount}`);
    if (premiumUsers.length > 0) {
      console.log('   Премиум пользователи:');
      premiumUsers.forEach(premium => {
        console.log(`   - user_id: ${premium.user_id?.toString()}, sub_start: ${premium.sub_start}, sub_end: ${premium.sub_end}, status: ${premium.status}`);
      });
    } else {
      console.log('   ⚠️ Таблица premium_users пуста');
    }
    console.log('');

    // 9. Проверка таблицы subscription_prices
    console.log('9. Проверка таблицы subscription_prices...');
    const pricesCount = await prisma.subscription_prices.count();
    const prices = await prisma.subscription_prices.findMany();
    console.log(`   Всего цен подписок: ${pricesCount}`);
    if (prices.length > 0) {
      console.log('   Цены подписок:');
      prices.forEach(price => {
        console.log(`   - ${price.period_months} месяц(ев): ${price.price_kopecks / 100} руб.`);
      });
    } else {
      console.log('   ⚠️ Таблица subscription_prices пуста');
    }
    console.log('');

    // Итоговая статистика
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log(`   Пользователей: ${usersCount}`);
    console.log(`   Марок: ${brandsCount}`);
    console.log(`   Моделей: ${modelsCount}`);
    console.log(`   Годов: ${yearsCount}`);
    console.log(`   Файлов: ${filesCount}`);
    console.log(`   Админов: ${adminsCount}`);
    console.log(`   Премиум пользователей: ${premiumCount}`);
    console.log(`   Цен подписок: ${pricesCount}`);

    if (usersCount === 0 && brandsCount === 0) {
      console.log('\n⚠️ ВНИМАНИЕ: База данных пуста!');
      console.log('   Рекомендуется добавить тестовые данные для проверки работы приложения.');
    }

  } catch (error) {
    console.error('❌ Ошибка при проверке базы данных:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();


