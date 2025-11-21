// Утилиты для валидации входящих данных

/**
 * Валидация Telegram username
 * @param {string} username - Username для валидации
 * @returns {{valid: boolean, error?: string}}
 */
const validateTelegramUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username должен быть строкой' };
  }

  const cleanUsername = username.replace(/^@/, '').trim();

  if (cleanUsername.length === 0) {
    return { valid: false, error: 'Username не может быть пустым' };
  }

  // Telegram username может содержать только буквы, цифры и подчеркивания, длина 5-32 символа
  if (!/^[a-zA-Z0-9_]{5,32}$/.test(cleanUsername)) {
    return { 
      valid: false, 
      error: 'Username должен содержать только буквы, цифры и подчеркивания, длиной от 5 до 32 символов' 
    };
  }

  return { valid: true };
};

/**
 * Валидация Telegram User ID
 * @param {string} userId - User ID для валидации
 * @returns {{valid: boolean, error?: string}}
 */
const validateTelegramUserId = (userId) => {
  if (!userId || typeof userId !== 'string') {
    return { valid: false, error: 'User ID должен быть строкой' };
  }

  const trimmed = userId.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'User ID не может быть пустым' };
  }

  // User ID должен быть положительным числом
  if (!/^\d+$/.test(trimmed)) {
    return { valid: false, error: 'User ID должен содержать только цифры' };
  }

  // Проверка на разумный диапазон (Telegram User ID обычно от 1 до очень больших чисел)
  const numUserId = BigInt(trimmed);
  if (numUserId <= 0) {
    return { valid: false, error: 'User ID должен быть положительным числом' };
  }

  return { valid: true };
};

/**
 * Валидация telegramInput (может быть username или User ID)
 * @param {string} input - Входные данные
 * @returns {{valid: boolean, error?: string, type?: 'username' | 'userId'}}
 */
const validateTelegramInput = (input) => {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Входные данные должны быть строкой' };
  }

  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Входные данные не могут быть пустыми' };
  }

  // Если это числовой ID
  if (/^\d+$/.test(trimmed)) {
    const userIdValidation = validateTelegramUserId(trimmed);
    if (!userIdValidation.valid) {
      return userIdValidation;
    }
    return { valid: true, type: 'userId' };
  }

  // Если это username (с @ или без)
  const usernameValidation = validateTelegramUsername(trimmed);
  if (!usernameValidation.valid) {
    return usernameValidation;
  }
  return { valid: true, type: 'username' };
};

/**
 * Валидация имени пользователя
 * @param {string} name - Имя для валидации
 * @returns {{valid: boolean, error?: string}}
 */
const validateUserName = (name) => {
  if (name === undefined || name === null) {
    return { valid: true }; // Имя опционально
  }

  if (typeof name !== 'string') {
    return { valid: false, error: 'Имя должно быть строкой' };
  }

  const trimmed = name.trim();

  if (trimmed.length > 100) {
    return { valid: false, error: 'Имя не может быть длиннее 100 символов' };
  }

  return { valid: true };
};

const validateBrands = (brands) => {
  if (!Array.isArray(brands)) {
    return { valid: false, error: "Brands must be an array" };
  }

  if (brands.length === 0) {
    return { valid: false, error: "Brands array cannot be empty" };
  }

  for (const brand of brands) {
    if (typeof brand !== "string" || brand.trim().length === 0) {
      return { valid: false, error: "Each brand must be a non-empty string" };
    }
  }

  return { valid: true };
};

const validateModels = (models, brandId) => {
  if (!Array.isArray(models)) {
    return { valid: false, error: "Models must be an array" };
  }

  if (models.length === 0) {
    return { valid: false, error: "Models array cannot be empty" };
  }

  if (!brandId || isNaN(parseInt(brandId))) {
    return { valid: false, error: "Valid brandId is required" };
  }

  for (const model of models) {
    if (typeof model !== "string" || model.trim().length === 0) {
      return { valid: false, error: "Each model must be a non-empty string" };
    }
  }

  return { valid: true };
};

module.exports = { 
  validateBrands, 
  validateModels,
  validateTelegramUsername,
  validateTelegramUserId,
  validateTelegramInput,
  validateUserName,
};
