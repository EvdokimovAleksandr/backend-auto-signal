require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function restoreFiles() {
  console.log('🔄 Восстановление файлов из старого дампа...\n');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ Ошибка: DATABASE_URL не найден в .env файле');
    process.exit(1);
  }

  // Находим файл дампа
  const dumpPath = path.join(__dirname, '..', 'backup.sql');
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
    // Парсим данные из COPY команд для files
    const lines = sqlContent.split('\n');
    let inFilesSection = false;
    let fileRows = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Находим COPY команду для files
      if (line.startsWith('COPY public.files')) {
        inFilesSection = true;
        console.log('📦 Найдена секция файлов');
        continue;
      }

      // Конец данных (\.)
      if (line === '\\.' && inFilesSection) {
        inFilesSection = false;
        console.log(`   Найдено строк файлов: ${fileRows.length}`);
        break;
      }

      // Собираем данные
      if (inFilesSection && line && !line.startsWith('--') && line !== '') {
        fileRows.push(line);
      }
    }

    if (fileRows.length === 0) {
      console.log('⚠️  Файлы не найдены в дампе');
      return;
    }

    console.log(`\n⏳ Обработка ${fileRows.length} файлов...\n`);

    let inserted = 0;
    let skipped = 0;

    for (const row of fileRows) {
      try {
        // Парсим строку: id, photo, pdf, premium_photo, premium_pdf, year_id, year, model, brand, caption
        const values = row.split('\t');
        
        if (values.length < 6) {
          skipped++;
          continue;
        }

        const id = parseInt(values[0]);
        const photo = values[1] && values[1] !== '\\N' ? values[1] : null;
        const pdf = values[2] && values[2] !== '\\N' ? values[2] : null;
        const premium_photo = values[3] && values[3] !== '\\N' ? values[3] : null;
        const premium_pdf = values[4] && values[4] !== '\\N' ? values[4] : null;
        const year_id = values[5] && values[5] !== '\\N' ? parseInt(values[5]) : null;
        const caption = values.length > 9 && values[9] && values[9] !== '\\N' ? values[9] : null;

        if (!year_id) {
          skipped++;
          continue;
        }

        // Создаем отдельные записи для каждого типа файла
        const filesToInsert = [];

        // Обычное фото
        if (photo) {
          const fileId = extractFileId(photo);
          filesToInsert.push({
            name: caption || `photo_${id}`,
            path: photo,
            is_premium: false,
            year_id: year_id,
          });
        }

        // Премиум фото
        if (premium_photo) {
          const fileId = extractFileId(premium_photo);
          filesToInsert.push({
            name: caption ? `${caption}_premium` : `premium_photo_${id}`,
            path: premium_photo,
            is_premium: true,
            year_id: year_id,
          });
        }

        // Обычный PDF
        if (pdf) {
          filesToInsert.push({
            name: caption ? `${caption}_pdf` : `pdf_${id}`,
            path: pdf,
            is_premium: false,
            year_id: year_id,
          });
        }

        // Премиум PDF
        if (premium_pdf) {
          filesToInsert.push({
            name: caption ? `${caption}_premium_pdf` : `premium_pdf_${id}`,
            path: premium_pdf,
            is_premium: true,
            year_id: year_id,
          });
        }

        // Вставляем файлы
        for (const fileData of filesToInsert) {
          try {
            await client.query(
              `INSERT INTO files (name, path, is_premium, year_id) 
               VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
              [fileData.name, fileData.path, fileData.is_premium, fileData.year_id]
            );
            inserted++;
          } catch (error) {
            if (!error.message.includes('duplicate key')) {
              console.error(`   ⚠️  Ошибка вставки файла: ${error.message}`);
            }
          }
        }
      } catch (error) {
        console.error(`   ⚠️  Ошибка обработки строки: ${error.message}`);
        skipped++;
      }
    }

    console.log(`\n✅ Восстановлено файлов: ${inserted}`);
    console.log(`⚠️  Пропущено: ${skipped}`);
    console.log('\n🎉 Готово!');
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

function extractFileId(googleDriveLink) {
  if (!googleDriveLink) return null;
  
  // Если это ссылка с id= в параметрах
  if (googleDriveLink.includes('id=')) {
    const match = googleDriveLink.match(/[?&]id=([^&]+)/);
    if (match) return match[1];
  }
  
  // Если это обычная ссылка Google Drive
  if (googleDriveLink.includes('drive.google.com/file/d/')) {
    const fileId = googleDriveLink.split('/d/')[1].split('/')[0];
    return fileId;
  }
  
  return null;
}

restoreFiles()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Критическая ошибка:', error);
    process.exit(1);
  });

