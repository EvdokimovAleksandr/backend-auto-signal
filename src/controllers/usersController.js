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
      const { userId, username, first_name, last_name, name, telegramInput } = req.body;

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

      let resolvedUserId = userId;
      let resolvedUsername = username;
      // Объединяем first_name и last_name в name (для совместимости с Telegram API)
      let resolvedName = name || (first_name || last_name ? `${first_name || ''} ${last_name || ''}`.trim() : null);

      // Если передан telegramInput (username или @username), пытаемся получить User ID
      if (telegramInput && !userId) {
        try {
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          const resolved = await resolveTelegramUser(telegramInput, botToken);
          resolvedUserId = resolved.userId;
          resolvedUsername = resolved.username || resolvedUsername;
          // Объединяем first_name и last_name из Telegram API
          if (resolved.first_name || resolved.last_name) {
            resolvedName = `${resolved.first_name || ''} ${resolved.last_name || ''}`.trim();
          }
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
              resolvedName = dbUser.name;
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
          name: resolvedName !== undefined ? resolvedName : undefined,
        },
        create: {
          user_id: BigInt(resolvedUserId),
          username: resolvedUsername || null,
          name: resolvedName || null,
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

      // Разбиваем name на first_name и last_name для совместимости с API
      const nameParts = (user.name || '').split(' ');
      res.json({
        token,
        user: {
          ...user,
          user_id: user.user_id.toString(),
          first_name: nameParts[0] || null,
          last_name: nameParts.slice(1).join(' ') || null,
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
      const { userId, username, first_name, last_name, name } = req.body;

      // Валидация входных данных
      if (!userId) {
        return res.status(400).json({ error: "Необходим userId" });
      }

      const userIdValidation = validateTelegramUserId(userId);
      if (!userIdValidation.valid) {
        return res.status(400).json({ error: userIdValidation.error });
      }

      // Объединяем first_name и last_name в name (для совместимости)
      const resolvedName = name || (first_name || last_name ? `${first_name || ''} ${last_name || ''}`.trim() : null);

      // Используем upsert для создания или обновления пользователя
      const user = await prisma.users.upsert({
        where: { user_id: BigInt(userId) },
        update: {
          username: username !== undefined ? username : undefined,
          name: resolvedName !== undefined ? resolvedName : undefined,
        },
        create: {
          user_id: BigInt(userId),
          username: username || null,
          name: resolvedName || null,
        },
      });

      // Добавляем first_name и last_name для совместимости с API
      const nameParts = (user.name || '').split(' ');
      res.json({
        ...user,
        user_id: user.user_id.toString(),
        first_name: nameParts[0] || null,
        last_name: nameParts.slice(1).join(' ') || null,
      });
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

      // Разбиваем name на first_name и last_name для совместимости с API
      const nameParts = (user.name || '').split(' ');
      res.json({
        ...user,
        user_id: user.user_id.toString(),
        first_name: nameParts[0] || null,
        last_name: nameParts.slice(1).join(' ') || null,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Обновить информацию о пользователе
  updateUser: async (req, res) => {
    try {
      const { userId } = req.params;
      const { username, first_name, last_name, name } = req.body;

      // Объединяем first_name и last_name в name (для совместимости)
      const resolvedName = name !== undefined ? name : 
        (first_name !== undefined || last_name !== undefined ? 
          `${first_name || ''} ${last_name || ''}`.trim() : undefined);

      const user = await prisma.users.update({
        where: { user_id: BigInt(userId) },
        data: {
          ...(username !== undefined && { username }),
          ...(resolvedName !== undefined && { name: resolvedName }),
        },
      });

      // Добавляем first_name и last_name для совместимости с API
      const nameParts = (user.name || '').split(' ');
      res.json({
        ...user,
        user_id: user.user_id.toString(),
        first_name: nameParts[0] || null,
        last_name: nameParts.slice(1).join(' ') || null,
      });
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

      // Преобразуем users для совместимости с API (добавляем first_name/last_name)
      const usersWithNames = users.map(user => {
        const nameParts = (user.name || '').split(' ');
        return {
          ...user,
          user_id: user.user_id?.toString(),
          first_name: nameParts[0] || null,
          last_name: nameParts.slice(1).join(' ') || null,
        };
      });

      res.json({
        users: usersWithNames,
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

      // Разбиваем name на first_name и last_name для совместимости с API
      const nameParts = (user.name || '').split(' ');
      res.json({
        user: {
          ...user,
          user_id: user.user_id.toString(),
          first_name: nameParts[0] || null,
          last_name: nameParts.slice(1).join(' ') || null,
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
