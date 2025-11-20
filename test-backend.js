const BASE_URL = "http://localhost:8000";

async function callApi(method, path, data = null, token = null) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (token) {
    options.headers.Authorization = `Bearer ${token}`;
  }

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    let responseData;
    try {
      responseData = await response.json();
    } catch (e) {
      responseData = { text: await response.text() };
    }

    return {
      status: response.status,
      ok: response.ok,
      data: responseData,
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      data: { error: error.message },
    };
  }
}

async function runTests() {
  console.log("=== Тестирование Backend API ===\n");

  // 1. Проверка базовых эндпоинтов
  console.log("1. Проверка базовых эндпоинтов:");
  const brands = await callApi("GET", "/api/cars/brands");
  console.log(`   ${brands.ok ? "✅" : "❌"} GET /api/cars/brands - Status: ${brands.status}`);
  if (!brands.ok) {
    console.log(`      Ошибка: ${JSON.stringify(brands.data)}`);
  } else {
    console.log(`      Найдено марок: ${Array.isArray(brands.data) ? brands.data.length : 0}`);
  }

  const help = await callApi("GET", "/api/info/help");
  console.log(`   ${help.ok ? "✅" : "❌"} GET /api/info/help - Status: ${help.status}`);

  const prices = await callApi("GET", "/api/subscription/prices");
  console.log(`   ${prices.ok ? "✅" : "❌"} GET /api/subscription/prices - Status: ${prices.status}`);
  if (prices.ok) {
    console.log(`      Найдено цен: ${Array.isArray(prices.data) ? prices.data.length : 0}`);
  }

  console.log("");

  // 2. Тестирование авторизации
  console.log("2. Тестирование авторизации:");
  const testUserId = "123456789"; // Тестовый user_id
  const loginResponse = await callApi("POST", "/api/users/login", {
    userId: testUserId,
    username: "test_user",
    name: "Test User",
  });
  console.log(`   ${loginResponse.ok ? "✅" : "❌"} POST /api/users/login - Status: ${loginResponse.status}`);
  
  if (loginResponse.ok && loginResponse.data.token) {
    const token = loginResponse.data.token;
    console.log(`      ✅ Токен получен: ${token.substring(0, 20)}...`);
    console.log(`      ✅ Пользователь: ${loginResponse.data.user?.user_id || 'N/A'}`);
    console.log(`      ✅ Админ: ${loginResponse.data.isAdmin ? 'Да' : 'Нет'}`);
    console.log(`      ✅ Премиум: ${loginResponse.data.isPremium ? 'Да' : 'Нет'}`);

    // Проверка получения текущего пользователя
    const currentUser = await callApi("GET", "/api/users/me", null, token);
    console.log(`   ${currentUser.ok ? "✅" : "❌"} GET /api/users/me - Status: ${currentUser.status}`);
  } else {
    console.log(`      ❌ Ошибка авторизации: ${JSON.stringify(loginResponse.data)}`);
  }

  console.log("");

  // 3. Проверка получения пользователей
  console.log("3. Проверка получения пользователей:");
  const users = await callApi("GET", "/api/users?page=1&limit=5");
  console.log(`   ${users.ok ? "✅" : "❌"} GET /api/users - Status: ${users.status}`);
  if (users.ok) {
    const usersList = users.data.users || users.data.data || [];
    console.log(`      Найдено пользователей: ${usersList.length}`);
    if (usersList.length > 0) {
      console.log(`      Примеры: ${usersList.slice(0, 3).map(u => u.user_id || u.id).join(', ')}`);
    }
  }

  console.log("");

  // 4. Проверка получения моделей (если есть марки)
  if (brands.ok && Array.isArray(brands.data) && brands.data.length > 0) {
    console.log("4. Проверка получения моделей:");
    const firstBrand = brands.data[0];
    const models = await callApi("GET", `/api/cars/models?brandId=${firstBrand.id}`);
    console.log(`   ${models.ok ? "✅" : "❌"} GET /api/cars/models?brandId=${firstBrand.id} - Status: ${models.status}`);
    if (models.ok) {
      const modelsList = Array.isArray(models.data) ? models.data : [];
      console.log(`      Найдено моделей для "${firstBrand.brand}": ${modelsList.length}`);
    }
  }

  console.log("\n=== Тестирование завершено ===");
  console.log("\n💡 Рекомендации:");
  console.log("   - Если БД пуста, добавьте тестовые данные");
  console.log("   - Проверьте, что сервер запущен: npm run dev");
  console.log("   - Проверьте DATABASE_URL в .env файле");
  console.log("   - Запустите: npm run check-db для детальной проверки БД");
}

runTests().catch(console.error);


