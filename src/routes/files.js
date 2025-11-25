const express = require("express");
const router = express.Router();
const filesController = require("../controllers/filesController");
const { requireAdmin } = require("../middleware/adminCheck");
const { authenticateToken } = require("../middleware/auth");

// Публичные маршруты (не требуют аутентификации)
router.get("/years/:yearId/files", filesController.getFilesByYear);
router.get("/image/:fileId", filesController.getImageProxy);

// Защищённые маршруты (требуют аутентификации + права админа)
// authenticateToken устанавливает req.user, requireAdmin проверяет права

// Маршруты для управления описаниями файлов
router.get(
  "/description-brands",
  authenticateToken,
  requireAdmin,
  filesController.getBrandsForDescriptions
);
router.get(
  "/description-brands/:brandId/models",
  authenticateToken,
  requireAdmin,
  filesController.getModelsByBrandForDescriptions
);
router.get(
  "/description-models/:modelId/years",
  authenticateToken,
  requireAdmin,
  filesController.getYearsByModelForDescriptions
);
router.get(
  "/description-years/:yearId/files",
  authenticateToken,
  requireAdmin,
  filesController.getFilesByYearForDescriptions
);
router.put(
  "/files/:fileId/description",
  authenticateToken,
  requireAdmin,
  filesController.updateFileDescription
);

// Маршруты для работы с фото
router.post("/photos", authenticateToken, requireAdmin, filesController.addPhoto);
router.post("/photos/premium", authenticateToken, requireAdmin, filesController.addPremiumPhoto);
router.delete("/photos/:fileId", authenticateToken, requireAdmin, filesController.deletePhoto);
router.delete(
  "/photos/premium/:fileId",
  authenticateToken,
  requireAdmin,
  filesController.deletePremiumPhoto
);

// Маршруты для работы с PDF
router.post("/pdfs", authenticateToken, requireAdmin, filesController.addPdf);
router.delete("/pdfs/:fileId", authenticateToken, requireAdmin, filesController.deletePdf);
router.post("/pdfs/premium", authenticateToken, requireAdmin, filesController.addPremiumPdf);
router.delete(
  "/pdfs/premium/:fileId",
  authenticateToken,
  requireAdmin,
  filesController.deletePremiumPdf
);

// Маршрут для получения файлов для удаления (предпросмотр)
router.get(
  "/years/:yearId/files/:fileType/preview",
  authenticateToken,
  requireAdmin,
  filesController.getFilesForDeletion
);

module.exports = router;
