require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function findPsqlPath() {
  // Стандартные пути
  const commonPaths = [
    'C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe',
    'C:\\Program Files\\PostgreSQL\\15\\bin\\psql.exe',
    'C:\\Program Files\\PostgreSQL\\14\\bin\\psql.exe',
    'C:\\Program Files\\PostgreSQL\\13\\bin\\psql.exe',
    'C:\\Program Files\\PostgreSQL\\12\\bin\\psql.exe',
    'C:\\Program Files (x86)\\PostgreSQL\\16\\bin\\psql.exe',
    'C:\\Program Files (x86)\\PostgreSQL\\15\\bin\\psql.exe',
    'C:\\Program Files (x86)\\PostgreSQL\\14\\bin\\psql.exe',
    'C:\\Program Files (x86)\\PostgreSQL\\13\\bin\\psql.exe',
    'C:\\Program Files (x86)\\PostgreSQL\\12\\bin\\psql.exe',
  ];

  for (const psqlPath of commonPaths) {
    if (fs.existsSync(psqlPath)) {
      return psqlPath;
    }
  }

  // Пробуем найти в PATH
  try {
    const { execSync } = require('child_process');
    const result = execSync('where psql', { encoding: 'utf8' });
    if (result.trim()) {
      return result.trim().split('\n')[0].trim();
    }
  } catch (e) {
    // Игнорируем ошибку
  }

  return 'psql'; // Пробуем использовать из PATH
}

async function restoreDatabaseSimple() {
  console.log('📥 Восстановление базы данных из дампа...\n');

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

  console.log('📋 Параметры подключения:');
  console.log(`   Host: ${dbHost}`);
  console.log(`   Port: ${dbPort}`);
  console.log(`   Database: ${dbNameClean}`);
  console.log(`   User: ${dbUser}`);
  console.log(`📄 Файл дампа: ${dumpPath}\n`);

  // Находим psql
  console.log('🔍 Поиск psql...');
  const psqlPath = await findPsqlPath();
  console.log(`   Используется: ${psqlPath}\n`);

  return new Promise((resolve, reject) => {
    console.log('⏳ Восстановление базы данных...');
    console.log('   Это может занять некоторое время...\n');

    const psql = spawn(psqlPath, [
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
        console.log('\n📊 Следующие шаги:');
        console.log('   1. Запустите: npm run sync-prisma');
        console.log('   2. Запустите: npm run check-db');
        console.log('   3. Запустите: npm run test-backend');
        resolve();
      } else {
        console.error(`\n❌ Ошибка: psql завершился с кодом ${code}`);
        if (code === 127 || code === 1) {
          console.error('\n💡 Решение:');
          console.error('   psql не найден. Попробуйте:');
          console.error('   1. npm run find-psql (для поиска psql)');
          console.error('   2. npm run restore-db-node (альтернативный метод через Node.js)');
          console.error('   3. Установите PostgreSQL и добавьте в PATH');
        }
        reject(new Error(`psql exited with code ${code}`));
      }
    });

    psql.on('error', (error) => {
      console.error('❌ Ошибка при запуске psql:', error.message);
      if (error.message.includes('ENOENT')) {
        console.error('\n💡 Решение:');
        console.error('   psql не найден. Попробуйте:');
        console.error('   1. npm run find-psql (для поиска psql)');
        console.error('   2. npm run restore-db-node (альтернативный метод)');
        console.error('   3. Установите PostgreSQL: https://www.postgresql.org/download/windows/');
      }
      reject(error);
    });
  });
}

restoreDatabaseSimple()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



