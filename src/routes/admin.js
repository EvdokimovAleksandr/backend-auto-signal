// routes/admin.js
const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { requireAdmin } = require("../middleware/adminCheck");

router.get("/stats", requireAdmin, adminController.getStats);
router.put(
  "/subscription-price",
  requireAdmin,
  adminController.updateSubscriptionPrice
);
router.post("/users/:userId/admin", requireAdmin, adminController.addAdmin);
router.delete(
  "/users/:userId/admin",
  requireAdmin,
  adminController.removeAdmin
);
router.get("/stats/detailed", requireAdmin, adminController.getDetailedStats);
router.get("/stats/top-models", requireAdmin, adminController.getTopModels);
// Управление ценами
router.get("/prices", requireAdmin, adminController.managePrices);
router.put("/prices/:periodMonths", requireAdmin, adminController.updatePrice);

// Управление администраторами
router.get("/admins", requireAdmin, adminController.manageAdmins);
router.post("/admins", requireAdmin, adminController.addAdmin);
router.delete("/admins/:userId", requireAdmin, adminController.removeAdmin);
router.get("/admins/list", requireAdmin, adminController.listAdmins);

// Настройки бота
router.get("/settings", requireAdmin, adminController.manageSettings);
router.put(
  "/settings/start-message",
  requireAdmin,
  adminController.updateStartMessage
);

// Управление описаниями файлов
router.get("/descriptions", requireAdmin, adminController.manageDescriptions);
router.post(
  "/files/:fileId/description",
  requireAdmin,
  adminController.addFileDescription
);

module.exports = router;
