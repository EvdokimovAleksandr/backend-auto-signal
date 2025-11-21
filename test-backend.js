const BASE_URL = process.env.API_URL || "http://localhost:8000";

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
  console.log(`Сервер: ${BASE_URL}\n`);

  let allPassed = true;

  // 1. Проверка базовых эндпоинтов
  console.log("1. Проверка базовых эндпоинтов:");
  const brands = await callApi("GET", "/api/cars/brands");
  const brandsOk = brands.ok && Array.isArray(brands.data);
  console.log(`   ${brandsOk ? "✅" : "❌"} GET /api/cars/brands`);
  if (!brandsOk) {
    console.log(`      Ошибка: ${JSON.stringify(brands.data)}`);
    allPassed = false;
  } else {
    console.log(`      Найдено марок: ${brands.data.length}`);
  }

  const prices = await callApi("GET", "/api/subscription/prices");
  const pricesOk = prices.ok && Array.isArray(prices.data);
  console.log(`   ${pricesOk ? "✅" : "❌"} GET /api/subscription/prices`);
  if (!pricesOk) allPassed = false;

  console.log("");

  // 2. Тестирование авторизации
  console.log("2. Тестирование авторизации:");
  const testUserId = String(Date.now());
  
  // Регистрация
  const registerResponse = await callApi("POST", "/api/users/register", {
    userId: testUserId,
    username: "test_user",
    name: "Test User",
  });
  const registerOk = registerResponse.ok && registerResponse.data.user_id;
  console.log(`   ${registerOk ? "✅" : "❌"} POST /api/users/register`);
  if (!registerOk) {
    console.log(`      Ошибка: ${JSON.stringify(registerResponse.data)}`);
    allPassed = false;
  }

  // Логин
  const loginResponse = await callApi("POST", "/api/users/login", {
    userId: testUserId,
    username: "test_user",
    name: "Test User",
  });
  const loginOk = loginResponse.ok && loginResponse.data.token;
  console.log(`   ${loginOk ? "✅" : "❌"} POST /api/users/login`);
  
  if (loginOk) {
    const token = loginResponse.data.token;
    console.log(`      Токен получен: ${token.substring(0, 20)}...`);
    console.log(`      Пользователь: ${loginResponse.data.user?.user_id || 'N/A'}`);
    console.log(`      Админ: ${loginResponse.data.isAdmin ? 'Да' : 'Нет'}`);
    console.log(`      Премиум: ${loginResponse.data.isPremium ? 'Да' : 'Нет'}`);

    // Проверка /me
    const meResponse = await callApi("GET", "/api/users/me", null, token);
    const meOk = meResponse.ok && meResponse.data.user;
    console.log(`   ${meOk ? "✅" : "❌"} GET /api/users/me`);
    if (!meOk) {
      console.log(`      Ошибка: ${JSON.stringify(meResponse.data)}`);
      allPassed = false;
    } else {
      console.log(`      Пользователь получен: ${meResponse.data.user?.user_id || 'N/A'}`);
    }
  } else {
    console.log(`      Ошибка: ${JSON.stringify(loginResponse.data)}`);
    allPassed = false;
  }

  console.log("\n=== Результат ===");
  console.log(allPassed ? "✅ Все тесты пройдены" : "❌ Есть ошибки");
  console.log("\n💡 Для детальных тестов используйте: npm test");
}

runTests().catch(console.error);


