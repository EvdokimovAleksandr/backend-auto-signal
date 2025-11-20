require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const prisma = new PrismaClient();

async function restoreDatabaseAlt() {
  console.log('📥 Восстановление базы данных из дампа (альтернативный метод)...\n');

  // Получаем DATABASE_URL из .env
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ Ошибка: DATABASE_URL не найден в .env файле');
    process.exit(1);
  }

  // Парсим DATABASE_URL
  let urlMatch = databaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
  if (!urlMatch) {
    urlMatch = databaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)/);
    if (!urlMatch) {
      console.error('❌ Ошибка: Неверный формат DATABASE_URL');
      process.exit(1);
    }
    var dbPort = '5432';
    var [, dbUser, dbPassword, dbHost, dbName] = urlMatch;
  } else {
    var [, dbUser, dbPassword, dbHost, dbPort, dbName] = urlMatch;
  }

  const dbNameClean = dbName.split('?')[0];

  // Находим файл дампа
  const possiblePaths = [
    path.join(__dirname, '..', 'new_backup.sql'),
    path.join(__dirname, '..', 'backup.sql'),
    path.join(__dirname, 'new_backup.sql'),
    path.join(process.cwd(), 'new_backup.sql'),
    path.join(process.cwd(), 'backup.sql'),
  ];

  let dumpPath = null;
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      dumpPath = possiblePath;
      break;
    }
  }

  if (!dumpPath) {
    console.error('❌ Ошибка: Файл дампа не найден');
    process.exit(1);
  }

  console.log(`📄 Файл дампа: ${dumpPath}\n`);

  // Используем spawn для лучшей работы в Windows
  return new Promise((resolve, reject) => {
    const psql = spawn('psql', [
      '-h', dbHost,
      '-p', dbPort,
      '-U', dbUser,
      '-d', dbNameClean,
      '-f', dumpPath
    ], {
      env: { ...process.env, PGPASSWORD: dbPassword },
      stdio: 'inherit',
      shell: true
    });

    psql.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ База данных успешно восстановлена!');
        resolve();
      } else {
        console.error(`\n❌ Ошибка: psql завершился с кодом ${code}`);
        reject(new Error(`psql exited with code ${code}`));
      }
    });

    psql.on('error', (error) => {
      console.error('❌ Ошибка при запуске psql:', error.message);
      if (error.message.includes('ENOENT')) {
        console.error('\n💡 Решение:');
        console.error('   Убедитесь, что PostgreSQL установлен и psql доступен в PATH');
      }
      reject(error);
    });
  });
}

restoreDatabaseAlt()
  .then(() => {
    console.log('\n📊 Следующие шаги:');
    console.log('   1. Запустите: npm run sync-prisma');
    console.log('   2. Запустите: npm run check-db');
    console.log('   3. Запустите: npm run test-backend');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


