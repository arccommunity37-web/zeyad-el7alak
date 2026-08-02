// ==========================================
// الملف ده هو نقطة الدخول اللي Vercel بيشغل الباك اند من خلالها
// مختلف عن server.js: مفيش app.listen() هنا، لأن Vercel بيشغل الكود
// كـ "دالة" بتتنفذ مع كل طلب (Serverless) مش سيرفر شغال طول الوقت
// ==========================================

require("dotenv").config();
const app = require("../src/app");
const connectDB = require("../src/config/db");

// بنستخدم متغير بره الدالة عشان نحافظ على الاتصال بقاعدة البيانات
// بين الطلبات المتتالية (لو نفس "النسخة" من الفانكشن لسه شغالة)، بدل ما نتصل من جديد كل مرة
let isConnected = false;

module.exports = async (req, res) => {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }

  // بعد ما نتأكد إن قاعدة البيانات متوصلة، بنسيب تطبيق Express العادي يتعامل مع الطلب
  return app(req, res);
};