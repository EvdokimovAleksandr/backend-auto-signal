# Backend Auto Signal

Backend API для проекта Auto Signal на Express.js и PostgreSQL.

## Быстрый старт

```bash
# Установка зависимостей
npm install

# Настройка .env
cp .env.example .env
# Укажите в .env:
# - DATABASE_URL - строка подключения к PostgreSQL
# - TELEGRAM_BOT_TOKEN - токен Telegram бота (опционально, для авторизации по username)
# - JWT_SECRET - секретный ключ для JWT токенов

# Восстановление БД (если есть дамп)
npm run restore-db-node
npm run sync-prisma

# Запуск сервера
npm run dev
```

### Настройка Telegram Bot Token (опционально)

Для автоматического получения User ID по username необходимо:

1. Создайте бота через [@BotFather](https://t.me/BotFather) в Telegram
2. Получите токен бота
3. Добавьте в `.env`:
   ```
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   ```

**Важно:** Без токена авторизация по username будет работать только для пользователей, уже зарегистрированных в системе.

## API Endpoints

### Авторизация
- `POST /api/users/login` - Вход/регистрация пользователя
- `POST /api/users/register` - Регистрация пользователя
- `GET /api/users/me` - Получить текущего пользователя (требует токен)

### Автомобили
- `GET /api/cars/brands` - Получить все марки
- `GET /api/cars/models?brandId=X` - Получить модели по марке
- `GET /api/cars/years?modelId=X` - Получить годы по модели

### Файлы
- `GET /api/files/years/:yearId/files?userId=X` - Получить файлы по году

### Подписки
- `GET /api/subscription/prices` - Получить цены подписок

### Админ
- `GET /api/admin/stats` - Статистика (требует админ токен)

## Тестирование

```bash
# Запуск тестов авторизации
npm test

# Проверка БД
npm run check-db

# Проверка API (требует запущенный сервер)
npm run test-backend
```

## Структура проекта

```
src/
  controllers/    # Контроллеры API
  routes/         # Маршруты
  middleware/     # Middleware (auth, admin)
  utils/          # Утилиты
  tests/          # Тесты
```

## Технологии

- Express.js
- PostgreSQL
- Prisma ORM
- JWT для аутентификации
- TypeScript
