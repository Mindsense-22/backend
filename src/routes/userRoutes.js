const express = require("express");
const authController = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// Authentication
router.post("/signup", authController.signup);
router.post("/verify", authController.verifyAccount);
router.post("/login", authController.login);

router.get("/approve-contact/:token", authController.acceptTrustedContact);

// --- Protected Routes ---
router.use(authMiddleware.protect);

router.post("/add-contact", authController.addTrustedContact);

module.exports = router;
