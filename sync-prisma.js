require('dotenv').config();
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function syncPrisma() {
  console.log('🔄 Синхронизация Prisma с базой данных...\n');

  try {
    // Шаг 1: Получаем схему из БД
    console.log('1. Получение схемы из базы данных...');
    console.log('   Выполняется: npx prisma db pull\n');
    
    const { stdout: pullStdout, stderr: pullStderr } = await execAsync('npx prisma db pull', {
      cwd: __dirname,
      maxBuffer: 10 * 1024 * 1024,
    });

    if (pullStderr && !pullStderr.includes('warning')) {
      console.warn('⚠️ Предупреждения при db pull:');
      console.warn(pullStderr);
    }

    console.log('✅ Схема получена из базы данных\n');

    // Шаг 2: Генерируем Prisma Client
    console.log('2. Генерация Prisma Client...');
    console.log('   Выполняется: npx prisma generate\n');
    
    const { stdout: genStdout, stderr: genStderr } = await execAsync('npx prisma generate', {
      cwd: __dirname,
      maxBuffer: 10 * 1024 * 1024,
    });

    if (genStderr && !genStderr.includes('warning')) {
      console.warn('⚠️ Предупреждения при generate:');
      console.warn(genStderr);
    }

    console.log('✅ Prisma Client сгенерирован\n');

    console.log('🎉 Синхронизация завершена успешно!');
    console.log('\n📊 Следующие шаги:');
    console.log('   1. Проверьте schema.prisma на наличие изменений');
    console.log('   2. Запустите: npm run check-db (для проверки данных)');
    console.log('   3. Запустите: npm run test-backend (для проверки API)');

  } catch (error) {
    console.error('❌ Ошибка при синхронизации:');
    console.error(error.message);
    
    if (error.message.includes('ENOENT')) {
      console.error('\n💡 Решение:');
      console.error('   Убедитесь, что вы находитесь в папке backend-auto-signal');
    } else if (error.message.includes('DATABASE_URL')) {
      console.error('\n💡 Решение:');
      console.error('   Проверьте DATABASE_URL в .env файле');
    }
    
    process.exit(1);
  }
}

syncPrisma();



