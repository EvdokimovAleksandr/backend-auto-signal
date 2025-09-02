const prisma = require("../config/database");

const adminController = {
  // Получить статистику
  getStats: async (req, res) => {
    try {
      const users = await prisma.users.findMany();
      const premiumUsers = await prisma.premium_users.findMany();
      const brands = await prisma.brands.findMany();
      const models = await prisma.models.findMany();
      const years = await prisma.years.findMany();

      // Подсчет активных премиум-подписок
      const currentTime = new Date();
      const activePremium = premiumUsers.filter((user) => {
        return new Date(user.sub_end) >= currentTime;
      }).length;

      const stats = {
        total_users: users.length,
        premium_users: activePremium,
        regular_users: users.length - activePremium,
        brands_count: brands.length,
        models_count: models.length,
        years_count: years.length,
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Обновить цену подписки
  updateSubscriptionPrice: async (req, res) => {
    try {
      const { periodMonths, priceKopecks } = req.body;

      const updatedPrice = await prisma.subscription_prices.upsert({
        where: { period_months: periodMonths },
        update: { price_kopecks: priceKopecks },
        create: {
          period_months: periodMonths,
          price_kopecks: priceKopecks,
        },
      });

      res.json(updatedPrice);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Назначить администратора
  addAdmin: async (req, res) => {
    try {
      const { userId } = req.params;

      const admin = await prisma.admin_users.create({
        data: {
          user_id: BigInt(userId),
        },
      });

      res.json(admin);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Удалить администратора
  removeAdmin: async (req, res) => {
    try {
      const { userId } = req.params;

      await prisma.admin_users.delete({
        where: { user_id: BigInt(userId) },
      });

      res.json({ message: "Администратор удален" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  getTopModels: async (req, res) => {
    try {
      // Проверяем права администратора
      const isAdmin = await checkAdminStatus(req.user.id);
      if (!isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Получаем топ-20 моделей по количеству обращений
      const topModels = await prisma.file_access_stats.groupBy({
        by: ["brand", "model"],
        _count: {
          model: true,
        },
        orderBy: {
          _count: {
            model: "desc",
          },
        },
        take: 20,
      });

      // Форматируем результат
      const formattedResults = topModels.map((item, index) => ({
        rank: index + 1,
        brand: item.brand,
        model: item.model,
        accessCount: item._count.model,
      }));

      res.json(formattedResults);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Получить детальную статистику
  getDetailedStats: async (req, res) => {
    try {
      // Проверяем права администратора
      const isAdmin = await checkAdminStatus(req.user.id);
      if (!isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }

      const users = await prisma.users.findMany();
      const premiumUsers = await prisma.premium_users.findMany();
      const brands = await prisma.brands.findMany();
      const models = await prisma.models.findMany();
      const years = await prisma.years.findMany();

      // Подсчет активных премиум-подписок
      const currentTime = new Date();
      const activePremium = premiumUsers.filter((user) => {
        return new Date(user.sub_end) >= currentTime;
      }).length;

      const stats = {
        total_users: users.length,
        premium_users: activePremium,
        regular_users: users.length - activePremium,
        brands_count: brands.length,
        models_count: models.length,
        years_count: years.length,
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  managePrices: async (req, res) => {
    try {
      const prices = await prisma.subscription_prices.findMany({
        orderBy: { period_months: "asc" },
      });

      // Форматируем цены для отображения
      const formattedPrices = prices.map((price) => ({
        period_months: price.period_months,
        price_rub: price.price_kopecks / 100,
        period_text: getPeriodText(price.period_months),
      }));

      res.json(formattedPrices);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Обновить цену подписки
  updatePrice: async (req, res) => {
    try {
      const { periodMonths } = req.params;
      const { price_rub } = req.body;

      const price_kopecks = Math.round(price_rub * 100);

      const updatedPrice = await prisma.subscription_prices.upsert({
        where: { period_months: parseInt(periodMonths) },
        update: { price_kopecks },
        create: {
          period_months: parseInt(periodMonths),
          price_kopecks,
        },
      });

      res.json({
        period_months: updatedPrice.period_months,
        price_rub: updatedPrice.price_kopecks / 100,
        period_text: getPeriodText(updatedPrice.period_months),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Управление администраторами
  manageAdmins: async (req, res) => {
    try {
      const admins = await prisma.admin_users.findMany({
        include: {
          user: {
            select: {
              username: true,
              full_name: true,
            },
          },
        },
      });

      res.json(admins);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Добавить администратора
  addAdmin: async (req, res) => {
    try {
      const { user_id, username } = req.body;
      const added_by = req.user.id; // ID текущего пользователя

      // Сначала проверяем, существует ли пользователь
      let user = await prisma.users.findUnique({
        where: { user_id: BigInt(user_id) },
      });

      // Если пользователя нет, создаем его
      if (!user) {
        user = await prisma.users.create({
          data: {
            user_id: BigInt(user_id),
            username: username,
            full_name: username, // Можно изменить, если есть больше информации
          },
        });
      }

      // Добавляем администратора
      const admin = await prisma.admin_users.create({
        data: {
          user_id: BigInt(user_id),
          username: username,
          added_by: BigInt(added_by),
        },
      });

      res.json(admin);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Удалить администратора
  removeAdmin: async (req, res) => {
    try {
      const { userId } = req.params;

      await prisma.admin_users.delete({
        where: { user_id: BigInt(userId) },
      });

      res.json({ message: "Администратор удален" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Получить список администраторов
  listAdmins: async (req, res) => {
    try {
      const admins = await prisma.admin_users.findMany({
        include: {
          user: {
            select: {
              username: true,
              full_name: true,
            },
          },
          added_by_user: {
            select: {
              username: true,
              full_name: true,
            },
          },
        },
        orderBy: { added_at: "desc" },
      });

      res.json(admins);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Управление настройками бота
  manageSettings: async (req, res) => {
    try {
      const settings = await prisma.bot_settings.findMany();

      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Изменить стартовое сообщение
  updateStartMessage: async (req, res) => {
    try {
      const { message } = req.body;

      const setting = await prisma.bot_settings.upsert({
        where: { setting_key: "start_message" },
        update: { setting_value: message },
        create: {
          setting_key: "start_message",
          setting_value: message,
        },
      });

      res.json(setting);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Управление описаниями файлов
  manageDescriptions: async (req, res) => {
    try {
      // Здесь будет логика для управления описаниями файлов
      // Пока просто возвращаем заглушку
      res.json({ message: "Функционал управления описаниями файлов" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Добавить описание к файлу
  addFileDescription: async (req, res) => {
    try {
      const { fileId } = req.params;
      const { description } = req.body;

      // Обновляем описание файла
      // Предполагаем, что у нас есть таблица files с полем description
      const updatedFile = await prisma.files.update({
        where: { id: parseInt(fileId) },
        data: { description: description },
      });

      res.json(updatedFile);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

function getPeriodText(periodMonths) {
  if (periodMonths === 1) return "месяц";
  if (periodMonths < 5) return `${periodMonths} месяца`;
  return `${periodMonths} месяцев`;
}

module.exports = adminController;
