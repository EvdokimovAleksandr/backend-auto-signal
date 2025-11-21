// Создаем тестовое приложение для Jest
// Используем ts-node для загрузки TypeScript модулей

// Регистрируем ts-node перед импортом
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    skipLibCheck: true,
  },
});

// Импортируем приложение
const appModule = require('../index.ts');
const app = appModule.default || appModule;

if (!app) {
  throw new Error('Не удалось загрузить приложение из index.ts');
}

module.exports = app;

