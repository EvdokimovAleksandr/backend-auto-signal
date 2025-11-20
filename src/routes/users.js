const express = require("express");
const router = express.Router();
const usersController = require("../controllers/usersController");

router.post("/register", usersController.registerUser);
router.get("/:userId", usersController.getUser);
router.put("/:userId", usersController.updateUser);
router.get("/", usersController.getUsers);

module.exports = router;

