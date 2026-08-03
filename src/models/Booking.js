// ==========================================
// موديل Booking: بيمثل حجز (عميل + حلاق + خدمة/خدمات + يوم + دور في الطابور)
// مفيش وقت محدد خالص - العميل بياخد رقم دور (turn) في يوم معين مع حلاق معين
//
// ملحوظة: بنخزن اسم ورقم تليفون العميل هنا مباشرة (customerName/customerPhone)
// بالإضافة لربطه بجدول Customer (customer). التكرار ده مقصود:
// - customerName/customerPhone: عشان لوحة تحكم الأدمن تقدر تعرضهم على طول من غير populate
// - customer: عشان نقدر نجمع كل حجوزات نفس العميل ببعض (lookup بالتليفون)
// ==========================================

const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    // اسم ورقم تليفون العميل - مخزنين هنا مباشرة عشان يظهروا فورًا في أي رد من غير populate
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
    turn: {
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