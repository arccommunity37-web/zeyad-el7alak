// ==========================================
// الميدلوير ده مسؤول عن استقبال الصور من الطلب (multipart/form-data)
// وتخزينها مؤقتًا في الذاكرة (memory) قبل ما نرفعها على Cloudinary
// ==========================================

const multer = require("multer");

// بنستخدم memoryStorage عشان الصورة تفضل في الـ RAM كـ buffer
// وبعدين نبعتها لـ Cloudinary مباشرة من غير ما نحفظها كملف على السيرفر نفسه
const storage = multer.memoryStorage();

// فانكشن بتتأكد إن الملف المرفوع صورة فعلاً (jpg/png/jpeg) مش أي نوع ملف تاني
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true); // الملف مقبول
  } else {
    // الملف مرفوض - بنرجع خطأ واضح
    cb(new Error("الملف لازم يكون صورة بصيغة jpg أو png أو webp فقط"), false);
  }
};

// بنجهز الـ upload instance بحدود معينة:
// - حجم أقصى للصورة الواحدة: 5 ميجا
// - فلتر النوع اللي عرفناه فوق
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB بالبايت
  fileFilter,
});

module.exports = upload;
