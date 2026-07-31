// ==========================================
// الراوت ده بيربط كل مسارات (URLs) التوثيق بالـ controller المسؤول عنها
// ==========================================

const express = require("express");
const router = express.Router();
const { registerUser, registerCustomer, login, getMe } = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");

// تسجيل موظف/أدمن جديد (مفروض يتحمي بعدين بصلاحية admin بس، هنسيبها مفتوحة دلوقتي للتجربة الأولى)
router.post("/register-user", registerUser);

// تسجيل عميل جديد - مفتوح لأي حد
router.post("/register-customer", registerCustomer);

// تسجيل الدخول - لأي نوع حساب
router.post("/login", login);

// جلب بيانات صاحب التوكن الحالي - محتاج تسجيل دخول (protect)
router.get("/me", protect, getMe);

module.exports = router;
