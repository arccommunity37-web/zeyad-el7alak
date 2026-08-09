// ==========================================
// موديل Booking: بيمثل حجز - وبيدعم وضعين مختلفين حسب "طريقة الحجز الفعلية لليوم":
//
// وضع "الدور" (queue): بيتملى حقل turn بس
// وضع "الوقت" (time): بيتملى إما startTime، أو isWaiting+waitingPosition
//
// كمان بيدعم كلمة سر اختيارية (cancelPassword) - لو العميل حطها وقت الحجز، بيحتاجها
// لو حب يعدل أو يلغي حجزه بنفسه بعدين. لو ماحطهاش، أي تعديل/إلغاء ذاتي بيبقى بس برقم التليفون
// ==========================================

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const bookingSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    customerName: {
      type: String,
      required: [true, "اسم العميل مطلوب"],
      trim: true,
    },
    customerPhone: {
      type: String,
      required: [true, "رقم تليفون العميل مطلوب"],
      trim: true,
    },
    // كلمة سر اختيارية بيحددها العميل وقت الحجز - مشفرة زي أي باسورد عادي
    cancelPassword: {
      type: String,
      select: false, // ما ترجعش في أي رد عادي خالص
      default: null,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    services: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        required: true,
      },
    ],
    date: {
      type: Date,
      required: [true, "تاريخ الحجز مطلوب"],
    },

    turn: { type: Number, default: null },
    startTime: { type: String, default: null },
    // وقت نهاية المعاد - بيتحسب ويتخزن وقت الحجز (startTime + مدة الحجز وقتها)
    // بنخزنه بدل ما نحسبه كل مرة، عشان يفضل ثابت حتى لو مدة الحجز في الإعدادات اتغيرت بعدين
    endTime: { type: String, default: null },
    isWaiting: { type: Boolean, default: false },
    waitingPosition: { type: Number, default: null },

    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// بنشفر كلمة سر الإلغاء قبل الحفظ - بس لو فيها قيمة أصلاً واتغيرت
bookingSchema.pre("save", async function (next) {
  if (!this.cancelPassword || !this.isModified("cancelPassword")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.cancelPassword = await bcrypt.hash(this.cancelPassword, salt);
  next();
});

// مقارنة كلمة سر الإلغاء
bookingSchema.methods.compareCancelPassword = async function (enteredPassword) {
  if (!this.cancelPassword) return false;
  return await bcrypt.compare(enteredPassword, this.cancelPassword);
};

module.exports = mongoose.model("Booking", bookingSchema);