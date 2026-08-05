// ==========================================
// الملف ده بيجهز تطبيق Express: الميدلويرز العامة، وربط كل الراوتس ببعض
// ده منفصل عن server.js عشان لو حبينا نعمل اختبارات (tests) بعدين، نقدر نستورد app لوحده من غير ما نشغل السيرفر فعليًا
// ==========================================

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const styleRoutes = require("./routes/styleRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const productRoutes = require("./routes/productRoutes");
const reservationRoutes = require("./routes/reservationRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const saleRoutes = require("./routes/saleRoutes");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

// ---------- الميدلويرز العامة (بتشتغل على كل طلب بيجي للسيرفر) ----------

// بنقرأ رابط الفرونت اند المسموح له يكلم الباك اند من متغيرات البيئة
// (ممكن نحط أكتر من رابط مفصولين بفاصلة، زي لوكال + الدومين بتاع الإنتاج)
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",")
  .map((url) => url.trim());

// cors بيسمح للموقع (Frontend) اللي شغال على دومين مختلف إنه يكلم الباك اند
// credentials: true ضروري عشان نقدر نبعت ونستقبل httpOnly cookies بين دومينين مختلفين
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// cookieParser بيخلي إكسبريس يقدر يقرا الكوكيز اللي جاية مع الطلب (req.cookies)
app.use(cookieParser());

// express.json() بيخلي إكسبريس يفهم البيانات اللي جاية بصيغة JSON في body الطلب
app.use(express.json());

// morgan بيطبع لوج بسيط لكل طلب بيوصل السيرفر (مفيد جدًا وقت التطوير عشان تتابع اللي بيحصل)
app.use(morgan("dev"));

// ---------- ربط الراوتس ----------
// كل مجموعة راوتس بناخدها تحت مسار (prefix) خاص بيها
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/styles", styleRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/products", productRoutes);
app.use("/api/product-reservations", reservationRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/settings", settingsRoutes);

// راوت بسيط للتأكد إن السيرفر شغال (مفيد تجربه في المتصفح مباشرة)
app.get("/", (req, res) => {
  res.json({ message: "🚀 السيرفر شغال تمام! Barbershop Backend API" });
});

// لو حد طلب مسار مش موجود أصلاً، نرجعله 404 واضحة بدل خطأ غامض
app.use((req, res) => {
  res.status(404).json({ message: "المسار غير موجود" });
});

// الميدلوير ده لازم يتحط في الآخر خالص - بيمسك أي خطأ حصل في أي حتة فوق
app.use(errorHandler);

module.exports = app;