// Утилиты для валидации входящих данных
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

module.exports = { validateBrands, validateModels };
