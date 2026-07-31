// ==========================================
// موديل StockMovement: بيسجل كل حركة دخول أو خروج للمخزون
// ده مفيد جدًا عشان تعرف تاريخ أي منتج: اتباع امتى؟ اتشترى امتى؟ بكام؟
// ==========================================

const mongoose = require("mongoose");

const stockMovementSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    type: {
      type: String,
      enum: ["in", "out"], // in = دخول بضاعة جديدة | out = خروج (بيع أو تالف)
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    reason: {
      type: String,
      default: "", // مثلاً: "بيع"، "شراء جديد"، "تالف"، "حجز عميل"
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StockMovement", stockMovementSchema);
