const express = require("express");
const authController = require("../controllers/authController/authController");
const passwordController = require("../controllers/authController/passwordController");
const contactController = require("../controllers/authController/contactController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// Authentication
router.post("/signup", authController.signup);
router.post("/verify", authController.verifyAccount);
router.post("/login", authController.login);

// Reset Password
router.post("/forgotPassword", passwordController.forgotPassword);
router.post("/verifyResetCode", passwordController.verifyPassResetCode);
router.patch("/resetPassword", passwordController.resetPassword);

router.get("/approve-contact/:token", contactController.acceptTrustedContact);

// --- Protected Routes ---
router.use(authMiddleware.protect);

router.post("/add-contact", contactController.addTrustedContact);

module.exports = router;
