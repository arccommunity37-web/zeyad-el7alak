// ==========================================
// موديل Product: بيمثل أي منتج بيتباع أو بيتستخدم في المحل (شامبو، كريم، أدوات...)
// ==========================================

const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "اسم المنتج مطلوب"],
      trim: true,
    },
    category: {
      type: String,
      default: "عام",
    },
    costPrice: {
      type: Number,
      required: [true, "سعر الشراء مطلوب"],
      min: 0,
    },
    sellingPrice: {
      type: Number,
      required: [true, "سعر البيع مطلوب"],
      min: 0,
    },
    quantityInStock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "الكمية مينفعش تكون سالبة"],
    },
    minStockAlert: {
      type: Number,
      default: 5, // لو الكمية قلّت عن الرقم ده، هيظهر تنبيه
    },
    unit: {
      type: String,
      default: "قطعة",
    },
    // صورة المنتج بعد رفعها على Cloudinary
    image: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    // هل العميل يقدر يحجز المنتج ده مقدمًا قبل ما ييجي المحل؟
    isAvailableForCustomerReservation: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
