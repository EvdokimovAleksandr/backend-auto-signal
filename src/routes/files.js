const express = require("express");
const router = express.Router();
const filesController = require("../controllers/filesController");
const { requireAdmin } = require("../middleware/adminCheck");

// Маршруты для управления описаниями файлов
router.get(
  "/description-brands",
  requireAdmin,
  filesController.getBrandsForDescriptions
);
router.get(
  "/description-brands/:brandId/models",
  requireAdmin,
  filesController.getModelsByBrandForDescriptions
);
router.get(
  "/description-models/:modelId/years",
  requireAdmin,
  filesController.getYearsByModelForDescriptions
);
router.get(
  "/description-years/:yearId/files",
  requireAdmin,
  filesController.getFilesByYearForDescriptions
);
router.put(
  "/files/:fileId/description",
  requireAdmin,
  filesController.updateFileDescription
);

// Маршруты для работы с файлами
router.post("/photos", requireAdmin, filesController.addPhoto);
router.post("/photos/premium", requireAdmin, filesController.addPremiumPhoto);
router.get("/years/:yearId/files", filesController.getFilesByYear);

// Прокси для загрузки изображений из Google Drive (обход CORS)
router.get("/image/:fileId", filesController.getImageProxy);

// Маршруты для работы с файлами
router.delete("/photos/:fileId", requireAdmin, filesController.deletePhoto);

router.delete(
  "/photos/premium/:fileId",
  requireAdmin,
  filesController.deletePremiumPhoto
);

router.post("/pdfs", requireAdmin, filesController.addPdf);
router.delete("/pdfs/:fileId", requireAdmin, filesController.deletePdf);
router.post("/pdfs/premium", requireAdmin, filesController.addPremiumPdf);
router.delete(
  "/pdfs/premium/:fileId",
  requireAdmin,
  filesController.deletePremiumPdf
);

// Маршрут для получения файлов для удаления (предпросмотр)
router.get(
  "/years/:yearId/files/:fileType/preview",
  requireAdmin,
  filesController.getFilesForDeletion
);

module.exports = router;
