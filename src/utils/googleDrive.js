// Утилиты для работы с Google Drive
const convertToDownloadLink = (googleDriveLink) => {
  if (googleDriveLink.includes("drive.google.com/file/d/")) {
    const fileId = googleDriveLink.split("/d/")[1].split("/")[0];
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
  return null;
};

/**
 * Извлекает File ID из Google Drive ссылки
 * @param {string} googleDriveLink - Ссылка на Google Drive
 * @returns {string|null} - File ID или null
 */
const extractFileId = (googleDriveLink) => {
  if (!googleDriveLink) return null;
  
  // Если это уже ссылка с ID в параметрах
  if (googleDriveLink.includes("id=")) {
    const match = googleDriveLink.match(/[?&]id=([^&]+)/);
    if (match) return match[1];
  }
  
  // Если это обычная ссылка Google Drive
  if (googleDriveLink.includes("drive.google.com/file/d/")) {
    const fileId = googleDriveLink.split("/d/")[1].split("/")[0];
    return fileId;
  }
  
  return null;
};

/**
 * Конвертирует Google Drive ссылку в ссылку для просмотра изображения
 * Использует прокси через бэкенд для обхода CORS
 * @param {string} googleDriveLink - Ссылка на Google Drive
 * @returns {string|null} - Ссылка для просмотра через прокси или null
 */
const convertToViewLink = (googleDriveLink) => {
  if (!googleDriveLink) return null;
  
  // Если это уже прямая ссылка на изображение (не Google Drive), возвращаем как есть
  if (googleDriveLink.match(/\.(jpg|jpeg|png|gif|webp)$/i) && !googleDriveLink.includes("drive.google.com")) {
    return googleDriveLink;
  }
  
  // Извлекаем File ID
  const fileId = extractFileId(googleDriveLink);
  if (!fileId) return googleDriveLink; // Если не удалось извлечь ID, возвращаем оригинальную ссылку
  
  // Возвращаем ссылку на прокси эндпоинт бэкенда
  // Прокси будет загружать изображение и отдавать его клиенту
  // Используем путь без /api, так как API_BASE_URL уже содержит /api
  return `/files/image/${fileId}`;
};

const validateGoogleDriveLink = (link) => {
  return link.includes("drive.google.com/file/d/");
};

module.exports = { convertToDownloadLink, convertToViewLink, validateGoogleDriveLink };
