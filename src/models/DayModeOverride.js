// ==========================================
// موديل DayModeOverride: إعدادات مخصصة ليوم معين بالذات - كل حقل هنا اختياري
// لو الحقل مش موجود لليوم ده، النظام بيرجع يستخدم الإعداد العام (BookingSettings) بدله
//
// يعني كل يوم ممكن يكون ليه: طريقة حجز مختلفة (دور/وقت)، حد أدوار مختلف، مواعيد شغل مختلفة،
// مدة حجز مختلفة، أو يتقفل بالكامل - كل واحدة مستقلة عن التانية
// ==========================================

const mongoose = require("mongoose");

const dayModeOverrideSchema = new mongoose.Schema(
  {
    dateKey: {
      type: String,
      required: true,
      unique: true, // يوم واحد بس ممكن يكون ليه سجل استثناء واحد
    },
    mode: {
      type: String,
      enum: ["queue", "time"],
      default: null, // null = استخدم الوضع العام
    },
    isClosed: {
      type: Boolean,
      default: false,
    },
    // ---------- إعدادات وضع "الدور" الخاصة باليوم ده (اختيارية) ----------
    queueLimitEnabled: {
      type: Boolean,
      default: null, // null = استخدم الإعداد العام
    },
    queueLimit: {
      type: Number,
      default: null,
    },
    // ---------- إعدادات وضع "الوقت" الخاصة باليوم ده (اختيارية) ----------
    workingHoursFrom: {
      type: String,
      default: null,
    },
    workingHoursTo: {
      type: String,
      default: null,
    },
    // مدة الموعد الواحد المخصصة لهذا اليوم (في وضع الوقت)
    slotDurationMinutes: {
      type: Number,
      default: null,
      min: 5,
    },

    // سعة قائمة الانتظار لهذا اليوم (في وضع الوقت)
    waitingListCapacity: {
      type: Number,
      default: null,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DayModeOverride", dayModeOverrideSchema);