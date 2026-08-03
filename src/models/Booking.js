// ==========================================
// موديل Booking: بيمثل حجز (عميل + حلاق + خدمة/خدمات + يوم + دور في الطابور)
// مفيش وقت محدد خالص - العميل بياخد رقم دور (queueNumber) في يوم معين مع حلاق معين
// ==========================================

const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // الحلاق اللي هيقدم الخدمة
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
    // رقم دور العميل في الطابور بتاع نفس الحلاق في نفس اليوم ده (1، 2، 3...)
    // بيتحسب تلقائيًا في الكنترولر وقت إنشاء الحجز
    queueNumber: {
      type: Number,
      required: true,
      min: 1,
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