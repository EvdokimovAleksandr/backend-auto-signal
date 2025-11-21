const prisma = require("../utils/database");
const { convertToViewLink } = require("../utils/googleDrive");

const filesController = {
  // Получить марки для управления описаниями
  getBrandsForDescriptions: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;

      const [brands, total] = await Promise.all([
        prisma.brands.findMany({
          orderBy: { name: "asc" },
          skip: skip,
          take: parseInt(limit),
        }),
        prisma.brands.count(),
      ]);

      res.json({
        brands,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Получить модели по марке
  getModelsByBrandForDescriptions: async (req, res) => {
    try {
      const { brandId } = req.params;

      const models = await prisma.models.findMany({
        where: { brand_id: parseInt(brandId) },
        orderBy: { name: "asc" },
      });

      res.json(models);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Получить годы по модели
  getYearsByModelForDescriptions: async (req, res) => {
    try {
      const { modelId } = req.params;

      const years = await prisma.years.findMany({
        where: { model_id: parseInt(modelId) },
        orderBy: { value: "asc" },
      });

      res.json(years);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Получить файлы по году с фильтрацией
  getFilesByYearForDescriptions: async (req, res) => {
    try {
      const { yearId } = req.params;
      const { filter = "all" } = req.query;

      let whereCondition = { year_id: parseInt(yearId) };

      // Применяем фильтр по типу файла
      if (filter !== "all") {
        const filterMap = {
          photo: { photo: { not: null } },
          pphoto: { premium_photo: { not: null } },
          pdf: { pdf: { not: null } },
          ppdf: { premium_pdf: { not: null } },
        };

        if (filterMap[filter]) {
          whereCondition = { ...whereCondition, ...filterMap[filter] };
        }
      }

      const files = await prisma.files.findMany({
        where: whereCondition,
        orderBy: { id: "asc" },
      });

      // Добавляем тип файла для каждого файла
      const filesWithType = files.map((file) => ({
        ...file,
        file_type: getFileType(file),
      }));

      res.json(filesWithType);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Обновить описание файла
  updateFileDescription: async (req, res) => {
    try {
      const { fileId } = req.params;
      const { caption } = req.body;

      const updatedFile = await prisma.files.update({
        where: { id: parseInt(fileId) },
        data: { caption },
      });

      res.json(updatedFile);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  // Добавить фото
  addPhoto: async (req, res) => {
    try {
      const { googleDriveUrl, yearId } = req.body;

      if (!googleDriveUrl) {
        return res
          .status(400)
          .json({ error: "Необходима ссылка на Google Drive" });
      }

      if (!yearId) {
        return res.status(400).json({ error: "Необходим ID года" });
      }

      // Получаем информацию о годе, модели и марке
      const year = await prisma.years.findUnique({
        where: { id: parseInt(yearId) },
      });

      if (!year || !year.model_id) {
        return res.status(404).json({ error: "Год не найден или не привязан к модели" });
      }

      const model = await prisma.models.findUnique({
        where: { id: year.model_id },
      });

      if (!model || !model.brand_id) {
        return res.status(404).json({ error: "Модель не найдена или не привязана к марке" });
      }

      const brand = await prisma.brands.findUnique({
        where: { id: model.brand_id },
      });

      if (!brand) {
        return res.status(404).json({ error: "Марка не найдена" });
      }

      if (!year) {
        return res.status(404).json({ error: "Год не найден" });
      }

      // Преобразуем ссылку Google Drive в ссылку для скачивания
      const downloadUrl = convertToDownloadLink(googleDriveUrl);

      if (downloadUrl === "Неверная ссылка!") {
        return res.status(400).json({ error: "Неверная ссылка Google Drive" });
      }

      // Проверяем, существует ли файл для этого года
      let file = await prisma.files.findFirst({
        where: { year_id: parseInt(yearId) },
      });

      if (file) {
        // Обновляем существующий файл
        file = await prisma.files.update({
          where: { id: file.id },
          data: { photo: downloadUrl },
        });
      } else {
        // Создаем новый файл
        file = await prisma.files.create({
          data: {
            year_id: parseInt(yearId),
            photo: downloadUrl,
            year: year.value,
            model: model.name,
            brand: brand.name,
          },
        });
      }

      // Записываем статистику доступа (если есть пользователь)
      if (req.user?.id) {
        try {
          await prisma.file_access_stats.create({
            data: {
              user_id: BigInt(req.user.user_id),
          brand: brand.name,
          model: model.name,
          year: year.value,
              file_id: file.id,
            },
          });
        } catch (error) {
          // Игнорируем ошибки статистики
          console.error("Error creating access stats:", error);
        }
      }

      res.json(file);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Получить файлы по году
  getFilesByYear: async (req, res) => {
    try {
      const { yearId } = req.params;
      const { userId } = req.query;

      const year = await prisma.years.findUnique({
        where: { id: parseInt(yearId) },
      });

      if (!year || !year.model_id) {
        return res.status(404).json({ error: "Год не найден или не привязан к модели" });
      }

      const model = await prisma.models.findUnique({
        where: { id: year.model_id },
      });

      if (!model || !model.brand_id) {
        return res.status(404).json({ error: "Модель не найдена или не привязана к марке" });
      }

      const brand = await prisma.brands.findUnique({
        where: { id: model.brand_id },
      });

      if (!brand) {
        return res.status(404).json({ error: "Марка не найдена" });
      }

      // Проверяем, есть ли у пользователя премиум-подписка
      let hasPremium = false;
      if (userId) {
        // Используем findFirst, так как user_id не является уникальным ключом в схеме
        const premiumUser = await prisma.premium_users.findFirst({
          where: { user_id: BigInt(userId) },
        });

        if (premiumUser) {
          const currentTime = new Date();
          const subEnd = new Date(premiumUser.sub_end);
          hasPremium = currentTime <= subEnd;
        }
      }

      // Получаем файлы для этого года
      const files = await prisma.files.findMany({
        where: { year_id: parseInt(yearId) },
      });

      // Фильтруем файлы в зависимости от прав доступа
      const accessibleFiles = files.map((file) => {
        const fileData = {
          id: file.id,
          year_id: file.year_id,
          name: file.name || null,
          path: file.path || null,
          is_premium: file.is_premium || false,
        };

        // Определяем тип файла
        // Для Google Drive ссылок проверяем name, так как path не содержит расширения
        const fileName = (file.name || '').toLowerCase();
        const filePath = (file.path || '').toLowerCase();
        
        // Проверяем, является ли файл PDF
        const isPdf = fileName.includes('pdf') || 
                     filePath.includes('.pdf') ||
                     filePath.includes('pdf');
        
        // Если не PDF и не пустой path, считаем изображением
        // (так как в старой структуре были только photo и pdf)
        const isImage = !isPdf && file.path && 
                       !file.path.includes('Неверная') &&
                       (filePath.includes('drive.google.com') || 
                        /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName) ||
                        /\.(jpg|jpeg|png|gif|webp)$/i.test(filePath));

        // Если это изображение, конвертируем Google Drive ссылку
        if (isImage && file.path && !file.path.includes('Неверная')) {
          const viewLink = convertToViewLink(file.path) || file.path;
          
          if (file.is_premium && hasPremium) {
            fileData.premium_photo = viewLink;
          } else if (!file.is_premium) {
            fileData.photo = viewLink;
          }
        }

        // Если это PDF
        if (isPdf && file.path && !file.path.includes('Неверная')) {
          if (file.is_premium && hasPremium) {
            fileData.premium_pdf = file.path;
          } else if (!file.is_premium) {
            fileData.pdf = file.path;
          }
        }

        return fileData;
      });

      res.json({
        year: year.value,
        model: model.name,
        brand: brand.name,
        files: accessibleFiles,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Добавить премиум фото
  addPremiumPhoto: async (req, res) => {
    try {
      const { googleDriveUrl, yearId } = req.body;

      if (!googleDriveUrl) {
        return res
          .status(400)
          .json({ error: "Необходима ссылка на Google Drive" });
      }

      if (!yearId) {
        return res.status(400).json({ error: "Необходим ID года" });
      }

      // Преобразуем ссылку Google Drive в ссылку для скачивания
      const downloadUrl = convertToDownloadLink(googleDriveUrl);

      if (downloadUrl === "Неверная ссылка!") {
        return res.status(400).json({ error: "Неверная ссылка Google Drive" });
      }

      // Получаем информацию о годе, модели и марке
      const year = await prisma.years.findUnique({
        where: { id: parseInt(yearId) },
      });

      if (!year || !year.model_id) {
        return res.status(404).json({ error: "Год не найден или не привязан к модели" });
      }

      const model = await prisma.models.findUnique({
        where: { id: year.model_id },
      });

      if (!model || !model.brand_id) {
        return res.status(404).json({ error: "Модель не найдена или не привязана к марке" });
      }

      const brand = await prisma.brands.findUnique({
        where: { id: model.brand_id },
      });

      if (!brand) {
        return res.status(404).json({ error: "Марка не найдена" });
      }

      // Проверяем, существует ли файл для этого года
      let file = await prisma.files.findFirst({
        where: { year_id: parseInt(yearId) },
      });

      if (file) {
        // Обновляем существующий файл
        file = await prisma.files.update({
          where: { id: file.id },
          data: { premium_photo: downloadUrl },
        });
      } else {
        // Создаем новый файл
        file = await prisma.files.create({
          data: {
            year_id: parseInt(yearId),
            premium_photo: downloadUrl,
            year: year.year,
            model: model.model,
            brand: brand.brand,
          },
        });
      }

      res.json(file);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  // Удалить фото
  deletePhoto: async (req, res) => {
    try {
      const { fileId } = req.params;

      // Находим файл
      const file = await prisma.files.findUnique({
        where: { id: parseInt(fileId) },
      });

      if (!file) {
        return res.status(404).json({ error: "Файл не найден" });
      }

      // Обновляем файл, устанавливая photo в null
      const updatedFile = await prisma.files.update({
        where: { id: parseInt(fileId) },
        data: { photo: null },
      });

      res.json({ message: "Фото успешно удалено", file: updatedFile });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Удалить премиум фото
  deletePremiumPhoto: async (req, res) => {
    try {
      const { fileId } = req.params;

      // Находим файл
      const file = await prisma.files.findUnique({
        where: { id: parseInt(fileId) },
      });

      if (!file) {
        return res.status(404).json({ error: "Файл не найден" });
      }

      // Обновляем файл, устанавливая premium_photo в null
      const updatedFile = await prisma.files.update({
        where: { id: parseInt(fileId) },
        data: { premium_photo: null },
      });

      res.json({ message: "Премиум фото успешно удалено", file: updatedFile });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Добавить PDF
  addPdf: async (req, res) => {
    try {
      const { googleDriveUrl, yearId } = req.body;

      if (!googleDriveUrl) {
        return res
          .status(400)
          .json({ error: "Необходима ссылка на Google Drive" });
      }

      if (!yearId) {
        return res.status(400).json({ error: "Необходим ID года" });
      }

      // Преобразуем ссылку Google Drive в ссылку для скачивания
      const downloadUrl = convertToDownloadLink(googleDriveUrl);

      if (downloadUrl === "Неверная ссылка!") {
        return res.status(400).json({ error: "Неверная ссылка Google Drive" });
      }

      // Получаем информацию о годе, модели и марке
      const year = await prisma.years.findUnique({
        where: { id: parseInt(yearId) },
      });

      if (!year || !year.model_id) {
        return res.status(404).json({ error: "Год не найден или не привязан к модели" });
      }

      const model = await prisma.models.findUnique({
        where: { id: year.model_id },
      });

      if (!model || !model.brand_id) {
        return res.status(404).json({ error: "Модель не найдена или не привязана к марке" });
      }

      const brand = await prisma.brands.findUnique({
        where: { id: model.brand_id },
      });

      if (!brand) {
        return res.status(404).json({ error: "Марка не найдена" });
      }

      // Проверяем, существует ли файл для этого года
      let file = await prisma.files.findFirst({
        where: { year_id: parseInt(yearId) },
      });

      if (file) {
        // Обновляем существующий файл
        file = await prisma.files.update({
          where: { id: file.id },
          data: { pdf: downloadUrl },
        });
      } else {
        // Создаем новый файл
        file = await prisma.files.create({
          data: {
            year_id: parseInt(yearId),
            pdf: downloadUrl,
            year: year.year,
            model: model.model,
            brand: brand.brand,
          },
        });
      }

      res.json(file);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Удалить PDF
  deletePdf: async (req, res) => {
    try {
      const { fileId } = req.params;

      // Находим файл
      const file = await prisma.files.findUnique({
        where: { id: parseInt(fileId) },
      });

      if (!file) {
        return res.status(404).json({ error: "Файл не найден" });
      }

      // Обновляем файл, устанавливая pdf в null
      const updatedFile = await prisma.files.update({
        where: { id: parseInt(fileId) },
        data: { pdf: null },
      });

      res.json({ message: "PDF успешно удален", file: updatedFile });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Добавить премиум PDF
  addPremiumPdf: async (req, res) => {
    try {
      const { googleDriveUrl, yearId } = req.body;

      if (!googleDriveUrl) {
        return res
          .status(400)
          .json({ error: "Необходима ссылка на Google Drive" });
      }

      if (!yearId) {
        return res.status(400).json({ error: "Необходим ID года" });
      }

      // Преобразуем ссылку Google Drive в ссылку для скачивания
      const downloadUrl = convertToDownloadLink(googleDriveUrl);

      if (downloadUrl === "Неверная ссылка!") {
        return res.status(400).json({ error: "Неверная ссылка Google Drive" });
      }

      // Получаем информацию о годе, модели и марке
      const year = await prisma.years.findUnique({
        where: { id: parseInt(yearId) },
      });

      if (!year || !year.model_id) {
        return res.status(404).json({ error: "Год не найден или не привязан к модели" });
      }

      const model = await prisma.models.findUnique({
        where: { id: year.model_id },
      });

      if (!model || !model.brand_id) {
        return res.status(404).json({ error: "Модель не найдена или не привязана к марке" });
      }

      const brand = await prisma.brands.findUnique({
        where: { id: model.brand_id },
      });

      if (!brand) {
        return res.status(404).json({ error: "Марка не найдена" });
      }

      // Проверяем, существует ли файл для этого года
      let file = await prisma.files.findFirst({
        where: { year_id: parseInt(yearId) },
      });

      if (file) {
        // Обновляем существующий файл
        file = await prisma.files.update({
          where: { id: file.id },
          data: { premium_pdf: downloadUrl },
        });
      } else {
        // Создаем новый файл
        file = await prisma.files.create({
          data: {
            year_id: parseInt(yearId),
            premium_pdf: downloadUrl,
            year: year.year,
            model: model.model,
            brand: brand.brand,
          },
        });
      }

      res.json(file);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Удалить премиум PDF
  deletePremiumPdf: async (req, res) => {
    try {
      const { fileId } = req.params;

      // Находим файл
      const file = await prisma.files.findUnique({
        where: { id: parseInt(fileId) },
      });

      if (!file) {
        return res.status(404).json({ error: "Файл не найден" });
      }

      // Обновляем файл, устанавливая premium_pdf в null
      const updatedFile = await prisma.files.update({
        where: { id: parseInt(fileId) },
        data: { premium_pdf: null },
      });

      res.json({ message: "Премиум PDF успешно удален", file: updatedFile });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Получить файлы для удаления (предпросмотр)
  getFilesForDeletion: async (req, res) => {
    try {
      const { yearId, fileType } = req.params;

      // Определяем поле для фильтрации
      let fileField;
      switch (fileType) {
        case "photo":
          fileField = "photo";
          break;
        case "premium_photo":
          fileField = "premium_photo";
          break;
        case "pdf":
          fileField = "pdf";
          break;
        case "premium_pdf":
          fileField = "premium_pdf";
          break;
        default:
          return res.status(400).json({ error: "Неверный тип файла" });
      }

      // Получаем файлы с заполненным указанным полем
      const files = await prisma.files.findMany({
        where: {
          year_id: parseInt(yearId),
          [fileField]: { not: null },
        },
      });

      res.json(files);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Прокси для загрузки изображений из Google Drive (обход CORS)
  getImageProxy: async (req, res) => {
    console.log(`[Image Proxy] Запрос получен: fileId=${req.params.fileId}`);
    try {
      const { fileId } = req.params;
      
      if (!fileId) {
        console.log(`[Image Proxy] Ошибка: File ID не указан`);
        return res.status(400).json({ error: "File ID не указан" });
      }
      
      console.log(`[Image Proxy] Обрабатываем fileId: ${fileId}`);

      // Используем https для загрузки изображения
      const https = require('https');
      
      // Пробуем несколько вариантов ссылок Google Drive
      const tryDownloadImage = (url, attempt = 1, isThumbnail = false) => {
        console.log(`[Image Proxy] Попытка ${attempt} для fileId ${fileId}: ${url.substring(0, 100)}...`);
        
        const request = https.get(url, { followRedirect: false }, (driveRes) => {
          console.log(`[Image Proxy] Ответ: статус ${driveRes.statusCode}, Content-Type: ${driveRes.headers['content-type']}`);
          
          // Обрабатываем редиректы
          if (driveRes.statusCode === 302 || driveRes.statusCode === 301 || driveRes.statusCode === 303 || driveRes.statusCode === 307) {
            const redirectUrl = driveRes.headers.location;
            console.log(`[Image Proxy] Редирект ${driveRes.statusCode} на: ${redirectUrl}`);
            if (redirectUrl && attempt < 5) {
              // Если редирект относительный, делаем его абсолютным
              const absoluteUrl = redirectUrl.startsWith('http') ? redirectUrl : `https://drive.google.com${redirectUrl}`;
              return tryDownloadImage(absoluteUrl, attempt + 1, isThumbnail);
            }
          }
          
          // Проверяем Content-Type
          const contentType = driveRes.headers['content-type'] || '';
          
          // Если получили HTML (Google Drive показывает страницу предупреждения)
          if (contentType.includes('text/html')) {
            console.log(`[Image Proxy] ❌ Получен HTML вместо изображения (попытка ${attempt})`);
            driveRes.destroy();
            
            // Пробуем альтернативные методы
            if (isThumbnail && attempt === 1) {
              const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
              return tryDownloadImage(downloadUrl, 2, false);
            }
            if (!isThumbnail && attempt === 2) {
              const viewUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
              return tryDownloadImage(viewUrl, 3, false);
            }
            if (!res.headersSent) {
              return res.status(404).json({ error: "Изображение недоступно или требует авторизации" });
            }
            return;
          }
          
          if (driveRes.statusCode !== 200) {
            console.log(`[Image Proxy] Неуспешный статус: ${driveRes.statusCode}`);
            if (!res.headersSent) {
              // Пробуем альтернативные методы
              if (attempt === 1 && isThumbnail) {
                const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
                return tryDownloadImage(downloadUrl, 2, false);
              }
              return res.status(404).json({ error: "Изображение не найдено" });
            }
            return;
          }

          console.log(`[Image Proxy] ✅ Успешно! Загружаем изображение, Content-Type: ${contentType || 'image/jpeg'}`);
          
          // ВАЖНО: Устанавливаем заголовки ДО начала передачи данных
          if (!res.headersSent) {
            res.setHeader('Content-Type', contentType || 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            res.setHeader('Access-Control-Allow-Origin', '*');
          }

          // Передаем данные изображения клиенту
          driveRes.pipe(res);
        });
        
        request.on('error', (error) => {
          console.error(`[Image Proxy] Ошибка сети (попытка ${attempt}):`, error.message);
          if (!res.headersSent) {
            // Пробуем альтернативные методы
            if (attempt === 1 && isThumbnail) {
              const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
              return tryDownloadImage(downloadUrl, 2, false);
            }
            if (attempt === 2) {
              const viewUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
              return tryDownloadImage(viewUrl, 3, false);
            }
            res.status(500).json({ error: "Ошибка при загрузке изображения" });
          }
        });
        
        // Таймаут для запроса
        request.setTimeout(10000, () => {
          console.error(`[Image Proxy] Таймаут запроса (попытка ${attempt})`);
          request.destroy();
          if (!res.headersSent) {
            if (attempt === 1 && isThumbnail) {
              const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
              return tryDownloadImage(downloadUrl, 2, false);
            }
            res.status(504).json({ error: "Таймаут при загрузке изображения" });
          }
        });
      };

      // Начинаем с thumbnail API, так как он более надежен для изображений
      const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1920`;
      tryDownloadImage(thumbnailUrl, 1, true);
      
    } catch (error) {
      console.error('Ошибка в getImageProxy:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  },
};

// Вспомогательная функция для определения типа файла
function getFileType(file) {
  if (file.photo) return "Фото";
  if (file.premium_photo) return "Прем. фото";
  if (file.pdf) return "PDF";
  if (file.premium_pdf) return "Прем. PDF";
  return "Файл";
}

// Функция для преобразования ссылки Google Drive в ссылку для скачивания
function convertToDownloadLink(googleDriveLink) {
  if (googleDriveLink.includes("drive.google.com/file/d/")) {
    const fileId = googleDriveLink.split("/d/")[1].split("/")[0];
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
  return "Неверная ссылка!";
}

module.exports = filesController;
