const prisma = require("../utils/database");

const usersController = {
  // Регистрация пользователя
  registerUser: async (req, res) => {
    try {
      const { userId, username, name } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "Необходим userId" });
      }

      // Проверяем существование пользователя
      let user = await prisma.users.findUnique({
        where: { user_id: BigInt(userId) },
      });

      // Если пользователя нет - создаем
      if (!user) {
        user = await prisma.users.create({
          data: {
            user_id: BigInt(userId),
            username: username || null,
            name: name || null,
          },
        });
      } else {
        // Обновляем информацию о пользователе, если она изменилась
        user = await prisma.users.update({
          where: { user_id: BigInt(userId) },
          data: {
            username: username || user.username,
            name: name || user.name,
          },
        });
      }

      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Получить информацию о пользователе
  getUser: async (req, res) => {
    try {
      const { userId } = req.params;

      const user = await prisma.users.findUnique({
        where: { user_id: BigInt(userId) },
      });

      if (!user) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }

      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Обновить информацию о пользователе
  updateUser: async (req, res) => {
    try {
      const { userId } = req.params;
      const { username, name, stage, page } = req.body;

      const user = await prisma.users.update({
        where: { user_id: BigInt(userId) },
        data: {
          ...(username !== undefined && { username }),
          ...(name !== undefined && { name }),
          ...(stage !== undefined && { stage }),
          ...(page !== undefined && { page }),
        },
      });

      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Получить всех пользователей (с пагинацией)
  getUsers: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [users, total] = await Promise.all([
        prisma.users.findMany({
          skip: skip,
          take: parseInt(limit),
          orderBy: { created_at: "desc" },
        }),
        prisma.users.count(),
      ]);

      res.json({
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
          hasPrev: parseInt(page) > 1,
        },
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = usersController;
