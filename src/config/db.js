// ==========================================
// الملف ده مسؤول عن حاجة واحدة بس: الاتصال بقاعدة بيانات MongoDB
// بنستخدم Mongoose عشان يسهل علينا التعامل مع الداتا بيز
//
// ⚡ تعديل مهم لتحسين السرعة في بيئة Serverless (زي Vercel):
// من غير الكاش ده، كل طلب (API call) بيوصل للسيرفر كان بيحاول يفتح اتصال
// جديد بالكامل بقاعدة البيانات من الصفر - وده اللي كان بيسبب الإحساس بالبطء
// في كل ضغطة، حتى لو السيرفر مش "نايم" أصلاً.
//
// الحل: بنحتفظ بالاتصال في متغير عام (global) طول ما الـ instance بتاعت
// Vercel لسه شغالة، وأي طلب جديد بيستخدم نفس الاتصال المفتوح بدل ما يفتح
// واحد جديد - ده اللي بيقلل زمن الاستجابة بشكل ملموس
// ==========================================

const mongoose = require("mongoose");

// بنستخدم global عشان القيمة تفضل موجودة بين استدعاءات الفانكشن المختلفة
// (في بيئة Serverless، الملف ده ممكن "يتحمل" أكتر من مرة، فـ global بيضمن
// إننا مش بنبدأ من الصفر كل مرة طول ما نفس الـ instance شغالة)
let cached = global.__mongooseConnection;

if (!cached) {
  cached = global.__mongooseConnection = { conn: null, promise: null };
}

// الفانكشن دي بتحاول تعمل اتصال بقاعدة البيانات باستخدام الرابط اللي في ملف .env
const connectDB = async () => {
  // لو عندنا اتصال جاهز ومخزن بالفعل، استخدمه على طول من غير أي محاولة اتصال جديدة
  if (cached.conn) {
    return cached.conn;
  }

  // لو مفيش اتصال جاهز، بس فيه "وعد" (promise) لاتصال شغال بالفعل (طلب تاني
  // وصل في نفس اللحظة وبدأ يتصل)، ننتظر نفس الاتصال ده بدل ما نبدأ اتنين مع بعض
  if (!cached.promise) {
    const options = {
      // بنحدد مهلة أطول شوية لاختيار السيرفر (15 ثانية بدل الافتراضي)
      // عشان بيئات الـ Serverless زي Vercel أحيانًا بتاخد وقت أطول شوية في أول اتصال (Cold Start)
      serverSelectionTimeoutMS: 15000,
      // بيمنع mongoose إنه "يصف" العمليات وينتظر لو الاتصال مش جاهز - نفضل نرمي
      // خطأ واضح بدل ما الطلب يستنى صامت لحد ما يعدي الـ timeout
      bufferCommands: false,
      // بيحدد أقصى عدد اتصالات مفتوحة في نفس الوقت - رقم معقول لمشروع صغير/متوسط
      maxPoolSize: 10,
    };

    cached.promise = mongoose.connect(process.env.MONGO_URI, options).then((mongooseInstance) => {
      console.log(`✅ MongoDB متصلة بنجاح: ${mongooseInstance.connection.host}`);

      // 🔧 تنظيف: مسح الفهرس الفريد القديم email_1 إن وجد لمنع خطأ E11000 عند إضافة حلاق بدون إيميل
      mongooseInstance.connection.collection("users").dropIndex("email_1").catch(() => {});

      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    // لو فشل الاتصال، بنصفّر الـ promise عشان المحاولة الجاية تبدأ من جديد
    // بدل ما تفضل عالقة على وعد فاشل للأبد
    cached.promise = null;

    // لو حصل أي خطأ في الاتصال (مثلاً الرابط غلط أو الباسورد غلط أو الشبكة ماسمحتش)
    console.error(`❌ فشل الاتصال بقاعدة البيانات: ${error.message}`);

    // ملحوظة مهمة: هنا مبنعملش process.exit(1) زي الأول
    // لأن process.exit بيقفل العملية كلها فورًا، وده خطر في بيئة Serverless (زي Vercel)
    // ممكن يوقف طلبات تانية شغالة في نفس اللحظة على نفس الـ instance
    // بدل كده، بنرمي الخطأ عشان اللي نادى الفانكشن (server.js أو api/index.js) يقرر هو يتعامل معاه إزاي
    throw error;
  }

  return cached.conn;
};

module.exports = connectDB;