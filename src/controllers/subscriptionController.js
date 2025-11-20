const prisma = require("../utils/database");

const subscriptionController = {
  // ... существующие методы ...

  // Получить информацию о подписке пользователя
  getUserSubscription: async (req, res) => {
    try {
      const { userId } = req.params;

      const premiumUser = await prisma.premium_users.findUnique({
        where: { user_id: BigInt(userId) },
      });

      if (!premiumUser) {
        return res.status(404).json({ error: "Подписка не найдена" });
      }

      // Проверяем, активна ли подписка
      const currentTime = new Date();
      const subEnd = new Date(premiumUser.sub_end);

      if (currentTime > subEnd) {
        // Подписка истекла, удаляем ее
        await prisma.premium_users.delete({
          where: { user_id: BigInt(userId) },
        });
        return res.status(404).json({ error: "Подписка истекла" });
      }

      res.json(premiumUser);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Создать или обновить подписку
  createOrUpdateSubscription: async (req, res) => {
    try {
      const { userId, periodMonths } = req.body;

      // Рассчитываем даты начала и окончания подписки
      const subStart = new Date();
      const subEnd = new Date();
      subEnd.setMonth(subEnd.getMonth() + periodMonths);

      // Конвертируем даты в строки ISO для хранения в БД
      const subStartString = subStart.toISOString();
      const subEndString = subEnd.toISOString();

      const subscription = await prisma.premium_users.upsert({
        where: { user_id: BigInt(userId) },
        update: {
          sub_start: subStartString,
          sub_end: subEndString,
          period_months: periodMonths,
          status: "active",
        },
        create: {
          user_id: BigInt(userId),
          sub_start: subStartString,
          sub_end: subEndString,
          period_months: periodMonths,
          status: "active",
        },
      });

      res.json(subscription);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Удалить подписку
  deleteSubscription: async (req, res) => {
    try {
      const { userId } = req.params;

      await prisma.premium_users.delete({
        where: { user_id: BigInt(userId) },
      });

      res.json({ message: "Подписка удалена" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Получить цены подписок
  getSubscriptionPrices: async (req, res) => {
    try {
      const prices = await prisma.subscription_prices.findMany({
        orderBy: { period_months: "asc" },
      });

      res.json(prices);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = subscriptionController;
