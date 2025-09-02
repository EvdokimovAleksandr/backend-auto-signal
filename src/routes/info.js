const express = require("express");
const router = express.Router();
const infoController = require("../controllers/infoController");

router.get("/help", infoController.getHelp);

module.exports = router;
