const jwt = require("jsonwebtoken");
const prisma = require("../utils/database");

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Токен доступа отсутствует" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.users.findUnique({
      where: { user_id: BigInt(decoded.userId) },
    });

    if (!user) {
      return res.status(403).json({ error: "Пользователь не найден" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Недействительный токен" });
  }
};

module.exports = { authenticateToken };
