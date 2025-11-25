const express = require("express");
const router = express.Router();
const carsController = require("../controllers/carsController");
const { requireAdmin } = require("../middleware/adminCheck");
const { authenticateToken } = require("../middleware/auth");

// Публичные маршруты (не требуют аутентификации)
router.get("/brands", carsController.getBrands);
router.get("/brands/search", carsController.searchBrand);
router.get("/models", carsController.getModelsByBrand);
router.get("/models/search", carsController.searchModel);
router.get("/years", carsController.getYearsByModel);
router.get("/years/search", carsController.searchYear);

// Защищённые маршруты (требуют аутентификации + права админа)
// authenticateToken устанавливает req.user, requireAdmin проверяет права
router.post("/brands", authenticateToken, requireAdmin, carsController.addBrands);
router.delete("/brands/:id", authenticateToken, requireAdmin, carsController.deleteBrand);
router.post("/brands/batch", authenticateToken, requireAdmin, carsController.addBrands);
router.delete("/brands/batch", authenticateToken, requireAdmin, carsController.deleteBrands);
router.put("/brands", authenticateToken, requireAdmin, carsController.updateBrand);

router.post("/models", authenticateToken, requireAdmin, carsController.addModel);
router.post("/models/batch", authenticateToken, requireAdmin, carsController.addModels);
router.delete("/models/batch", authenticateToken, requireAdmin, carsController.deleteModels);
router.put("/models", authenticateToken, requireAdmin, carsController.updateModel);

router.post("/years/batch", authenticateToken, requireAdmin, carsController.addYears);
router.delete("/years/batch", authenticateToken, requireAdmin, carsController.deleteYears);
router.put("/years", authenticateToken, requireAdmin, carsController.updateYear);

module.exports = router;
