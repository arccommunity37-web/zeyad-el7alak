// ==========================================
// موديل ProductReservation: بيمثل حجز منتج معين من قبل العميل
// (العميل بيحجز، وبعدين ييجي المحل يستلم ويدفع كاش)
// ==========================================

const mongoose = require("mongoose");

const productReservationSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: [true, "الكمية المطلوبة مطلوبة"],
      min: [1, "لازم تحجز قطعة واحدة على الأقل"],
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "picked_up", "cancelled"],
      default: "pending",
    },
    // المهلة اللي لو العميل ماجاش يستلم فيها، الحجز بيتلغي تلقائيًا
    reservedUntil: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProductReservation", productReservationSchema);
