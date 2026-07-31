// ==========================================
// دالة مساعدة بسيطة: بتاخد الـ id بتاع المستخدم ونوعه (userType)
// وترجع JWT Token موقّع، هنستخدمه في تسجيل الدخول والتسجيل
// ==========================================

const jwt = require("jsonwebtoken");

/**
 * بتنشئ توكن JWT
 * @param {string} id - الـ id بتاع المستخدم أو العميل في قاعدة البيانات
 * @param {string} userType - نوع الحساب: "user" (أدمن/موظف) أو "customer" (عميل)
 * @returns {string} التوكن الموقّع
 */
const generateToken = (id, userType) => {
  // بنحط جوه التوكن الـ id والنوع، عشان نقدر نميز بعدين مين ده وقت التحقق منه
  return jwt.sign({ id, userType }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

module.exports = generateToken;
