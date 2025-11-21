require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function convertAndRestore() {
  console.log('🔄 Преобразование и восстановление данных из старого дампа...\n');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ Ошибка: DATABASE_URL не найден в .env файле');
    process.exit(1);
  }

  // Находим файл дампа
  const dumpPath = path.join(__dirname, '..', 'new_backup.sql');
  if (!fs.existsSync(dumpPath)) {
    console.error('❌ Ошибка: Файл дампа не найден:', dumpPath);
    process.exit(1);
  }

  console.log(`📄 Файл дампа: ${dumpPath}\n`);

  // Читаем SQL файл
  console.log('📖 Чтение SQL файла...');
  const sqlContent = fs.readFileSync(dumpPath, 'utf8');
  console.log(`   Размер файла: ${(sqlContent.length / 1024 / 1024).toFixed(2)} MB\n`);

  // Подключаемся к БД
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  console.log('✅ Подключение к базе данных успешно!\n');

  try {
    // Парсим данные из COPY команд
    const lines = sqlContent.split('\n');
    let currentTable = null;
    let currentColumns = null;
    let dataRows = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Находим COPY команды
      if (line.startsWith('COPY public.')) {
        const match = line.match(/COPY public\.(\w+)\s*\(([^)]+)\)/);
        if (match) {
          currentTable = match[1];
          currentColumns = match[2].split(',').map(c => c.trim());
          dataRows = [];
          console.log(`📦 Обработка таблицы: ${currentTable}`);
          continue;
        }
      }

      // Конец данных (\.)
      if (line === '\\.' && currentTable) {
        if (dataRows.length > 0) {
          await insertData(client, currentTable, currentColumns, dataRows);
        }
        currentTable = null;
        currentColumns = null;
        dataRows = [];
        continue;
      }

      // Собираем данные
      if (currentTable && line && !line.startsWith('--') && line !== '') {
        dataRows.push(line);
      }
    }

    console.log('\n✅ Данные успешно восстановлены!');
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

async function insertData(client, tableName, columns, rows) {
  if (rows.length === 0) return;

  // Преобразуем колонки для новой схемы
  let mappedColumns = [...columns];
  let mappedRows = [];

  if (tableName === 'brands') {
    // brands: brand -> name
    const brandIndex = columns.indexOf('brand');
    if (brandIndex !== -1) {
      mappedColumns[brandIndex] = 'name';
    }
    mappedRows = rows.map(row => {
      const values = row.split('\t');
      if (brandIndex !== -1) {
        values[brandIndex] = values[brandIndex] || '';
      }
      return values;
    });
  } else if (tableName === 'models') {
    // models: model -> name, убираем brand
    const modelIndex = columns.indexOf('model');
    const brandIndex = columns.indexOf('brand');
    if (modelIndex !== -1) {
      mappedColumns[modelIndex] = 'name';
    }
    if (brandIndex !== -1) {
      mappedColumns = mappedColumns.filter((_, i) => i !== brandIndex);
    }
    mappedRows = rows.map(row => {
      const values = row.split('\t');
      if (brandIndex !== -1) {
        values.splice(brandIndex, 1);
      }
      return values;
    });
  } else if (tableName === 'years') {
    // years: year -> value, убираем brand и model
    const yearIndex = columns.indexOf('year');
    const brandIndex = columns.indexOf('brand');
    const modelIndex = columns.indexOf('model');
    if (yearIndex !== -1) {
      mappedColumns[yearIndex] = 'value';
    }
    const indicesToRemove = [brandIndex, modelIndex].filter(i => i !== -1).sort((a, b) => b - a);
    indicesToRemove.forEach(idx => {
      mappedColumns.splice(idx, 1);
    });
    mappedRows = rows.map(row => {
      const values = row.split('\t');
      indicesToRemove.forEach(idx => {
        values.splice(idx, 1);
      });
      return values;
    });
  } else if (tableName === 'users') {
    // users: убираем id, PRIMARY KEY теперь user_id
    // name -> first_name (берем первое слово), last_name (остальное)
    const idIndex = columns.indexOf('id');
    const nameIndex = columns.indexOf('name');
    const stageIndex = columns.indexOf('stage');
    const pageIndex = columns.indexOf('page');
    
    // Убираем id, name, stage, page (их нет в новой схеме)
    const indicesToRemove = [idIndex, nameIndex, stageIndex, pageIndex].filter(i => i !== -1).sort((a, b) => b - a);
    indicesToRemove.forEach(idx => {
      mappedColumns.splice(idx, 1);
    });
    
    mappedRows = rows.map(row => {
      const values = row.split('\t');
      // Сохраняем name для разделения на first_name и last_name
      let firstName = null;
      let lastName = null;
      if (nameIndex !== -1 && values[nameIndex]) {
        const nameParts = values[nameIndex].trim().split(/\s+/);
        firstName = nameParts[0] || null;
        lastName = nameParts.slice(1).join(' ') || null;
      }
      
      // Удаляем ненужные колонки
      indicesToRemove.forEach(idx => {
        values.splice(idx, 1);
      });
      
      // Добавляем first_name и last_name
      const usernameIndex = mappedColumns.indexOf('username');
      if (usernameIndex !== -1) {
        values.splice(usernameIndex + 1, 0, firstName, lastName);
      } else {
        values.push(firstName, lastName);
      }
      
      return values;
    });
    
    // Добавляем first_name и last_name в колонки
    const usernameIndex = mappedColumns.indexOf('username');
    if (usernameIndex !== -1) {
      mappedColumns.splice(usernameIndex + 1, 0, 'first_name', 'last_name');
    } else {
      mappedColumns.push('first_name', 'last_name');
    }
  } else if (tableName === 'files') {
    // files: пропускаем, структура сильно изменилась
    console.log(`   ⚠️  Пропущено (структура изменилась)`);
    return;
  } else if (tableName === 'premium_users') {
    // premium_users: убираем sub_start и status
    const subStartIndex = columns.indexOf('sub_start');
    const statusIndex = columns.indexOf('status');
    const indicesToRemove = [subStartIndex, statusIndex].filter(i => i !== -1).sort((a, b) => b - a);
    indicesToRemove.forEach(idx => {
      mappedColumns.splice(idx, 1);
    });
    mappedRows = rows.map(row => {
      const values = row.split('\t');
      indicesToRemove.forEach(idx => {
        values.splice(idx, 1);
      });
      return values;
    });
  } else {
    // Для остальных таблиц используем как есть
    mappedRows = rows.map(row => row.split('\t'));
  }

  if (mappedRows.length === 0) return;

  // Создаем INSERT запрос
  const placeholders = mappedColumns.map((_, i) => `$${i + 1}`).join(', ');
  const columnNames = mappedColumns.map(col => `"${col}"`).join(', ');
  const query = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

  let inserted = 0;
  for (const row of mappedRows) {
    try {
      // Преобразуем значения
      const values = row.map((val, idx) => {
        const col = mappedColumns[idx];
        if (val === '\\N' || val === '') return null;
        if (col === 'user_id' || col === 'added_by') return BigInt(val);
        if (col === 'id' || col === 'brand_id' || col === 'model_id' || col === 'year_id' || col === 'file_id' || col === 'period_months') {
          return val ? parseInt(val) : null;
        }
        if (col === 'is_super_admin' || col === 'is_premium') return val === 't' || val === 'true';
        if (col.includes('_at') || col === 'created_at' || col === 'updated_at' || col === 'sub_end') {
          return val ? new Date(val) : null;
        }
        return val;
      });

      await client.query(query, values);
      inserted++;
    } catch (error) {
      // Игнорируем ошибки дубликатов и внешних ключей
      if (!error.message.includes('duplicate key') && !error.message.includes('violates foreign key')) {
        console.error(`   ⚠️  Ошибка вставки: ${error.message}`);
      }
    }
  }

  console.log(`   ✅ Вставлено записей: ${inserted}`);
}

convertAndRestore()
  .then(() => {
    console.log('\n🎉 Готово!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Критическая ошибка:', error);
    process.exit(1);
  });

