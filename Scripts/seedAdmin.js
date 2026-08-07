// ==========================================
// السكريبت ده بتشغله مرة واحدة بس من التيرمينال (مش endpoint في الـ API)
// وظيفته: يعمل حساب أدمن جاهز في قاعدة البيانات مباشرة بدون المرور بأي راوت
// يوزر نيم: Admin | باسورد: Admin123
// (ملحوظة: يوزر نيم/باسورد أساسي تاني Abdo/Abdo123 بيشتغل دايمًا زيادة عن ده - شوف authController.js)
// ==========================================

require("dotenv").config();
const connectDB = require("../src/config/db");
const User = require("../src/models/User");

const seedAdmin = async () => {
  await connectDB();

  const adminUsername = "admin";

  const existingAdmin = await User.findOne({ username: adminUsername });

  if (existingAdmin) {
    console.log("⚠️  فيه حساب أدمن باليوزر نيم ده موجود بالفعل، مفيش داعي نعمله تاني");
    process.exit(0);
  }

  await User.create({
    name: "Admin",
    username: adminUsername,
    phone: "00000000000",
    password: "Admin123",
    role: "admin",
  });

  console.log("✅ تم إنشاء حساب الأدمن بنجاح");
  console.log("   يوزر نيم: Admin");
  console.log("   الباسورد: Admin123");
  console.log("⚠️  متنساش تغيّر الباسورد ده بعد أول تسجيل دخول لأمانك");

  process.exit(0);
};

seedAdmin().catch((error) => {
  console.error("❌ حصل خطأ أثناء إنشاء الأدمن:", error.message);
  process.exit(1);
});