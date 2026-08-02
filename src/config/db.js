// ==========================================
// الملف ده مسؤول عن حاجة واحدة بس: الاتصال بقاعدة بيانات MongoDB
// بنستخدم Mongoose عشان يسهل علينا التعامل مع الداتا بيز
// ==========================================

const mongoose = require("mongoose");

// الفانكشن دي بتحاول تعمل اتصال بقاعدة البيانات باستخدام الرابط اللي في ملف .env
const connectDB = async () => {
  try {
    // بنحدد مهلة أطول شوية لاختيار السيرفر (15 ثانية بدل الافتراضي)
    // عشان بيئات الـ Serverless زي Vercel أحيانًا بتاخد وقت أطول شوية في أول اتصال (Cold Start)
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
    });

    // لو الاتصال نجح، بنطبع رسالة فيها اسم السيرفر اللي اتوصلنا بيه (مفيد وقت التطوير)
    console.log(`✅ MongoDB متصلة بنجاح: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    // لو حصل أي خطأ في الاتصال (مثلاً الرابط غلط أو الباسورد غلط أو الشبكة ماسمحتش)
    console.error(`❌ فشل الاتصال بقاعدة البيانات: ${error.message}`);

    // ملحوظة مهمة: هنا مبنعملش process.exit(1) زي الأول
    // لأن process.exit بيقفل العملية كلها فورًا، وده خطر في بيئة Serverless (زي Vercel)
    // ممكن يوقف طلبات تانية شغالة في نفس اللحظة على نفس الـ instance
    // بدل كده، بنرمي الخطأ عشان اللي نادى الفانكشن (server.js أو api/index.js) يقرر هو يتعامل معاه إزاي
    throw error;
  }
};

module.exports = connectDB;