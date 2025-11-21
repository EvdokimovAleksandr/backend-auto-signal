const prisma = require("../utils/database");

const carsController = {
  // Получить все марки
  getBrands: async (req, res) => {
    try {
      const brands = await prisma.brands.findMany({
        orderBy: { brand: "asc" },
      });
      res.json(brands);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Добавить марку
  addBrand: async (req, res) => {
    try {
      const { brand } = req.body;

      const newBrand = await prisma.brands.create({
        data: { brand },
      });

      res.json(newBrand);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Удалить марку и связанные данные
  deleteBrand: async (req, res) => {
    try {
      const { id } = req.params;

      // Находим все модели этой марки
      const models = await prisma.models.findMany({
        where: { brand_id: parseInt(id) },
      });

      // Удаляем все годы этих моделей
      for (const model of models) {
        await prisma.years.deleteMany({
          where: { model_id: model.id },
        });
      }

      // Удаляем все модели марки
      await prisma.models.deleteMany({
        where: { brand_id: parseInt(id) },
      });

      // Удаляем саму марку
      await prisma.brands.delete({
        where: { id: parseInt(id) },
      });

      res.json({ message: "Марка и все связанные данные удалены" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Получить модели по марке
  getModelsByBrand: async (req, res) => {
    try {
      const { brandId } = req.query;
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
  getYearsByModel: async (req, res) => {
    try {
      const { modelId } = req.query;
      const years = await prisma.years.findMany({
        where: { model_id: parseInt(modelId) },
        orderBy: { year: "asc" },
      });
      res.json(years);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Добавить модель
  addModel: async (req, res) => {
    try {
      const { model, brandId } = req.body;

      const newModel = await prisma.models.create({
        data: {
          model,
          brand_id: parseInt(brandId),
        },
      });

      res.json(newModel);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  addBrands: async (req, res) => {
    try {
      const { brands } = req.body; // Ожидаем массив марок

      if (!Array.isArray(brands) || brands.length === 0) {
        return res.status(400).json({ error: "Необходим массив марок" });
      }

      const results = [];

      for (const brandName of brands) {
        // Проверяем, существует ли уже марка
        const existingBrand = await prisma.brands.findFirst({
          where: { brand: brandName },
        });

        if (existingBrand) {
          results.push({
            brand: brandName,
            status: "exists",
            message: "Марка уже существует",
          });
        } else {
          // Добавляем новую марку
          const newBrand = await prisma.brands.create({
            data: { brand: brandName },
          });
          results.push({
            brand: brandName,
            status: "created",
            id: newBrand.id,
          });
        }
      }

      res.json(results);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Удалить марку(и) автомобилей
  deleteBrands: async (req, res) => {
    try {
      const { brands } = req.body; // Ожидаем массив марок

      if (!Array.isArray(brands) || brands.length === 0) {
        return res.status(400).json({ error: "Необходим массив марок" });
      }

      const results = [];

      for (const brandName of brands) {
        // Находим марку
        const brand = await prisma.brands.findFirst({
          where: { brand: brandName },
        });

        if (!brand) {
          results.push({
            brand: brandName,
            status: "not_found",
            message: "Марка не найдена",
          });
          continue;
        }

        // Находим все модели этой марки
        const models = await prisma.models.findMany({
          where: { brand_id: brand.id },
        });

        // Находим все годы для этих моделей
        const modelIds = models.map((m) => m.id);
        const years = await prisma.years.findMany({
          where: { model_id: { in: modelIds } },
        });

        if (!brand) {
          results.push({
            brand: brandName,
            status: "not_found",
            message: "Марка не найдена",
          });
          continue;
        }

        // Удаляем все связанные годы
        for (const model of brand.models) {
          await prisma.years.deleteMany({
            where: { model_id: model.id },
          });
        }

        // Удаляем все связанные модели
        await prisma.models.deleteMany({
          where: { brand_id: brand.id },
        });

        // Удаляем саму марку
        await prisma.brands.delete({
          where: { id: brand.id },
        });

        results.push({ brand: brandName, status: "deleted" });
      }

      res.json(results);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Обновить марку автомобиля
  updateBrand: async (req, res) => {
    try {
      const { oldBrand, newBrand } = req.body;

      // Проверяем, существует ли новая марка
      const existingBrand = await prisma.brands.findFirst({
        where: { brand: newBrand },
      });

      if (existingBrand) {
        return res
          .status(400)
          .json({ error: "Марка с таким названием уже существует" });
      }

      // Находим и обновляем марку
      const brand = await prisma.brands.findFirst({
        where: { brand: oldBrand },
      });

      if (!brand) {
        return res.status(404).json({ error: "Марка не найдена" });
      }

      const updatedBrand = await prisma.brands.update({
        where: { id: brand.id },
        data: { brand: newBrand },
      });

      res.json(updatedBrand);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Найти марку автомобиля
  searchBrand: async (req, res) => {
    try {
      const { name } = req.query;

      if (!name) {
        return res
          .status(400)
          .json({ error: "Необходимо указать название марки" });
      }

      const brands = await prisma.brands.findMany({
        where: {
          brand: {
            contains: name,
            mode: "insensitive",
          },
        },
      });

      res.json(brands);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Добавить модель(и) автомобилей
  addModels: async (req, res) => {
    try {
      const { models, brandId } = req.body;

      if (!Array.isArray(models) || models.length === 0) {
        return res.status(400).json({ error: "Необходим массив моделей" });
      }

      if (!brandId) {
        return res.status(400).json({ error: "Необходим ID марки" });
      }

      const results = [];

      for (const modelName of models) {
        // Проверяем, существует ли уже модель для этой марки
        const existingModel = await prisma.models.findFirst({
          where: {
            model: modelName,
            brand_id: parseInt(brandId),
          },
        });

        if (existingModel) {
          results.push({
            model: modelName,
            status: "exists",
            message: "Модель уже существует",
          });
        } else {
          // Добавляем новую модель
          const newModel = await prisma.models.create({
            data: {
              model: modelName,
              brand_id: parseInt(brandId),
            },
          });
          results.push({
            model: modelName,
            status: "created",
            id: newModel.id,
          });
        }
      }

      res.json(results);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Удалить модель(и) автомобилей
  deleteModels: async (req, res) => {
    try {
      const { models, brandId } = req.body;

      if (!Array.isArray(models) || models.length === 0) {
        return res.status(400).json({ error: "Необходим массив моделей" });
      }

      if (!brandId) {
        return res.status(400).json({ error: "Необходим ID марки" });
      }

      const results = [];

      for (const modelName of models) {
        // Находим модель
        const model = await prisma.models.findFirst({
          where: {
            model: modelName,
            brand_id: parseInt(brandId),
          },
          include: {
            years: true,
          },
        });

        if (!model) {
          results.push({
            model: modelName,
            status: "not_found",
            message: "Модель не найдена",
          });
          continue;
        }

        // Удаляем все связанные годы
        await prisma.years.deleteMany({
          where: { model_id: model.id },
        });

        // Удаляем саму модель
        await prisma.models.delete({
          where: { id: model.id },
        });

        results.push({ model: modelName, status: "deleted" });
      }

      res.json(results);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Обновить модель автомобиля
  updateModel: async (req, res) => {
    try {
      const { oldModel, newModel, brandId } = req.body;

      if (!brandId) {
        return res.status(400).json({ error: "Необходим ID марки" });
      }

      // Проверяем, существует ли новая модель для этой марки
      const existingModel = await prisma.models.findFirst({
        where: {
          model: newModel,
          brand_id: parseInt(brandId),
        },
      });

      if (existingModel) {
        return res.status(400).json({
          error: "Модель с таким названием уже существует для этой марки",
        });
      }

      // Находим и обновляем модель
      const model = await prisma.models.findFirst({
        where: {
          model: oldModel,
          brand_id: parseInt(brandId),
        },
      });

      if (!model) {
        return res.status(404).json({ error: "Модель не найдена" });
      }

      const updatedModel = await prisma.models.update({
        where: { id: model.id },
        data: { model: newModel },
      });

      res.json(updatedModel);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Найти модель автомобиля
  searchModel: async (req, res) => {
    try {
      const { name, brandId } = req.query;

      if (!name) {
        return res
          .status(400)
          .json({ error: "Необходимо указать название модели" });
      }

      const whereCondition = {
        model: {
          contains: name,
          mode: "insensitive",
        },
      };

      if (brandId) {
        whereCondition.brand_id = parseInt(brandId);
      }

      const models = await prisma.models.findMany({
        where: whereCondition,
      });

      // Добавляем информацию о марке для каждой модели
      const modelsWithBrand = await Promise.all(
        models.map(async (model) => {
          if (model.brand_id) {
            const brand = await prisma.brands.findUnique({
              where: { id: model.brand_id },
            });
            return { ...model, brand: brand ? { brand: brand.brand } : null };
          }
          return model;
        })
      );

      res.json(models);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  // Добавить год(ы) выпуска
  addYears: async (req, res) => {
    try {
      const { years, modelId } = req.body;

      if (!Array.isArray(years) || years.length === 0) {
        return res.status(400).json({ error: "Необходим массив годов" });
      }

      if (!modelId) {
        return res.status(400).json({ error: "Необходим ID модели" });
      }

      // Получаем информацию о модели и марке для связи
      const model = await prisma.models.findUnique({
        where: { id: parseInt(modelId) },
      });

      if (!model || !model.brand_id) {
        return res.status(404).json({ error: "Модель не найдена или не привязана к марке" });
      }

      const brand = await prisma.brands.findUnique({
        where: { id: model.brand_id },
      });

      if (!model) {
        return res.status(404).json({ error: "Модель не найдена" });
      }

      const results = [];

      for (const yearValue of years) {
        // Проверяем, существует ли уже год для этой модели
        const existingYear = await prisma.years.findFirst({
          where: {
            year: yearValue,
            model_id: parseInt(modelId),
          },
        });

        if (existingYear) {
          results.push({
            year: yearValue,
            status: "exists",
            message: "Год уже существует",
          });
        } else {
          // Добавляем новый год
          const newYear = await prisma.years.create({
            data: {
              year: yearValue,
              model_id: parseInt(modelId),
              model: model.model,
              brand: brand.brand,
            },
          });
          results.push({ year: yearValue, status: "created", id: newYear.id });
        }
      }

      res.json(results);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Удалить год(ы) выпуска
  deleteYears: async (req, res) => {
    try {
      const { years, modelId } = req.body;

      if (!Array.isArray(years) || years.length === 0) {
        return res.status(400).json({ error: "Необходим массив годов" });
      }

      if (!modelId) {
        return res.status(400).json({ error: "Необходим ID модели" });
      }

      const results = [];

      for (const yearValue of years) {
        // Находим год
        const year = await prisma.years.findFirst({
          where: {
            year: yearValue,
            model_id: parseInt(modelId),
          },
        });

        // Проверяем наличие файлов для этого года
        const files = await prisma.files.findMany({
          where: { year_id: year?.id },
        });

        if (!year) {
          results.push({
            year: yearValue,
            status: "not_found",
            message: "Год не найден",
          });
          continue;
        }

        // Удаляем все связанные файлы
        await prisma.files.deleteMany({
          where: { year_id: year.id },
        });

        // Удаляем сам год
        await prisma.years.delete({
          where: { id: year.id },
        });

        results.push({ year: yearValue, status: "deleted" });
      }

      res.json(results);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Обновить год выпуска
  updateYear: async (req, res) => {
    try {
      const { oldYear, newYear, modelId } = req.body;

      if (!modelId) {
        return res.status(400).json({ error: "Необходим ID модели" });
      }

      // Проверяем, существует ли новый год для этой модели
      const existingYear = await prisma.years.findFirst({
        where: {
          year: newYear,
          model_id: parseInt(modelId),
        },
      });

      if (existingYear) {
        return res.status(400).json({
          error: "Год с таким значением уже существует для этой модели",
        });
      }

      // Находим и обновляем год
      const year = await prisma.years.findFirst({
        where: {
          year: oldYear,
          model_id: parseInt(modelId),
        },
      });

      if (!year) {
        return res.status(404).json({ error: "Год не найден" });
      }

      const updatedYear = await prisma.years.update({
        where: { id: year.id },
        data: { year: newYear },
      });

      res.json(updatedYear);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Найти год выпуска
  searchYear: async (req, res) => {
    try {
      const { year, modelId } = req.query;

      if (!year) {
        return res.status(400).json({ error: "Необходимо указать год" });
      }

      const whereCondition = {
        year: {
          contains: year,
          mode: "insensitive",
        },
      };

      if (modelId) {
        whereCondition.model_id = parseInt(modelId);
      }

      const years = await prisma.years.findMany({
        where: whereCondition,
      });

      // Добавляем информацию о модели и марке для каждого года
      const yearsWithDetails = await Promise.all(
        years.map(async (year) => {
          let modelInfo = null;
          let brandInfo = null;

          if (year.model_id) {
            const model = await prisma.models.findUnique({
              where: { id: year.model_id },
            });
            if (model) {
              modelInfo = model;
              if (model.brand_id) {
                brandInfo = await prisma.brands.findUnique({
                  where: { id: model.brand_id },
                });
              }
            }
          }

          return {
            ...year,
            model: modelInfo ? { ...modelInfo, brand: brandInfo } : null,
          };
        })
      );

      res.json(yearsWithDetails || years);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = carsController;
