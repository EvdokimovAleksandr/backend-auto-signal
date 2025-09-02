const express = require("express");
const router = express.Router();
const subscriptionController = require("../controllers/subscriptionController");

router.get("/prices", subscriptionController.getSubscriptionPrices);
router.get("/user/:userId", subscriptionController.getUserSubscription);
router.post("/user", subscriptionController.createOrUpdateSubscription);
router.delete("/user/:userId", subscriptionController.deleteSubscription);

module.exports = router;
