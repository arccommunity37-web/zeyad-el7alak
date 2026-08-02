// ==========================================
// راوتس التوثيق - دلوقتي كله بتاع الأدمن بس (مفيش تسجيل دخول عملاء أو حلاقين خالص)
// ==========================================

const express = require("express");
const router = express.Router();
const { registerUser, login, getMe } = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");
const guardUserRegistration = require("../middlewares/guardUserRegistration");

// تسجيل أدمن جديد (أول مرة بس مفتوح) أو إضافة حلاق جديد (بعد كده لازم تكون أدمن)
router.post("/register-user", guardUserRegistration, registerUser);

// تسجيل دخول الأدمن
router.post("/login", login);

// بيانات الأدمن الحالي
router.get("/me", protect, getMe);

module.exports = router;