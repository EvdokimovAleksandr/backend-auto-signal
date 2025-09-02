// Утилиты для работы с Google Drive
const convertToDownloadLink = (googleDriveLink) => {
  if (googleDriveLink.includes("drive.google.com/file/d/")) {
    const fileId = googleDriveLink.split("/d/")[1].split("/")[0];
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
  return null;
};

const validateGoogleDriveLink = (link) => {
  return link.includes("drive.google.com/file/d/");
};

module.exports = { convertToDownloadLink, validateGoogleDriveLink };
