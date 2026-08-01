// ==========================================
// السكريبت ده بتشغله مرة واحدة بس من التيرمينال (مش endpoint في الـ API)
// وظيفته: يعمل حساب أدمن جاهز في قاعدة البيانات مباشرة بدون المرور بأي راوت
// يوزر نيم: Admin | باسورد: Admin123
// ==========================================

require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const User = require("../src/models/User");

const seedAdmin = async () => {
  await connectDB();

  // بنستخدم الإيميل بحروف صغيرة عشان كده بالظبط بيتخزن (الموديل بيحول لـ lowercase تلقائيًا)
  const adminEmail = "admin";

  // بنتأكد الأول إن مفيش حساب بنفس الإيميل ده قبل كده، عشان منكررش نفس الحساب كل ما نشغل السكريبت
  const existingAdmin = await User.findOne({ email: adminEmail });

  if (existingAdmin) {
    console.log("⚠️  فيه حساب أدمن بالإيميل ده موجود بالفعل، مفيش داعي نعمله تاني");
    process.exit(0);
  }

  // بننشئ الأدمن - الباسورد هيتشفر تلقائيًا بسبب الـ pre-save hook في موديل User
  await User.create({
    name: "Admin",
    email: adminEmail,
    phone: "00000000000", // رقم مؤقت - تقدر تغيره بعدين من صفحة تعديل بيانات الموظف
    password: "Admin123",
    role: "admin",
  });

  console.log("✅ تم إنشاء حساب الأدمن بنجاح");
  console.log("   يوزر نيم (الإيميل): Admin");
  console.log("   الباسورد: Admin123");
  console.log("⚠️  متنساش تغيّر الباسورد ده بعد أول تسجيل دخول لأمانك");

  process.exit(0);
};

seedAdmin().catch((error) => {
  console.error("❌ حصل خطأ أثناء إنشاء الأدمن:", error.message);
  process.exit(1);
});