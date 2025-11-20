require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addTestData() {
  console.log('📝 Добавление тестовых данных...\n');

  try {
    // 1. Добавление тестового пользователя
    console.log('1. Добавление тестового пользователя...');
    const testUser = await prisma.users.upsert({
      where: { user_id: BigInt('123456789') },
      update: {},
      create: {
        user_id: BigInt('123456789'),
        username: 'test_user',
        name: 'Test User',
      },
    });
    console.log(`   ✅ Пользователь создан: ${testUser.user_id.toString()}\n`);

    // 2. Добавление тестового админа
    console.log('2. Добавление тестового админа...');
    const testAdmin = await prisma.admin_users.upsert({
      where: { user_id: BigInt('123456789') },
      update: {},
      create: {
        user_id: BigInt('123456789'),
        username: 'test_user',
        is_super_admin: true,
      },
    });
    console.log(`   ✅ Админ создан: ${testAdmin.user_id.toString()}\n`);

    // 3. Добавление тестовых марок
    console.log('3. Добавление тестовых марок...');
    const testBrands = ['Toyota', 'BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen'];
    for (const brandName of testBrands) {
      const brand = await prisma.brands.upsert({
        where: { id: 0 }, // Это не сработает, нужно использовать другой подход
        update: {},
        create: { brand: brandName },
      }).catch(async () => {
        // Если уже существует, просто пропускаем
        return await prisma.brands.findFirst({ where: { brand: brandName } });
      });
    }
    // Альтернативный способ - проверка существования
    for (const brandName of testBrands) {
      const existing = await prisma.brands.findFirst({ where: { brand: brandName } });
      if (!existing) {
        await prisma.brands.create({ data: { brand: brandName } });
        console.log(`   ✅ Марка "${brandName}" добавлена`);
      } else {
        console.log(`   ⏭️  Марка "${brandName}" уже существует`);
      }
    }
    console.log('');

    // 4. Добавление тестовых моделей
    console.log('4. Добавление тестовых моделей...');
    const toyota = await prisma.brands.findFirst({ where: { brand: 'Toyota' } });
    if (toyota) {
      const toyotaModels = ['Camry', 'Corolla', 'RAV4', 'Prius'];
      for (const modelName of toyotaModels) {
        const existing = await prisma.models.findFirst({
          where: { model: modelName, brand_id: toyota.id },
        });
        if (!existing) {
          await prisma.models.create({
            data: {
              model: modelName,
              brand_id: toyota.id,
              brand: 'Toyota',
            },
          });
          console.log(`   ✅ Модель "${modelName}" для Toyota добавлена`);
        }
      }
    }
    console.log('');

    // 5. Добавление тестовых цен подписок
    console.log('5. Добавление тестовых цен подписок...');
    const subscriptionPrices = [
      { period_months: 1, price_kopecks: 30000 }, // 300 руб
      { period_months: 3, price_kopecks: 80000 }, // 800 руб
      { period_months: 6, price_kopecks: 150000 }, // 1500 руб
      { period_months: 12, price_kopecks: 280000 }, // 2800 руб
    ];

    for (const price of subscriptionPrices) {
      const existing = await prisma.subscription_prices.findUnique({
        where: { period_months: price.period_months },
      });
      if (!existing) {
        await prisma.subscription_prices.create({ data: price });
        console.log(`   ✅ Цена для ${price.period_months} месяц(ев): ${price.price_kopecks / 100} руб.`);
      } else {
        console.log(`   ⏭️  Цена для ${price.period_months} месяц(ев) уже существует`);
      }
    }
    console.log('');

    console.log('✅ Тестовые данные успешно добавлены!');
    console.log('\n💡 Теперь вы можете:');
    console.log('   - Войти с user_id: 123456789 (это админ)');
    console.log('   - Просмотреть марки автомобилей');
    console.log('   - Просмотреть цены подписок');

  } catch (error) {
    console.error('❌ Ошибка при добавлении тестовых данных:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestData();


