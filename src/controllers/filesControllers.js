const prisma = require("../config/database");

const filesController = {
  // ... существующие методы ...

  // Получить марки для управления описаниями
  getBrandsForDescriptions: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;

      const [brands, total] = await Promise.all([
        prisma.brands.findMany({
          orderBy: { brand: "asc" },
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
        orderBy: { model: "asc" },
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
        orderBy: { year: "asc" },
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
        include: {
          model: {
            include: {
              brand: true,
            },
          },
        },
      });

      if (!year) {
        return res.status(404).json({ error: "Год не найден" });
      }

      // Преобразуем ссылку Google Drive в ссылку для скачивания
      const downloadUrl = convertToDownloadLink(googleDriveUrl);

      if (downloadUrl === "Неверная ссылка!") {
        return res.status(400).json({ error: "Неверная ссылка Google Drive" });
      }

      // Создаем или обновляем запись файла
      const file = await prisma.files.upsert({
        where: {
          year_id: parseInt(yearId),
        },
        update: {
          photo: downloadUrl,
        },
        create: {
          year_id: parseInt(yearId),
          photo: downloadUrl,
        },
      });

      // Записываем статистику доступа
      await prisma.file_access_stats.create({
        data: {
          user_id: req.user.id,
          brand: year.model.brand.brand,
          model: year.model.model,
          year: year.year,
          file_id: file.id,
        },
      });

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
        include: {
          model: {
            include: {
              brand: true,
            },
          },
        },
      });

      if (!year) {
        return res.status(404).json({ error: "Год не найден" });
      }

      // Проверяем, есть ли у пользователя премиум-подписка
      let hasPremium = false;
      if (userId) {
        const premiumUser = await prisma.premium_users.findUnique({
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
          caption: file.caption,
        };

        // Проверяем доступ к обычным файлам
        if (file.photo) {
          fileData.photo = file.photo;
        }

        if (file.pdf) {
          fileData.pdf = file.pdf;
        }

        // Проверяем доступ к премиум-файлам
        if (hasPremium || req.user?.isAdmin) {
          if (file.premium_photo) {
            fileData.premium_photo = file.premium_photo;
          }

          if (file.premium_pdf) {
            fileData.premium_pdf = file.premium_pdf;
          }
        }

        return fileData;
      });

      res.json({
        year: year.year,
        model: year.model.model,
        brand: year.model.brand.brand,
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

      // Создаем или обновляем запись файла
      const file = await prisma.files.upsert({
        where: {
          year_id: parseInt(yearId),
        },
        update: {
          premium_photo: downloadUrl,
        },
        create: {
          year_id: parseInt(yearId),
          premium_photo: downloadUrl,
        },
      });

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

      // Создаем или обновляем запись файла
      const file = await prisma.files.upsert({
        where: {
          year_id: parseInt(yearId),
        },
        update: {
          pdf: downloadUrl,
        },
        create: {
          year_id: parseInt(yearId),
          pdf: downloadUrl,
        },
      });

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

      // Создаем или обновляем запись файла
      const file = await prisma.files.upsert({
        where: {
          year_id: parseInt(yearId),
        },
        update: {
          premium_pdf: downloadUrl,
        },
        create: {
          year_id: parseInt(yearId),
          premium_pdf: downloadUrl,
        },
      });

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
