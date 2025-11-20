const prisma = require("../utils/database");

const subscriptionController = {
  // ... существующие методы ...

  // Получить информацию о подписке пользователя
  getUserSubscription: async (req, res) => {
    try {
      const { userId } = req.params;

      // Используем findFirst, так как user_id не является уникальным ключом в схеме
      const premiumUser = await prisma.premium_users.findFirst({
        where: { user_id: BigInt(userId) },
      });

      if (!premiumUser) {
        return res.status(404).json({ error: "Подписка не найдена" });
      }

      // Проверяем, активна ли подписка
      const currentTime = new Date();
      const subEnd = new Date(premiumUser.sub_end);

      if (currentTime > subEnd) {
        // Подписка истекла, удаляем ее (используем id, так как user_id не уникальный)
        await prisma.premium_users.delete({
          where: { id: premiumUser.id },
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

      // Сначала проверяем, есть ли уже подписка у пользователя
      const existingSubscription = await prisma.premium_users.findFirst({
        where: { user_id: BigInt(userId) },
      });

      let subscription;
      if (existingSubscription) {
        // Обновляем существующую подписку
        subscription = await prisma.premium_users.update({
          where: { id: existingSubscription.id },
          data: {
            sub_start: subStartString,
            sub_end: subEndString,
            period_months: periodMonths,
            status: "active",
          },
        });
      } else {
        // Создаем новую подписку
        subscription = await prisma.premium_users.create({
          data: {
            user_id: BigInt(userId),
            sub_start: subStartString,
            sub_end: subEndString,
            period_months: periodMonths,
            status: "active",
          },
        });
      }

      res.json(subscription);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Удалить подписку
  deleteSubscription: async (req, res) => {
    try {
      const { userId } = req.params;

      // Находим подписку по user_id
      const premiumUser = await prisma.premium_users.findFirst({
        where: { user_id: BigInt(userId) },
      });

      if (!premiumUser) {
        return res.status(404).json({ error: "Подписка не найдена" });
      }

      // Удаляем по id
      await prisma.premium_users.delete({
        where: { id: premiumUser.id },
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
