// ==========================================
// دالة مساعدة بسيطة: بتاخد id الأدمن وترجع JWT Token موقّع
// (التوكن دلوقتي مستخدم بس للأدمن، لأنه الوحيد اللي بيسجل دخول في النظام)
// ==========================================

const jwt = require("jsonwebtoken");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

module.exports = generateToken;