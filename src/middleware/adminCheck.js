// middleware/adminCheck.js
const prisma = require("../utils/database");

const checkAdminStatus = async (userId) => {
  const admin = await prisma.admin_users.findUnique({
    where: { user_id: BigInt(userId) },
  });
  return !!admin;
};

const requireAdmin = async (req, res, next) => {
  try {
    // Предполагаем, что userId доступен из аутентификации
    const userId = req.user.id;

    const isAdmin = await checkAdminStatus(userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Требуются права администратора" });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { requireAdmin, checkAdminStatus };
