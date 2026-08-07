// ==========================================
// السكريبت ده بترجع حساب الأدمن الأول لبياناته الافتراضية (يوزر نيم: Admin | باسورد: Admin123)
// مفيد لو غيّرت البيانات وعايز ترجعها زي الأول، أو لو الحساب القديم كان لسه شغال بنظام الإيميل
// القديم وعايز تظبطه على النظام الجديد (يوزر نيم)
//
// شغّله من التيرمينال بـ: npm run reset:admin
// ==========================================

require("dotenv").config();
const connectDB = require("../src/config/db");
const User = require("../src/models/User");

const resetAdmin = async () => {
  await connectDB();

  // بندور على أول حساب أدمن في النظام (بغض النظر عن بياناته الحالية)
  const primaryAdmin = await User.findOne({ role: "admin" }).sort({ createdAt: 1 });

  if (!primaryAdmin) {
    console.log("⚠️  مفيش أي حساب أدمن في قاعدة البيانات أصلاً - شغّل npm run seed:admin بدل كده");
    process.exit(0);
  }

  // بنرجعه لبياناته الافتراضية - الباسورد هيتشفر تلقائيًا بسبب الـ pre-save hook
  primaryAdmin.username = "admin";
  primaryAdmin.password = "Admin123";
  await primaryAdmin.save();

  console.log("✅ تم إرجاع حساب الأدمن لبياناته الافتراضية بنجاح");
  console.log("   يوزر نيم: Admin");
  console.log("   الباسورد: Admin123");

  process.exit(0);
};

resetAdmin().catch((error) => {
  console.error("❌ حصل خطأ أثناء إرجاع بيانات الأدمن:", error.message);
  process.exit(1);
});