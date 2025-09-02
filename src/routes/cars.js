const express = require("express");
const router = express.Router();
const carsController = require("../controllers/carsController");
const { requireAdmin } = require("../middleware/adminCheck");

router.post("/brands", carsController.addBrand);
router.delete("/brands/:id", carsController.deleteBrand);

router.post("/models", carsController.addModel);
// Маршруты для марок автомобилей
router.get("/brands", carsController.getBrands);
router.post("/brands", requireAdmin, carsController.addBrands);
router.post("/brands/batch", requireAdmin, carsController.addBrands); // Массовое добавление
router.delete("/brands/batch", requireAdmin, carsController.deleteBrands); // Массовое удаление
router.put("/brands", requireAdmin, carsController.updateBrand); // Обновление
router.get("/brands/search", carsController.searchBrand); // Поиск

// Маршруты для моделей автомобилей
router.get("/models", carsController.getModelsByBrand);
router.post("/models", requireAdmin, carsController.addModels);
router.post("/models/batch", requireAdmin, carsController.addModels); // Массовое добавление
router.delete("/models/batch", requireAdmin, carsController.deleteModels); // Массовое удаление
router.put("/models", requireAdmin, carsController.updateModel); // Обновление
router.get("/models/search", carsController.searchModel); // Поиск

// Маршруты для годов выпуска
router.post("/years/batch", requireAdmin, carsController.addYears);
router.delete("/years/batch", requireAdmin, carsController.deleteYears);
router.put("/years", requireAdmin, carsController.updateYear);
router.get("/years/search", carsController.searchYear);

module.exports = router;
