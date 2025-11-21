const prisma = require("../utils/database");
const { checkAdminStatus } = require("../middleware/adminCheck");

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
      const userId = req.user.user_id ? req.user.user_id.toString() : req.user.id?.toString();
      const isAdmin = await checkAdminStatus(userId);
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
      const userId = req.user.user_id ? req.user.user_id.toString() : req.user.id?.toString();
      const isAdmin = await checkAdminStatus(userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }

      const users = await prisma.users.findMany();
      const premiumUsers = await prisma.premium_users.findMany();
      const brands = await prisma.brands.findMany();
      const models = await prisma.models.findMany();
      const years = await prisma.years.findMany();
      const files = await prisma.files.findMany();
      const fileAccessStats = await prisma.file_access_stats.findMany();
      const admins = await prisma.admin_users.findMany();

      // Подсчет активных премиум-подписок
      const currentTime = new Date();
      const activePremium = premiumUsers.filter((user) => {
        return new Date(user.sub_end) >= currentTime;
      }).length;

      // Подсчет файлов по типам
      const photosCount = files.filter(f => f.photo).length;
      const premiumPhotosCount = files.filter(f => f.premium_photo).length;
      const pdfsCount = files.filter(f => f.pdf).length;
      const premiumPdfsCount = files.filter(f => f.premium_pdf).length;
      const filesWithDescriptions = files.filter(f => f.caption).length;

      // Статистика доступа к файлам
      const totalAccessCount = fileAccessStats.length;
      const uniqueUsersAccessed = new Set(fileAccessStats.map(s => s.user_id.toString())).size;

      // Новые пользователи за последние 30 дней
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const newUsersLastMonth = users.filter(user => {
        if (!user.created_at) return false;
        return new Date(user.created_at) >= thirtyDaysAgo;
      }).length;

      // Новые подписки за последние 30 дней
      const newSubscriptionsLastMonth = premiumUsers.filter(sub => {
        if (!sub.sub_start) return false;
        return new Date(sub.sub_start) >= thirtyDaysAgo;
      }).length;

      // Статистика по подпискам
      const subscriptionsByPeriod = {};
      premiumUsers.forEach(sub => {
        const period = sub.period_months || 1;
        subscriptionsByPeriod[period] = (subscriptionsByPeriod[period] || 0) + 1;
      });

      // Средняя продолжительность подписки
      const activeSubscriptions = premiumUsers.filter(sub => new Date(sub.sub_end) >= currentTime);
      const avgSubscriptionMonths = activeSubscriptions.length > 0
        ? activeSubscriptions.reduce((sum, sub) => sum + (sub.period_months || 1), 0) / activeSubscriptions.length
        : 0;

      const stats = {
        // Основная статистика
        total_users: users.length,
        premium_users: activePremium,
        regular_users: users.length - activePremium,
        brands_count: brands.length,
        models_count: models.length,
        years_count: years.length,
        admins_count: admins.length,
        
        // Статистика файлов
        total_files: files.length,
        photos_count: photosCount,
        premium_photos_count: premiumPhotosCount,
        pdfs_count: pdfsCount,
        premium_pdfs_count: premiumPdfsCount,
        files_with_descriptions: filesWithDescriptions,
        
        // Статистика доступа
        total_file_accesses: totalAccessCount,
        unique_users_accessed: uniqueUsersAccessed,
        average_accesses_per_user: uniqueUsersAccessed > 0 ? (totalAccessCount / uniqueUsersAccessed).toFixed(2) : 0,
        
        // Временная статистика
        new_users_last_month: newUsersLastMonth,
        new_subscriptions_last_month: newSubscriptionsLastMonth,
        
        // Статистика подписок
        subscriptions_by_period: subscriptionsByPeriod,
        average_subscription_months: avgSubscriptionMonths.toFixed(2),
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
        orderBy: { added_at: "desc" },
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
      // Используем user_id (Telegram ID) текущего пользователя для added_by
      const added_by = req.user.user_id ? req.user.user_id.toString() : req.user.id?.toString();

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

      // Проверяем, не является ли пользователь уже администратором
      const existingAdmin = await prisma.admin_users.findUnique({
        where: { user_id: BigInt(user_id) },
      });

      if (existingAdmin) {
        return res.status(400).json({ error: "Пользователь уже является администратором" });
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

      // Обновляем описание файла (используем поле caption)
      const updatedFile = await prisma.files.update({
        where: { id: parseInt(fileId) },
        data: { caption: description },
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
