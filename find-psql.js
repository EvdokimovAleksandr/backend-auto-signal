const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function findPsql() {
  console.log('🔍 Поиск psql.exe на Windows...\n');

  // Стандартные пути установки PostgreSQL на Windows
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

  console.log('Проверка стандартных путей:');
  for (const psqlPath of commonPaths) {
    if (fs.existsSync(psqlPath)) {
      console.log(`✅ Найден: ${psqlPath}\n`);
      return psqlPath;
    }
    console.log(`   ❌ ${psqlPath}`);
  }

  // Пробуем найти через where (Windows)
  console.log('\nПоиск через where psql...');
  try {
    const { stdout } = await execAsync('where psql', { shell: true });
    if (stdout.trim()) {
      const foundPath = stdout.trim().split('\n')[0];
      console.log(`✅ Найден: ${foundPath}\n`);
      return foundPath;
    }
  } catch (e) {
    console.log('   ❌ Не найден в PATH\n');
  }

  // Пробуем найти через which (Git Bash)
  console.log('Поиск через which psql...');
  try {
    const { stdout } = await execAsync('which psql', { shell: true });
    if (stdout.trim()) {
      const foundPath = stdout.trim();
      console.log(`✅ Найден: ${foundPath}\n`);
      return foundPath;
    }
  } catch (e) {
    console.log('   ❌ Не найден\n');
  }

  console.log('❌ psql.exe не найден\n');
  console.log('💡 Решения:');
  console.log('   1. Установите PostgreSQL: https://www.postgresql.org/download/windows/');
  console.log('   2. Добавьте путь к bin в PATH:');
  console.log('      C:\\Program Files\\PostgreSQL\\XX\\bin');
  console.log('   3. Или используйте: npm run restore-db-node (восстановление через Node.js)');
  
  return null;
}

findPsql().then(psqlPath => {
  if (psqlPath) {
    console.log('📝 Использование:');
    console.log(`   Используйте полный путь: "${psqlPath}"`);
    console.log('   Или добавьте в PATH путь к папке bin');
  }
});


