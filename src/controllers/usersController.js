const prisma = require("../utils/database");
const jwt = require("jsonwebtoken");
const { checkAdminStatus } = require("../middleware/adminCheck");
const { resolveTelegramUser } = require("../utils/telegramBot");
const { validateTelegramInput, validateTelegramUserId, validateUserName } = require("../utils/validation");

const usersController = {
  // Логин пользователя (генерация JWT токена)
  login: async (req, res) => {
    try {
      // Поддерживаем два формата:
      // 1. { userId: "123456789" } - прямой User ID
      // 2. { telegramInput: "@username" или "123456789" } - username или User ID
      const { userId, username, first_name, last_name, telegramInput } = req.body;

      // Валидация входных данных
      if (telegramInput) {
        const inputValidation = validateTelegramInput(telegramInput);
        if (!inputValidation.valid) {
          return res.status(400).json({ error: inputValidation.error });
        }
      } else if (userId) {
        const userIdValidation = validateTelegramUserId(userId);
        if (!userIdValidation.valid) {
          return res.status(400).json({ error: userIdValidation.error });
        }
      } else {
        return res.status(400).json({ 
          error: "Необходим userId или telegramInput (username или числовой User ID)" 
        });
      }

      // Валидация опциональных полей (убрана, так как name больше не используется)

      let resolvedUserId = userId;
      let resolvedUsername = username;
      let resolvedFirstName = first_name;
      let resolvedLastName = last_name;

      // Если передан telegramInput (username или @username), пытаемся получить User ID
      if (telegramInput && !userId) {
        try {
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          const resolved = await resolveTelegramUser(telegramInput, botToken);
          resolvedUserId = resolved.userId;
          resolvedUsername = resolved.username || resolvedUsername;
          resolvedFirstName = resolved.first_name;
          resolvedLastName = resolved.last_name;
        } catch (error) {
          // Если не удалось получить через Bot API, пробуем найти в БД
          if (telegramInput.startsWith('@') || /^[a-zA-Z0-9_]+$/.test(telegramInput)) {
            const cleanUsername = telegramInput.replace(/^@/, '');
            const dbUser = await prisma.users.findFirst({
              where: {
                username: cleanUsername,
              },
            });

            if (dbUser) {
              resolvedUserId = dbUser.user_id.toString();
              resolvedUsername = dbUser.username;
              resolvedFirstName = dbUser.first_name;
              resolvedLastName = dbUser.last_name;
            } else {
              // Если не нашли в БД и нет Bot Token - возвращаем понятную ошибку
              if (!process.env.TELEGRAM_BOT_TOKEN) {
                return res.status(400).json({ 
                  error: `Не удалось найти пользователя "${telegramInput}" в базе данных.`,
                  hint: "Для автоматического получения User ID по username настройте TELEGRAM_BOT_TOKEN в .env файле, или используйте числовой User ID"
                });
              }
              return res.status(400).json({ 
                error: `Не удалось найти пользователя "${telegramInput}". Убедитесь, что указан правильный username или используйте числовой User ID.`
              });
            }
          } else {
            return res.status(400).json({ 
              error: error.message || "Неверный формат. Укажите @username или числовой User ID"
            });
          }
        }
      }

      if (!resolvedUserId) {
        return res.status(400).json({ 
          error: "Не удалось определить User ID. Убедитесь, что указан правильный userId или telegramInput" 
        });
      }

      // Используем upsert для создания или обновления пользователя
      // Это избегает race conditions и проблем с уникальными ограничениями
      const user = await prisma.users.upsert({
        where: { user_id: BigInt(resolvedUserId) },
        update: {
          username: resolvedUsername !== undefined ? resolvedUsername : undefined,
          first_name: resolvedFirstName !== undefined ? resolvedFirstName : undefined,
          last_name: resolvedLastName !== undefined ? resolvedLastName : undefined,
        },
        create: {
          user_id: BigInt(resolvedUserId),
          username: resolvedUsername || null,
          first_name: resolvedFirstName || null,
          last_name: resolvedLastName || null,
        },
      });

      // Генерируем JWT токен (используем user_id как идентификатор)
      const token = jwt.sign(
        { userId: resolvedUserId.toString() },
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
      const { userId, username, first_name, last_name } = req.body;

      // Валидация входных данных
      if (!userId) {
        return res.status(400).json({ error: "Необходим userId" });
      }

      const userIdValidation = validateTelegramUserId(userId);
      if (!userIdValidation.valid) {
        return res.status(400).json({ error: userIdValidation.error });
      }

      // Используем upsert для создания или обновления пользователя
      const user = await prisma.users.upsert({
        where: { user_id: BigInt(userId) },
        update: {
          username: username !== undefined ? username : undefined,
          first_name: first_name !== undefined ? first_name : undefined,
          last_name: last_name !== undefined ? last_name : undefined,
        },
        create: {
          user_id: BigInt(userId),
          username: username || null,
          first_name: first_name || null,
          last_name: last_name || null,
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
      const { username, first_name, last_name } = req.body;

      const user = await prisma.users.update({
        where: { user_id: BigInt(userId) },
        data: {
          ...(username !== undefined && { username }),
          ...(first_name !== undefined && { first_name }),
          ...(last_name !== undefined && { last_name }),
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
