// ==========================================
// راوتس التوثيق - كله بتاع الأدمن بس (مفيش تسجيل دخول عملاء أو حلاقين خالص)
// جلسة الدخول دلوقتي بـ httpOnly cookie بدل التوكن في localStorage
// ==========================================

const express = require("express");
const router = express.Router();
const { registerUser, login, logout, getMe } = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");
const guardUserRegistration = require("../middlewares/guardUserRegistration");

// تسجيل أدمن جديد (أول مرة بس مفتوح) أو إضافة حلاق جديد (بعد كده لازم تكون أدمن)
router.post("/register-user", guardUserRegistration, registerUser);

// تسجيل دخول الأدمن - بيحط httpOnly cookie
router.post("/login", login);

// تسجيل الخروج - بيمسح الكوكي
router.post("/logout", logout);

// بيانات الأدمن الحالي
router.get("/me", protect, getMe);

module.exports = router;