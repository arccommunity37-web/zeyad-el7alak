// ==========================================
// موديل DayModeOverride: بيمثل "استثناء" ليوم معين بالذات - إما تغيير طريقة الحجز (دور/وقت)
// أو قفل اليوم بالكامل (منع أي حجز فيه خالص) أو الاتنين مع بعض
// لو مفيش استثناء ليوم معين، النظام بيستخدم الوضع العام (BookingSettings.mode) واليوم بيكون مفتوح
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
    // اختياري: لو موجودة، بتغيّر طريقة الحجز لليوم ده بس (بدون قفل)
    mode: {
      type: String,
      enum: ["queue", "time"],
      default: null,
    },
    // لو true، اليوم ده مقفول بالكامل - مفيش أي حجز جديد يقدر يتعمل فيه خالص
    isClosed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DayModeOverride", dayModeOverrideSchema);