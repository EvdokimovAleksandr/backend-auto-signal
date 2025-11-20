/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         user_id:
 *           type: string
 *           description: Telegram user ID (BigInt, возвращается как строка)
 *         username:
 *           type: string
 *           nullable: true
 *         name:
 *           type: string
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         stage:
 *           type: integer
 *           default: 0
 *         page:
 *           type: integer
 *           default: 0
 * 
 *     Brand:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         brand:
 *           type: string
 * 
 *     Model:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         model:
 *           type: string
 *         brand_id:
 *           type: integer
 *           nullable: true
 * 
 *     Year:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         year:
 *           type: string
 *         model_id:
 *           type: integer
 *           nullable: true
 * 
 *     File:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         photo:
 *           type: string
 *           nullable: true
 *         pdf:
 *           type: string
 *           nullable: true
 *         premium_photo:
 *           type: string
 *           nullable: true
 *         premium_pdf:
 *           type: string
 *           nullable: true
 *         year_id:
 *           type: integer
 *           nullable: true
 *         caption:
 *           type: string
 *           nullable: true
 * 
 *     Subscription:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         user_id:
 *           type: string
 *         sub_start:
 *           type: string
 *         sub_end:
 *           type: string
 *         status:
 *           type: string
 *         period_months:
 *           type: integer
 *           nullable: true
 * 
 *     SubscriptionPrice:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         period_months:
 *           type: integer
 *         price_kopecks:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 * 
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 */

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Регистрация нового пользователя
 *     tags: [Пользователи]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Telegram user ID
 *               username:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Пользователь успешно зарегистрирован
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Ошибка валидации
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Внутренняя ошибка сервера
 */

/**
 * @swagger
 * /api/users/{userId}:
 *   get:
 *     summary: Получить информацию о пользователе
 *     tags: [Пользователи]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Telegram user ID
 *     responses:
 *       200:
 *         description: Информация о пользователе
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: Пользователь не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 * 
 *   put:
 *     summary: Обновить информацию о пользователе
 *     tags: [Пользователи]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               name:
 *                 type: string
 *               stage:
 *                 type: integer
 *               page:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Пользователь обновлен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: Пользователь не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Получить список пользователей с пагинацией
 *     tags: [Пользователи]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Номер страницы
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Количество записей на странице
 *     responses:
 *       200:
 *         description: Список пользователей
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 */

/**
 * @swagger
 * /api/cars/brands:
 *   get:
 *     summary: Получить все марки автомобилей
 *     tags: [Автомобили]
 *     responses:
 *       200:
 *         description: Список марок
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Brand'
 * 
 *   post:
 *     summary: Добавить марку(и) автомобилей
 *     tags: [Автомобили]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - brands
 *             properties:
 *               brands:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Массив названий марок
 *     responses:
 *       200:
 *         description: Марки добавлены
 *       401:
 *         description: Требуется аутентификация
 *       403:
 *         description: Требуются права администратора
 */

/**
 * @swagger
 * /api/cars/brands/{id}:
 *   delete:
 *     summary: Удалить марку автомобиля
 *     tags: [Автомобили]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Марка удалена
 *       403:
 *         description: Требуются права администратора
 *       404:
 *         description: Марка не найдена
 */

/**
 * @swagger
 * /api/cars/models:
 *   get:
 *     summary: Получить модели по марке
 *     tags: [Автомобили]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID марки
 *     responses:
 *       200:
 *         description: Список моделей
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Model'
 * 
 *   post:
 *     summary: Добавить модель автомобиля
 *     tags: [Автомобили]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - model
 *               - brandId
 *             properties:
 *               model:
 *                 type: string
 *               brandId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Модель добавлена
 *       403:
 *         description: Требуются права администратора
 */

/**
 * @swagger
 * /api/subscription/prices:
 *   get:
 *     summary: Получить цены подписок
 *     tags: [Подписки]
 *     responses:
 *       200:
 *         description: Список цен подписок
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SubscriptionPrice'
 */

/**
 * @swagger
 * /api/subscription/user/{userId}:
 *   get:
 *     summary: Получить подписку пользователя
 *     tags: [Подписки]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Telegram user ID
 *     responses:
 *       200:
 *         description: Информация о подписке
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subscription'
 *       404:
 *         description: Подписка не найдена
 * 
 *   delete:
 *     summary: Удалить подписку пользователя
 *     tags: [Подписки]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Подписка удалена
 *       404:
 *         description: Подписка не найдена
 */

/**
 * @swagger
 * /api/subscription/user:
 *   post:
 *     summary: Создать или обновить подписку
 *     tags: [Подписки]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - periodMonths
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Telegram user ID
 *               periodMonths:
 *                 type: integer
 *                 description: Период подписки в месяцах
 *     responses:
 *       200:
 *         description: Подписка создана/обновлена
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subscription'
 */

/**
 * @swagger
 * /api/files/years/{yearId}/files:
 *   get:
 *     summary: Получить файлы по году выпуска
 *     tags: [Файлы]
 *     parameters:
 *       - in: path
 *         name: yearId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Telegram user ID для проверки премиум доступа
 *     responses:
 *       200:
 *         description: Список файлов
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 year:
 *                   type: string
 *                 model:
 *                   type: string
 *                 brand:
 *                   type: string
 *                 files:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/File'
 */

/**
 * @swagger
 * /api/info/help:
 *   get:
 *     summary: Получить справку
 *     tags: [Информация]
 *     responses:
 *       200:
 *         description: Текст справки
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 help:
 *                   type: string
 */

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Получить статистику (только для администраторов)
 *     tags: [Админ]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Статистика системы
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_users:
 *                   type: integer
 *                 premium_users:
 *                   type: integer
 *                 regular_users:
 *                   type: integer
 *                 brands_count:
 *                   type: integer
 *                 models_count:
 *                   type: integer
 *                 years_count:
 *                   type: integer
 *       403:
 *         description: Требуются права администратора
 */

/**
 * @swagger
 * /api/admin/admins:
 *   get:
 *     summary: Получить список администраторов
 *     tags: [Админ]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список администраторов
 *       403:
 *         description: Требуются права администратора
 * 
 *   post:
 *     summary: Добавить администратора
 *     tags: [Админ]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *             properties:
 *               user_id:
 *                 type: string
 *                 description: Telegram user ID
 *               username:
 *                 type: string
 *     responses:
 *       200:
 *         description: Администратор добавлен
 *       403:
 *         description: Требуются права администратора
 */

/**
 * @swagger
 * /api/admin/admins/{userId}:
 *   delete:
 *     summary: Удалить администратора
 *     tags: [Админ]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Администратор удален
 *       403:
 *         description: Требуются права администратора
 */

/**
 * @swagger
 * /debug/routes:
 *   get:
 *     summary: Получить список всех доступных маршрутов
 *     tags: [Информация]
 *     responses:
 *       200:
 *         description: Список маршрутов
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 routes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       path:
 *                         type: string
 *                       methods:
 *                         type: array
 *                         items:
 *                           type: string
 */


