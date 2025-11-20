const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Auto Signal API",
      version: "1.0.0",
      description:
        "Backend API для проекта Auto Signal. Документация всех доступных эндпоинтов для работы с автомобилями, пользователями, подписками и файлами.",
      contact: {
        name: "API Support",
      },
    },
    servers: [
      {
        url: "http://localhost:8000",
        description: "Development server",
      },
      {
        url: "https://api.example.com",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT токен для аутентификации администратора",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description: "ID пользователя в системе",
            },
            user_id: {
              type: "string",
              description: "Telegram user ID (BigInt, возвращается как строка)",
            },
            username: {
              type: "string",
              nullable: true,
              description: "Имя пользователя в Telegram",
            },
            name: {
              type: "string",
              nullable: true,
              description: "Имя пользователя",
            },
            created_at: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            stage: {
              type: "integer",
              default: 0,
            },
            page: {
              type: "integer",
              default: 0,
            },
          },
        },
        Brand: {
          type: "object",
          properties: {
            id: {
              type: "integer",
            },
            brand: {
              type: "string",
              description: "Название марки автомобиля",
            },
          },
        },
        Model: {
          type: "object",
          properties: {
            id: {
              type: "integer",
            },
            model: {
              type: "string",
              description: "Название модели",
            },
            brand_id: {
              type: "integer",
              nullable: true,
            },
            brand: {
              type: "string",
              nullable: true,
            },
          },
        },
        Year: {
          type: "object",
          properties: {
            id: {
              type: "integer",
            },
            year: {
              type: "string",
              description: "Год выпуска",
            },
            model_id: {
              type: "integer",
              nullable: true,
            },
            brand: {
              type: "string",
              nullable: true,
            },
            model: {
              type: "string",
              nullable: true,
            },
          },
        },
        File: {
          type: "object",
          properties: {
            id: {
              type: "integer",
            },
            photo: {
              type: "string",
              nullable: true,
              description: "Ссылка на обычное фото",
            },
            pdf: {
              type: "string",
              nullable: true,
              description: "Ссылка на обычный PDF",
            },
            premium_photo: {
              type: "string",
              nullable: true,
              description: "Ссылка на премиум фото",
            },
            premium_pdf: {
              type: "string",
              nullable: true,
              description: "Ссылка на премиум PDF",
            },
            year_id: {
              type: "integer",
              nullable: true,
            },
            brand: {
              type: "string",
              nullable: true,
            },
            model: {
              type: "string",
              nullable: true,
            },
            year: {
              type: "string",
              nullable: true,
            },
            caption: {
              type: "string",
              nullable: true,
              description: "Описание файла",
            },
          },
        },
        Subscription: {
          type: "object",
          properties: {
            id: {
              type: "integer",
            },
            user_id: {
              type: "string",
              description: "Telegram user ID (BigInt, возвращается как строка)",
            },
            sub_start: {
              type: "string",
              description: "Дата начала подписки (ISO строка)",
            },
            sub_end: {
              type: "string",
              description: "Дата окончания подписки (ISO строка)",
            },
            status: {
              type: "string",
              description: "Статус подписки",
            },
            period_months: {
              type: "integer",
              nullable: true,
              description: "Период подписки в месяцах",
            },
          },
        },
        SubscriptionPrice: {
          type: "object",
          properties: {
            id: {
              type: "integer",
            },
            period_months: {
              type: "integer",
              description: "Период подписки в месяцах",
            },
            price_kopecks: {
              type: "integer",
              description: "Цена в копейках",
            },
            created_at: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Описание ошибки",
            },
          },
        },
      },
    },
    tags: [
      {
        name: "Автомобили",
        description: "Эндпоинты для работы с марками, моделями и годами выпуска",
      },
      {
        name: "Файлы",
        description: "Эндпоинты для работы с файлами (фото, PDF)",
      },
      {
        name: "Пользователи",
        description: "Эндпоинты для работы с пользователями",
      },
      {
        name: "Подписки",
        description: "Эндпоинты для работы с подписками",
      },
      {
        name: "Админ",
        description: "Эндпоинты администратора (требуют JWT токен)",
      },
      {
        name: "Информация",
        description: "Информационные эндпоинты",
      },
    ],
  },
  apis: ["./src/routes/*.js", "./src/controllers/*.js", "./src/docs/swagger.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

