const request = require('supertest');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/database');

// Загружаем тестовое приложение
const app = require('./app');

beforeAll(() => {
  if (!app) {
    throw new Error('Не удалось загрузить приложение');
  }
});

describe('Авторизация и регистрация пользователей', () => {
  // Используем числовые ID для совместимости с BigInt
  const testUserId = String(Date.now());
  const testUsername = 'test_user';
  const testName = 'Test User';

  // Очистка тестовых данных после всех тестов
  afterAll(async () => {
    try {
      // Удаляем всех пользователей, созданных в тестах
      // Используем фильтр по user_id, который начинается с testUserId
      const baseUserId = BigInt(testUserId);
      const nextUserId = baseUserId + BigInt(1000000); // Большой диапазон для покрытия всех тестовых ID
      
      await prisma.users.deleteMany({
        where: {
          user_id: {
            gte: baseUserId,
            lt: nextUserId,
          },
        },
      });
    } catch (error) {
      console.error('Ошибка при очистке тестовых данных:', error);
    } finally {
      await prisma.$disconnect();
    }
  });

  describe('POST /api/users/login - Авторизация', () => {
    it('должен создать нового пользователя при первом входе', async () => {
      if (!app) {
        throw new Error('Приложение не загружено');
      }
      
      const response = await request(app)
        .post('/api/users/login')
        .send({
          userId: testUserId,
          username: testUsername,
          name: testName,
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(String(response.body.user.user_id)).toBe(testUserId);
      expect(response.body.user.username).toBe(testUsername);
      expect(response.body.user.name).toBe(testName);
      expect(response.body).toHaveProperty('isAdmin');
      expect(response.body).toHaveProperty('isPremium');
    });

    it('должен вернуть токен для существующего пользователя', async () => {
      if (!app) {
        throw new Error('Приложение не загружено');
      }
      
      const response = await request(app)
        .post('/api/users/login')
        .send({
          userId: testUserId,
          username: 'updated_username',
          name: 'Updated Name',
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(String(response.body.user.user_id)).toBe(testUserId);
      
      // Проверяем, что токен валиден
      const decoded = jwt.verify(
        response.body.token,
        process.env.JWT_SECRET || 'default-secret-key'
      );
      expect(String(decoded.userId)).toBe(testUserId);
    });

    it('должен вернуть ошибку при отсутствии userId и telegramInput', async () => {
      if (!app) {
        throw new Error('Приложение не загружено');
      }
      
      const response = await request(app)
        .post('/api/users/login')
        .send({
          username: testUsername,
          name: testName,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('userId');
    });

    it('должен работать с telegramInput (числовой ID)', async () => {
      if (!app) {
        throw new Error('Приложение не загружено');
      }
      
      const telegramInputUserId = String(BigInt(testUserId) + BigInt(10));
      
      const response = await request(app)
        .post('/api/users/login')
        .send({
          telegramInput: telegramInputUserId,
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(String(response.body.user.user_id)).toBe(telegramInputUserId);
    });

    it('должен обновить информацию пользователя при повторном входе', async () => {
      if (!app) {
        throw new Error('Приложение не загружено');
      }
      
      const newUsername = 'new_username';
      const newName = 'New Name';

      const response = await request(app)
        .post('/api/users/login')
        .send({
          userId: testUserId,
          username: newUsername,
          name: newName,
        })
        .expect(200);

      expect(response.body.user.username).toBe(newUsername);
      expect(response.body.user.name).toBe(newName);
    });
  });

  describe('POST /api/users/register - Регистрация', () => {
    const registerUserId = String(BigInt(testUserId) + BigInt(1));

    it('должен зарегистрировать нового пользователя', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          userId: registerUserId,
          username: 'register_user',
          name: 'Register User',
        })
        .expect(200);

      expect(response.body).toHaveProperty('user_id');
      expect(String(response.body.user_id)).toBe(registerUserId);
      expect(response.body.username).toBe('register_user');
      expect(response.body.name).toBe('Register User');
    });

    it('должен обновить существующего пользователя при регистрации', async () => {
      if (!app) {
        throw new Error('Приложение не загружено');
      }
      
      const response = await request(app)
        .post('/api/users/register')
        .send({
          userId: registerUserId,
          username: 'updated_register_user',
          name: 'Updated Register User',
        })
        .expect(200);

      expect(response.body.username).toBe('updated_register_user');
      expect(response.body.name).toBe('Updated Register User');
    });

    it('должен вернуть ошибку при отсутствии userId', async () => {
      if (!app) {
        throw new Error('Приложение не загружено');
      }
      
      const response = await request(app)
        .post('/api/users/register')
        .send({
          username: 'test',
          name: 'Test',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/users/me - Получение текущего пользователя', () => {
    let authToken;

    beforeAll(async () => {
      if (!app) {
        throw new Error('Приложение не загружено');
      }
      
      // Создаем пользователя и получаем токен
      const meTestUserId = String(BigInt(testUserId) + BigInt(2));
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          userId: meTestUserId,
          username: 'me_test_user',
          name: 'Me Test User',
        });

      if (loginResponse.status === 200 && loginResponse.body.token) {
        authToken = loginResponse.body.token;
      } else {
        throw new Error(`Не удалось получить токен: ${JSON.stringify(loginResponse.body)}`);
      }
    });

    it('должен вернуть информацию о текущем пользователе с валидным токеном', async () => {
      if (!app || !authToken) {
        throw new Error('Приложение или токен не загружены');
      }
      
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('user_id');
      expect(response.body).toHaveProperty('isAdmin');
      expect(response.body).toHaveProperty('isPremium');
    });

    it('должен вернуть ошибку без токена', async () => {
      if (!app) {
        throw new Error('Приложение не загружено');
      }
      
      const response = await request(app)
        .get('/api/users/me')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('должен вернуть ошибку с невалидным токеном', async () => {
      if (!app) {
        throw new Error('Приложение не загружено');
      }
      
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid_token')
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Интеграционный тест: Полный цикл авторизации', () => {
    const integrationUserId = String(BigInt(testUserId) + BigInt(3));

    it('должен пройти полный цикл: регистрация -> логин -> получение данных', async () => {
      if (!app) {
        throw new Error('Приложение не загружено');
      }
      
      // 1. Регистрация
      const registerResponse = await request(app)
        .post('/api/users/register')
        .send({
          userId: integrationUserId,
          username: 'integration_user',
          name: 'Integration User',
        })
        .expect(200);

      expect(String(registerResponse.body.user_id)).toBe(integrationUserId);

      // 2. Логин
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          userId: integrationUserId,
          username: 'integration_user',
          name: 'Integration User',
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('token');
      const token = loginResponse.body.token;

      // 3. Получение данных пользователя
      const meResponse = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(String(meResponse.body.user.user_id)).toBe(integrationUserId);
      expect(meResponse.body.user.username).toBe('integration_user');
    });

    it('должен пройти полный цикл с telegramInput: логин по числовому ID -> получение данных', async () => {
      if (!app) {
        throw new Error('Приложение не загружено');
      }
      
      const telegramInputUserId = String(BigInt(testUserId) + BigInt(20));
      
      // 1. Логин через telegramInput
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          telegramInput: telegramInputUserId,
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('token');
      const token = loginResponse.body.token;

      // 2. Получение данных пользователя
      const meResponse = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(String(meResponse.body.user.user_id)).toBe(telegramInputUserId);
    });
  });
});

