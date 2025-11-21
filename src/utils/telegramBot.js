// Утилита для работы с Telegram Bot API
const https = require('https');

/**
 * Получить информацию о пользователе по username через Telegram Bot API
 * @param {string} username - Username пользователя (с @ или без)
 * @param {string} botToken - Токен Telegram бота
 * @returns {Promise<{id: number, username: string, first_name?: string}>}
 */
async function getTelegramUserByUsername(username, botToken) {
  if (!botToken) {
    throw new Error('Telegram Bot Token не настроен');
  }

  // Убираем @ если есть
  const cleanUsername = username.replace(/^@/, '');

  return new Promise((resolve, reject) => {
    const url = `https://api.telegram.org/bot${botToken}/getChat?chat_id=@${cleanUsername}`;

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          if (!response.ok) {
            // Более понятные сообщения об ошибках
            let errorMessage = response.description || 'Не удалось получить информацию о пользователе';
            
            if (response.error_code === 400) {
              errorMessage = 'Неверный формат username. Убедитесь, что указан правильный Telegram username.';
            } else if (response.error_code === 404) {
              errorMessage = 'Пользователь с таким username не найден в Telegram.';
            } else if (response.error_code === 403) {
              errorMessage = 'Нет доступа к информации о пользователе. Возможно, пользователь скрыл свой профиль.';
            }
            
            reject(new Error(errorMessage));
            return;
          }

          const chat = response.result;

          // Проверяем, что это пользователь, а не группа/канал
          if (chat.type !== 'private') {
            reject(new Error('Указанный username принадлежит группе или каналу, а не пользователю'));
            return;
          }

          resolve({
            id: chat.id,
            username: chat.username || cleanUsername,
            first_name: chat.first_name,
            last_name: chat.last_name,
          });
        } catch (error) {
          reject(new Error(`Ошибка при парсинге ответа: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`Ошибка при запросе к Telegram API: ${error.message}`));
    });
  });
}

/**
 * Получить User ID по username или вернуть userId если это уже числовой ID
 * @param {string} input - Username (@username) или числовой ID
 * @param {string} botToken - Токен Telegram бота
 * @returns {Promise<{userId: string, username?: string, name?: string}>}
 */
async function resolveTelegramUser(input, botToken) {
  const trimmedInput = input.trim();

  // Если это числовой ID - возвращаем как есть
  if (/^\d+$/.test(trimmedInput)) {
    return {
      userId: trimmedInput,
    };
  }

  // Если это username - получаем User ID через Bot API или ищем в БД
  if (trimmedInput.startsWith('@') || /^[a-zA-Z0-9_]+$/.test(trimmedInput)) {
    const prisma = require('./database');
    const cleanUsername = trimmedInput.replace(/^@/, '');
    
    // Сначала пробуем через Bot API (если токен настроен)
    if (botToken) {
      try {
        const userInfo = await getTelegramUserByUsername(trimmedInput, botToken);
        return {
          userId: String(userInfo.id),
          username: userInfo.username,
          name: userInfo.first_name || userInfo.last_name 
            ? `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim()
            : undefined,
        };
      } catch (error) {
        // Если не удалось через Bot API, пробуем найти в БД
        const dbUser = await prisma.users.findFirst({
          where: {
            username: cleanUsername,
          },
        });

        if (dbUser) {
          return {
            userId: dbUser.user_id.toString(),
            username: dbUser.username,
            name: dbUser.name,
          };
        }

        throw new Error(`Не удалось найти пользователя через Telegram API: ${error.message}`);
      }
    } else {
      // Если Bot Token не настроен, ищем только в БД
      const dbUser = await prisma.users.findFirst({
        where: {
          username: cleanUsername,
        },
      });

      if (dbUser) {
        return {
          userId: dbUser.user_id.toString(),
          username: dbUser.username,
          name: dbUser.name,
        };
      }

      throw new Error('Telegram Bot Token не настроен. Настройте TELEGRAM_BOT_TOKEN в .env для автоматического получения User ID по username, или используйте числовой User ID');
    }
  }

  throw new Error('Неверный формат. Укажите @username или числовой User ID');
}

module.exports = {
  getTelegramUserByUsername,
  resolveTelegramUser,
};

