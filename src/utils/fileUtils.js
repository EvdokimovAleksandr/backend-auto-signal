// Утилиты для работы с файлами
const getFileType = (file) => {
  if (file.photo) return "photo";
  if (file.premium_photo) return "premium_photo";
  if (file.pdf) return "pdf";
  if (file.premium_pdf) return "premium_pdf";
  return "unknown";
};

const getFileTypeName = (file) => {
  if (file.photo) return "Фото";
  if (file.premium_photo) return "Премиум фото";
  if (file.pdf) return "PDF";
  if (file.premium_pdf) return "Премиум PDF";
  return "Неизвестный файл";
};

const generateFilename = (brand, model, year, fileType) => {
  const extensions = {
    photo: "jpg",
    premium_photo: "jpg",
    pdf: "pdf",
    premium_pdf: "pdf",
  };

  const prefixes = {
    photo: "",
    premium_photo: "(PREMIUM) ",
    pdf: "",
    premium_pdf: "(PREMIUM) ",
  };

  const ext = extensions[fileType] || "bin";
  const prefix = prefixes[fileType] || "";

  return `${prefix}${brand} ${model} ${year}.${ext}`;
};

module.exports = { getFileType, getFileTypeName, generateFilename };
