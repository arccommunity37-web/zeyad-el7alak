// ==========================================
// موديل Sale: بيمثل فاتورة بيع (ممكن تحتوي خدمات و/أو منتجات في نفس الفاتورة)
// ==========================================

const mongoose = require("mongoose");

// كل عنصر (item) جوه الفاتورة ممكن يكون خدمة أو منتج
const saleItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["service", "product"],
      required: true,
    },
    refId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      // بيشير لـ Service أو Product حسب الـ type - مش بنعمل ref ثابت هنا
      // لأن النوع بيختلف، وهنعمل populate يدوي وقت الحاجة في الـ Service Layer
    },
    name: {
      type: String,
      required: true, // بنخزن الاسم وقت البيع عشان لو المنتج/الخدمة اتغيرت أو اتمسحت بعدين، الفاتورة تفضل واضحة
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false } // مش محتاجين _id منفصل لكل عنصر جوه الفاتورة
);

const saleSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      // مش required لأن ممكن يكون عميل عابر مسجلش بياناته
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "لازم تحدد الموظف اللي نفذ عملية البيع"],
    },
    items: {
      type: [saleItemSchema],
      required: true,
      validate: {
        // بنتأكد إن الفاتورة مش فاضية، لازم فيها عنصر واحد على الأقل
        validator: (items) => items.length > 0,
        message: "الفاتورة لازم تحتوي على عنصر واحد على الأقل",
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["cash"], // دلوقتي كاش بس، زي ما اتفقنا
      default: "cash",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Sale", saleSchema);
