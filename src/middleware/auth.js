const jwt = require("jsonwebtoken");
const prisma = require("../utils/database");

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Токен доступа отсутствует" });
  }

  try {
    const secret = process.env.JWT_SECRET || "default-secret-key";
    const decoded = jwt.verify(token, secret);
    
    if (!decoded.userId) {
      return res.status(403).json({ error: "Недействительный токен" });
    }

    const user = await prisma.users.findUnique({
      where: { user_id: BigInt(decoded.userId) },
    });

    if (!user) {
      return res.status(403).json({ error: "Пользователь не найден" });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: "Недействительный токен" });
    }
    return res.status(500).json({ error: "Ошибка аутентификации" });
  }
};

module.exports = { authenticateToken };
