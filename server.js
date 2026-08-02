// ==========================================
// الملف ده هو نقطة انطلاق المشروع كله: بيحمل متغيرات البيئة، يوصل قاعدة البيانات،
// يشغل السيرفر، ويجدول مهمة دورية لإلغاء حجوزات المنتجات المنتهية الصلاحية
// ==========================================

// dotenv.config() بيقرأ ملف .env ويحط القيم اللي فيه جوه process.env
require("dotenv").config();

const cron = require("node-cron");
const app = require("./src/app");
const connectDB = require("./src/config/db");
const { cancelExpiredReservations } = require("./src/controllers/reservationController");

const PORT = process.env.PORT || 5000;

// فانكشن رئيسية بتشغل كل حاجة بالترتيب الصحيح
const startServer = async () => {
  try {
    // 1) الاتصال بقاعدة البيانات الأول - مفيش فايدة نشغل السيرفر من غيرها
    await connectDB();
  } catch (error) {
    // لو الاتصال فشل هنا (تشغيل محلي أو على منصة زي Render)، نوقف العملية فعلاً
    // لأن ده تشغيل سيرفر تقليدي شغال طول الوقت، مش Serverless زي Vercel
    console.error("❌ السيرفر مش هيشتغل من غير قاعدة بيانات");
    process.exit(1);
  }

  // 2) تشغيل السيرفر فعليًا على البورت المحدد
  app.listen(PORT, () => {
    console.log(`🚀 السيرفر شغال على البورت ${PORT}`);
  });

  // 3) جدولة مهمة تشتغل كل ساعة (بصيغة cron: "0 * * * *")
  // شغلها: تلغي أي حجز منتج فات ميعاد استلامه، وترجع الكمية للمخزون تلقائيًا
  cron.schedule("0 * * * *", async () => {
    try {
      await cancelExpiredReservations();
    } catch (error) {
      console.error("❌ حصل خطأ أثناء إلغاء الحجوزات المنتهية:", error.message);
    }
  });
};

startServer();