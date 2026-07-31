// ==========================================
// الملف ده بيهيّئ اتصال Cloudinary (الخدمة اللي هنرفع عليها صور القصات والمنتجات)
// أي ملف تاني في المشروع محتاج يرفع صورة، هيستورد الإعداد ده ويستخدمه
// ==========================================

const cloudinary = require("cloudinary").v2;

// بنظبط بيانات الحساب من متغيرات البيئة (.env)
// عشان محدش يشوف الـ API Secret بتاعنا وهو مكتوب في الكود مباشرة
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;
