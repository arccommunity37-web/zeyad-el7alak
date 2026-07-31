// ==========================================
// موديل Booking: بيمثل حجز موعد (عميل + حلاق + خدمة/خدمات + وقت معين)
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
    startTime: {
      type: String, // بصيغة "HH:mm" زي "14:30"
      required: [true, "وقت بداية الحجز مطلوب"],
    },
    endTime: {
      type: String, // بيتحسب تلقائيًا في الـ Service Layer بناءً على مدة الخدمات
      required: true,
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
