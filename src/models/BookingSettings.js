// ==========================================
// موديل BookingSettings: إعدادات الحجز العامة للمحل كله (وثيقة واحدة بس - Singleton)
// الأدمن بيتحكم من هنا: طريقة الحجز (دور/وقت)، حد الأدوار، سعة قايمة الانتظار،
// ومواعيد عمل المحل الأساسية + مدة الحجز الواحد (دول بقوا إعداد عام للمحل كله، مش لكل حلاق)
// ==========================================

const mongoose = require("mongoose");

const bookingSettingsSchema = new mongoose.Schema(
  {
    // طريقة الحجز المستخدمة في المحل كله دلوقتي
    mode: {
      type: String,
      enum: ["queue", "time"], // queue = دور بس | time = وقت محدد
      default: "queue",
    },
    // في وضع "الدور": هل فيه حد أقصى لعدد الأدوار في اليوم لكل حلاق؟
    queueLimitEnabled: {
      type: Boolean,
      default: false, // false = عدد لا نهائي
    },
    // الحد الأقصى لعدد الأدوار في اليوم الواحد لكل حلاق (مستخدم بس لو queueLimitEnabled=true)
    queueLimit: {
      type: Number,
      default: 20,
      min: 1,
    },
    // في وضع "الوقت": سعة قايمة الانتظار (كام مقعد انتظار متاح) لكل حلاق في اليوم
    waitingListCapacity: {
      type: Number,
      default: 5,
      min: 0,
    },
    // مواعيد عمل المحل الأساسية (إعداد عام واحد للمحل كله) - مستخدمة في وضع "الوقت"
    workingHoursFrom: {
      type: String,
      default: "10:00",
    },
    workingHoursTo: {
      type: String,
      default: "22:00",
    },
    // مدة الحجز الواحد بالدقايق (إعداد عام واحد للمحل كله) - مستخدمة في وضع "الوقت"
    slotDurationMinutes: {
      type: Number,
      default: 30,
      min: [5, "مدة الحجز لازم تكون 5 دقايق على الأقل"],
    },
    // هل الحجز متوقف اليوم؟ (لو الأدمن وقفه يدويا)
    isBookingPaused: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BookingSettings", bookingSettingsSchema);