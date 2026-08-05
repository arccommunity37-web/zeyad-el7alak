// ==========================================
// موديل DayModeOverride: بيمثل "استثناء" لطريقة الحجز في يوم معين بالذات
// مثال: الوضع العام للمحل "دور"، بس بعد بكرة الأدمن حدد إنها تبقى "وقت" - بيتسجل هنا كسجل مستقل
// لو مفيش استثناء ليوم معين، النظام بيستخدم الوضع العام (BookingSettings.mode) تلقائيًا
// ==========================================

const mongoose = require("mongoose");

const dayModeOverrideSchema = new mongoose.Schema(
  {
    // بنخزن التاريخ كنص "YYYY-MM-DD" بدل Date عشان نضمن مطابقة دقيقة من غير مشاكل توقيت
    dateKey: {
      type: String,
      required: true,
      unique: true, // يوم واحد بس ممكن يكون ليه استثناء واحد
    },
    mode: {
      type: String,
      enum: ["queue", "time"],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DayModeOverride", dayModeOverrideSchema);