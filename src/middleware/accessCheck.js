const prisma = require("../utils/database");

// Проверка, имеет ли пользователь доступ к премиум-контенту
const checkPremiumAccess = async (userId) => {
  if (!userId) return false;

  const premiumUser = await prisma.premium_users.findUnique({
    where: { user_id: BigInt(userId) },
  });

  if (!premiumUser) return false;

  const currentTime = new Date();
  const subEnd = new Date(premiumUser.sub_end);

  return currentTime <= subEnd;
};

// Middleware для проверки доступа к премиум-контенту
const requirePremiumOrAdmin = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const isAdmin = await checkAdminStatus(userId);
    const hasPremium = await checkPremiumAccess(userId);

    if (!isAdmin && !hasPremium) {
      return res
        .status(403)
        .json({ error: "Требуется премиум-подписка или права администратора" });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Проверка, является ли пользователь владельцем файла или администратором
const checkFileOwnership = async (userId, fileId) => {
  try {
    // Находим файл и связанные данные
    const file = await prisma.files.findUnique({
      where: { id: parseInt(fileId) },
      include: {
        year: {
          include: {
            model: {
              include: {
                brand: true,
              },
            },
          },
        },
      },
    });

    if (!file) return false;

    // Проверяем, является ли пользователь администратором
    const isAdmin = await checkAdminStatus(userId);
    if (isAdmin) return true;

    // Здесь можно добавить дополнительную логику проверки прав,
    // если в будущем понадобится ограничить доступ к определенным файлам

    return false;
  } catch (error) {
    console.error("Error checking file ownership:", error);
    return false;
  }
};

// Middleware для проверки прав доступа к файлу
const requireFileOwnershipOrAdmin = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const fileId = req.params.fileId;

    const hasAccess = await checkFileOwnership(userId, fileId);

    if (!hasAccess) {
      return res
        .status(403)
        .json({ error: "Недостаточно прав для доступа к файлу" });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  checkPremiumAccess,
  requirePremiumOrAdmin,
  requireFileOwnershipOrAdmin,
};
