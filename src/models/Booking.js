// ==========================================
// موديل Booking: بيمثل حجز - وبيدعم وضعين مختلفين حسب إعدادات المحل الحالية (BookingSettings.mode):
//
// وضع "الدور" (queue): بيتملى حقل turn بس (رقم الدور في اليوم ده مع الحلاق ده)
// وضع "الوقت" (time): بيتملى إما startTime (معاد حقيقي)، أو isWaiting+waitingPosition (رقم في قايمة الانتظار)
//
// أي حجز بيتعمل بياخد شكل واحد بس حسب الوضع اللي كان شغال وقتها - مفيش تعارض بين الحقول
// ==========================================

const mongoose = require("mongoose");

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

    // ---------- حقول وضع "الدور" ----------
    // رقم دور العميل في الطابور بتاع نفس الحلاق في نفس اليوم (1، 2، 3...)
    turn: {
      type: Number,
      default: null,
    },

    // ---------- حقول وضع "الوقت" ----------
    // المعاد المحدد (لو العميل حجز معاد حقيقي متاح) - صيغة "HH:mm"
    startTime: {
      type: String,
      default: null,
    },
    // هل الحجز ده في قايمة الانتظار بدل معاد حقيقي؟
    isWaiting: {
      type: Boolean,
      default: false,
    },
    // رقم مكان العميل في قايمة الانتظار (1، 2، 3...) - موجود بس لو isWaiting=true
    waitingPosition: {
      type: Number,
      default: null,
    },

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

module.exports = mongoose.model("Booking", bookingSchema);