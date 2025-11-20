const express = require("express");
const router = express.Router();
const usersController = require("../controllers/usersController");
const { authenticateToken } = require("../middleware/auth");

// Логин (генерация токена)
router.post("/login", usersController.login);

// Получить текущего пользователя (требует токен)
router.get("/me", authenticateToken, usersController.getCurrentUser);

// Регистрация пользователя
router.post("/register", usersController.registerUser);

// Остальные роуты
router.get("/:userId", usersController.getUser);
router.put("/:userId", usersController.updateUser);
router.get("/", usersController.getUsers);

module.exports = router;

