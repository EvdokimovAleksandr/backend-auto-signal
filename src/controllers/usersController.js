const prisma = require("../utils/database");
const jwt = require("jsonwebtoken");
const { checkAdminStatus } = require("../middleware/adminCheck");

const usersController = {
  // Логин пользователя (генерация JWT токена)
  login: async (req, res) => {
    try {
      const { userId, username, name } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "Необходим userId" });
      }

      // Используем upsert для создания или обновления пользователя
      // Это избегает race conditions и проблем с уникальными ограничениями
      const user = await prisma.users.upsert({
        where: { user_id: BigInt(userId) },
        update: {
          username: username !== undefined ? username : undefined,
          name: name !== undefined ? name : undefined,
        },
        create: {
          user_id: BigInt(userId),
          username: username || null,
          name: name || null,
        },
      });

      // Генерируем JWT токен (используем внутренний ID для админ проверки)
      const token = jwt.sign(
        { userId: userId.toString(), id: user.id },
        process.env.JWT_SECRET || "default-secret-key",
        { expiresIn: "30d" }
      );

      // Проверяем админ статус (используем user_id - Telegram ID)
      const isAdmin = await checkAdminStatus(user.user_id.toString());

      // Проверяем премиум статус (используем user_id из таблицы users)
      // Используем findFirst, так как user_id не является уникальным ключом в схеме
      const premiumUser = await prisma.premium_users.findFirst({
        where: { user_id: user.user_id },
      });

      let isPremium = false;
      if (premiumUser) {
        const currentTime = new Date();
        const subEnd = new Date(premiumUser.sub_end);
        isPremium = currentTime <= subEnd;
      }

      res.json({
        token,
        user: {
          ...user,
          user_id: user.user_id.toString(),
        },
        isAdmin,
        isPremium,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Регистрация пользователя
  registerUser: async (req, res) => {
    try {
      const { userId, username, name } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "Необходим userId" });
      }

      // Используем upsert для создания или обновления пользователя
      const user = await prisma.users.upsert({
        where: { user_id: BigInt(userId) },
        update: {
          username: username !== undefined ? username : undefined,
          name: name !== undefined ? name : undefined,
        },
        create: {
          user_id: BigInt(userId),
          username: username || null,
          name: name || null,
        },
      });

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

  // Проверка текущего пользователя (по токену)
  getCurrentUser: async (req, res) => {
    try {
      const user = req.user; // Из middleware authenticateToken

      // Проверяем админ статус
      const isAdmin = await checkAdminStatus(user.user_id.toString());

      // Проверяем премиум статус (используем findFirst, так как user_id не уникальный)
      const premiumUser = await prisma.premium_users.findFirst({
        where: { user_id: user.user_id },
      });

      let isPremium = false;
      if (premiumUser) {
        const currentTime = new Date();
        const subEnd = new Date(premiumUser.sub_end);
        isPremium = currentTime <= subEnd;
      }

      res.json({
        user: {
          ...user,
          user_id: user.user_id.toString(),
        },
        isAdmin,
        isPremium,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = usersController;
