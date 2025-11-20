require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function restoreDatabaseNode() {
  console.log('📥 Восстановление базы данных из дампа (через Node.js)...\n');

  // Получаем DATABASE_URL из .env
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ Ошибка: DATABASE_URL не найден в .env файле');
    process.exit(1);
  }

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
    possiblePaths.forEach(p => console.error(`   - ${p}`));
    process.exit(1);
  }

  console.log(`📄 Файл дампа: ${dumpPath}\n`);

  // Читаем SQL файл
  console.log('📖 Чтение SQL файла...');
  let sqlContent = fs.readFileSync(dumpPath, 'utf8');
  console.log(`   Размер файла: ${(sqlContent.length / 1024 / 1024).toFixed(2)} MB\n`);

  // Очищаем SQL от комментариев и служебных команд
  console.log('⚙️  Обработка SQL файла...');
  
  // Удаляем комментарии (строки, начинающиеся с --)
  sqlContent = sqlContent.split('\n')
    .filter(line => {
      const trimmed = line.trim();
      // Пропускаем комментарии
      if (trimmed.startsWith('--')) return false;
      // Пропускаем пустые строки после удаления комментариев
      return trimmed.length > 0;
    })
    .join('\n');

  // Удаляем SET команды и другие служебные команды pg_dump
  sqlContent = sqlContent.replace(/SET\s+\w+\s*=\s*[^;]+;/gi, '');
  sqlContent = sqlContent.replace(/SELECT\s+pg_catalog\.[^;]+;/gi, '');

  // Подключаемся к БД
  console.log('🔌 Подключение к базе данных...');
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('✅ Подключение успешно!\n');

    // Разбиваем на команды по точке с запятой
    // Но нужно быть осторожным с COPY командами, которые содержат данные
    console.log('⚙️  Парсинг SQL команд...');
    
    const commands = [];
    let currentCommand = '';
    let inCopyCommand = false;
    let copyDataLines = [];
    
    const lines = sqlContent.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Пропускаем пустые строки
      if (!line) continue;
      
      // Обрабатываем COPY команды
      if (line.match(/^COPY\s+public\./i)) {
        inCopyCommand = true;
        currentCommand = line;
        copyDataLines = [];
        continue;
      }
      
      if (inCopyCommand) {
        // Конец COPY команды
        if (line === '\\.' || line === '\\\\.' || line === '\\\\.') {
          // Выполняем COPY через специальный метод
          const copyMatch = currentCommand.match(/^COPY\s+public\.(\w+)\s*(?:\(([^)]*)\))?\s*FROM\s+stdin/i);
          if (copyMatch) {
            const tableName = copyMatch[1];
            const columnsStr = copyMatch[2];
            const columns = columnsStr ? columnsStr.split(',').map(c => c.trim()) : null;
            
            // Парсим данные (разделитель - табуляция)
            const dataRows = copyDataLines
              .filter(l => {
                const trimmed = l.trim();
                return trimmed.length > 0 && !trimmed.startsWith('\\') && trimmed !== '\\.';
              })
              .map(l => {
                // Разделяем по табуляции и обрабатываем \N как NULL
                return l.split('\t').map(val => {
                  const trimmed = val.trim();
                  if (trimmed === '\\N' || trimmed === '') {
                    return null;
                  }
                  return trimmed;
                });
              });
            
            if (dataRows.length > 0) {
              commands.push({
                type: 'COPY',
                table: tableName,
                columns: columns,
                data: dataRows
              });
            }
          }
          
          inCopyCommand = false;
          currentCommand = '';
          copyDataLines = [];
          continue;
        }
        
        // Данные COPY команды
        copyDataLines.push(line);
        continue;
      }
      
      // Обычные SQL команды
      currentCommand += (currentCommand ? ' ' : '') + line;
      
      // Команда завершена точкой с запятой
      if (line.endsWith(';')) {
        const cmd = currentCommand.slice(0, -1).trim(); // Убираем точку с запятой
        
        // Пропускаем пустые команды и служебные команды
        if (cmd && 
            !cmd.match(/^ALTER\s+SEQUENCE/i) &&
            !cmd.match(/^ALTER\s+TABLE\s+ONLY/i) &&
            cmd.length > 5) {
          commands.push({
            type: 'SQL',
            command: cmd
          });
        }
        
        currentCommand = '';
      }
    }

    console.log(`   Найдено команд: ${commands.length} (SQL: ${commands.filter(c => c.type === 'SQL').length}, COPY: ${commands.filter(c => c.type === 'COPY').length})\n`);

    // Выполняем команды
    console.log('⏳ Выполнение SQL команд...');
    let executed = 0;
    let errors = 0;
    let copyExecuted = 0;

    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      
      try {
        if (cmd.type === 'SQL') {
          // Обычные SQL команды
          if (cmd.command.length > 10000) {
            // Пропускаем очень большие команды (вероятно, данные)
            continue;
          }
          
          await client.query(cmd.command);
          executed++;
        } else if (cmd.type === 'COPY') {
          // COPY команды через INSERT
          if (cmd.data && cmd.data.length > 0) {
            const tableName = cmd.table;
            const columns = cmd.columns || [];
            
            // Формируем INSERT команды батчами по 100 строк
            const batchSize = 100;
            for (let j = 0; j < cmd.data.length; j += batchSize) {
              const batch = cmd.data.slice(j, j + batchSize);
              
              if (columns.length > 0) {
                // Фильтруем строки с правильным количеством колонок
                const validBatch = batch.filter(row => row.length === columns.length);
                
                if (validBatch.length > 0) {
                  const placeholders = validBatch.map((_, idx) => {
                    const rowPlaceholders = columns.map((_, colIdx) => 
                      `$${idx * columns.length + colIdx + 1}`
                    ).join(', ');
                    return `(${rowPlaceholders})`;
                  }).join(', ');
                  
                  const values = validBatch.flat();
                  const query = `INSERT INTO public.${tableName} (${columns.join(', ')}) VALUES ${placeholders} ON CONFLICT DO NOTHING`;
                  
                  await client.query(query, values);
                }
              } else {
                // Если колонки не указаны, используем простой INSERT
                // (это сложнее, пропускаем такие случаи)
                console.log(`   ⚠️  Пропущен COPY для ${tableName} (колонки не указаны)`);
                break;
              }
            }
            
            copyExecuted++;
            if (copyExecuted % 10 === 0) {
              process.stdout.write(`   Загружено таблиц: ${copyExecuted}\r`);
            }
          }
        }
        
        if ((executed + copyExecuted) % 50 === 0 && (executed + copyExecuted) > 0) {
          process.stdout.write(`   Выполнено: ${executed} SQL, ${copyExecuted} COPY\r`);
        }
      } catch (error) {
        // Игнорируем некоторые ошибки
        if (!error.message.includes('already exists') 
            && !error.message.includes('does not exist')
            && !error.message.includes('duplicate key')
            && !error.message.includes('violates foreign key')
            && !error.message.includes('relation') 
            && !error.message.includes('column') 
            && !error.message.includes('syntax error')) {
          errors++;
          if (errors < 20) {
            console.error(`\n   ⚠️  Ошибка в команде ${i + 1} (${cmd.type}): ${error.message.substring(0, 150)}`);
          }
        }
      }
    }

    console.log(`\n✅ Выполнено команд: ${executed} SQL, ${copyExecuted} COPY`);
    if (errors > 0) {
      console.log(`⚠️  Ошибок: ${errors}`);
    }

    console.log('\n📊 Следующие шаги:');
    console.log('   1. Запустите: npm run sync-prisma');
    console.log('   2. Запустите: npm run check-db');
    console.log('   3. Запустите: npm run test-backend');

  } catch (error) {
    console.error('❌ Ошибка при восстановлении:');
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Проверяем, установлен ли pg
try {
  require('pg');
} catch (e) {
  console.error('❌ Ошибка: Пакет "pg" не установлен');
  console.error('   Установите: npm install pg');
  process.exit(1);
}

restoreDatabaseNode();
