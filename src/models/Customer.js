// ==========================================
// موديل Customer: بيمثل العميل اللي بيطلب خدمة أو يحجز منتج
// مفيش تسجيل دخول للعميل خالص - بيتعرف عليه بس بالاسم ورقم التليفون
// أي عميل بيبعت نفس رقم التليفون تاني، بنستخدم نفس السجل بتاعه (منحدثش الاسم لو اتغير كتابته شوية)
// ==========================================

const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "اسم العميل مطلوب"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "رقم التليفون مطلوب"],
      unique: true, // رقم التليفون هو المعرّف الوحيد للعميل - بيه بس بيقدر يشوف طلباته
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Customer", customerSchema);