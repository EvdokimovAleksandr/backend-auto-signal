/**
 * Простой скрипт для тестирования API эндпоинтов
 * Запуск: node test-api.js
 */

const BASE_URL = process.env.API_URL || 'http://localhost:8000';

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// Функция для выполнения HTTP запросов
async function testEndpoint(method, path, data = null, headers = {}) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    let responseData;
    
    try {
      responseData = await response.json();
    } catch (jsonError) {
      // Если не JSON, пытаемся получить текст
      try {
        const text = await response.text();
        responseData = { text: text };
      } catch (textError) {
        responseData = { error: 'Unable to parse response' };
      }
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
      error: error.message,
    };
  }
}

// Функция для вывода результата
function printResult(name, result) {
  const statusColor = result.ok ? colors.green : colors.red;
  const statusText = result.ok ? '✓' : '✗';
  
  console.log(`${statusColor}${statusText}${colors.reset} ${name}`);
  console.log(`   Status: ${result.status}`);
  
  if (result.error) {
    console.log(`   ${colors.red}Error: ${result.error}${colors.reset}`);
  } else if (result.data) {
    console.log(`   Response:`, JSON.stringify(result.data, null, 2).substring(0, 200));
  }
  console.log('');
}

// Основная функция тестирования
async function runTests() {
  console.log(`${colors.blue}=== Тестирование API эндпоинтов ===${colors.reset}\n`);

  // 1. Тест получения марок
  console.log(`${colors.yellow}1. Тестирование марок автомобилей${colors.reset}`);
  const brandsResult = await testEndpoint('GET', '/api/cars/brands');
  printResult('GET /api/cars/brands', brandsResult);

  // 2. Тест получения справки
  console.log(`${colors.yellow}2. Тестирование информации${colors.reset}`);
  const helpResult = await testEndpoint('GET', '/api/info/help');
  printResult('GET /api/info/help', helpResult);

  // 3. Тест получения цен подписок
  console.log(`${colors.yellow}3. Тестирование подписок${colors.reset}`);
  const pricesResult = await testEndpoint('GET', '/api/subscription/prices');
  printResult('GET /api/subscription/prices', pricesResult);

  // 4. Тест регистрации пользователя
  console.log(`${colors.yellow}4. Тестирование пользователей${colors.reset}`);
  const testUserId = Date.now().toString(); // Генерируем уникальный ID
  const registerResult = await testEndpoint('POST', '/api/users/register', {
    userId: testUserId,
    username: 'test_user',
    name: 'Test User',
  });
  printResult('POST /api/users/register', registerResult);

  // 5. Тест получения пользователя
  if (registerResult.ok) {
    const getUserResult = await testEndpoint('GET', `/api/users/${testUserId}`);
    printResult(`GET /api/users/${testUserId}`, getUserResult);
  }

  // 6. Тест получения списка пользователей
  const getUsersResult = await testEndpoint('GET', '/api/users');
  printResult('GET /api/users', getUsersResult);

  // 7. Тест debug endpoint
  console.log(`${colors.yellow}5. Тестирование debug endpoint${colors.reset}`);
  const debugResult = await testEndpoint('GET', '/debug/routes');
  printResult('GET /debug/routes', debugResult);

  // Итоги
  console.log(`${colors.blue}=== Тестирование завершено ===${colors.reset}`);
}

// Проверка наличия fetch (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.error(`${colors.red}Ошибка: Требуется Node.js 18+ для поддержки fetch API${colors.reset}`);
  console.log('Альтернатива: используйте curl или Postman для тестирования');
  process.exit(1);
}

// Запуск тестов
runTests().catch(error => {
  console.error(`${colors.red}Критическая ошибка:${colors.reset}`, error);
  process.exit(1);
});

