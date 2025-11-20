require('dotenv').config();
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execAsync = promisify(exec);

async function restoreDatabase() {
  console.log('📥 Восстановление базы данных из дампа...\n');

  // Получаем DATABASE_URL из .env
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ Ошибка: DATABASE_URL не найден в .env файле');
    process.exit(1);
  }

  // Парсим DATABASE_URL
  // Формат: postgresql://user:password@host:port/database?schema=public
  let urlMatch = databaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
  if (!urlMatch) {
    // Пробуем без порта
    urlMatch = databaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)/);
    if (!urlMatch) {
      console.error('❌ Ошибка: Неверный формат DATABASE_URL');
      console.error('   Ожидается: postgresql://user:password@host:port/database');
      console.error(`   Получено: ${databaseUrl}`);
      process.exit(1);
    }
    // Без порта - используем стандартный 5432
    const [, dbUser, dbPassword, dbHost, dbName] = urlMatch;
    var dbPort = '5432';
  } else {
    var [, dbUser, dbPassword, dbHost, dbPort, dbName] = urlMatch;
  }
  
  // Убираем query параметры из имени БД если есть
  const dbNameClean = dbName.split('?')[0];

  console.log('📋 Параметры подключения:');
  console.log(`   Host: ${dbHost}`);
  console.log(`   Port: ${dbPort}`);
  console.log(`   Database: ${dbNameClean}`);
  console.log(`   User: ${dbUser}\n`);

  // Путь к дампу - проверяем несколько возможных мест
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
    console.error(`❌ Ошибка: Файл дампа не найден`);
    console.error('   Проверенные пути:');
    possiblePaths.forEach(p => console.error(`   - ${p}`));
    console.error('\n   Убедитесь, что файл new_backup.sql находится в корне проекта или рядом с backend-auto-signal');
    process.exit(1);
  }

  console.log(`📄 Файл дампа: ${dumpPath}\n`);

  // Формируем команду для восстановления
  // Всегда используем переменные окружения для передачи пароля
  const isWindows = process.platform === 'win32';
  
  // Нормализуем путь к файлу - используем прямые слеши (работает и в Windows)
  const dumpPathNormalized = dumpPath.replace(/\\/g, '/');
  
  // Команда psql (без PGPASSWORD в команде, передаем через env)
  const psqlCommand = `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbNameClean} -f "${dumpPathNormalized}"`;

  console.log('⏳ Восстановление базы данных...');
  console.log('   Это может занять некоторое время...\n');

  try {
    // Передаем пароль через переменную окружения PGPASSWORD
    const env = {
      ...process.env,
      PGPASSWORD: dbPassword,
    };

    const { stdout, stderr } = await execAsync(psqlCommand, {
      env: env,
      maxBuffer: 10 * 1024 * 1024, // 10MB
      shell: isWindows, // Используем shell для Windows
    });

    if (stderr && !stderr.includes('NOTICE:')) {
      console.warn('⚠️ Предупреждения:');
      console.warn(stderr);
    }

    console.log('✅ База данных успешно восстановлена!\n');
    console.log('📊 Следующие шаги:');
    console.log('   1. Запустите: npm run sync-prisma (для синхронизации Prisma)');
    console.log('   2. Запустите: npm run check-db (для проверки данных)');
    console.log('   3. Запустите: npm run test-backend (для проверки API)');

  } catch (error) {
    console.error('❌ Ошибка при восстановлении базы данных:');
    console.error(error.message);
    
    if (error.message.includes('psql: command not found')) {
      console.error('\n💡 Решение:');
      console.error('   Убедитесь, что PostgreSQL клиент установлен');
      console.error('   Windows: Установите PostgreSQL и добавьте в PATH');
      console.error('   Linux: sudo apt-get install postgresql-client');
      console.error('   Mac: brew install postgresql');
    } else if (error.message.includes('password authentication failed')) {
      console.error('\n💡 Решение:');
      console.error('   Проверьте правильность пароля в DATABASE_URL');
    } else if (error.message.includes('could not connect')) {
      console.error('\n💡 Решение:');
      console.error('   Убедитесь, что PostgreSQL запущен и доступен');
      console.error(`   Проверьте подключение: psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbNameClean}`);
    } else if (error.message.includes('не является внутренней')) {
      console.error('\n💡 Решение для Windows:');
      console.error('   Убедитесь, что PostgreSQL установлен и добавлен в PATH');
      console.error('   Или используйте полный путь к psql.exe');
      console.error('   Пример: "C:\\Program Files\\PostgreSQL\\14\\bin\\psql.exe"');
    }
    
    process.exit(1);
  }
}

restoreDatabase();

