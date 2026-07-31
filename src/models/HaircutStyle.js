// ==========================================
// موديل HaircutStyle: بيمثل "قصة" معينة بصورها، عشان العميل يشوف كتالوج قصات
// قبل ما يحجز، ويختار الشكل اللي عاجبه
// ==========================================

const mongoose = require("mongoose");

const haircutStyleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "اسم القصة مطلوب"],
      trim: true,
    },
    // مصفوفة من روابط الصور (URLs) بعد ما بترفع على Cloudinary
    // بنخزن كل صورة كـ object فيه الرابط + الـ public_id (مهم لو حبينا نمسح الصورة بعدين من Cloudinary)
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],
    relatedService: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service", // ربط اختياري بالخدمة اللي القصة دي بتتعمل من ضمنها
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // مين الحلاق/الأدمن اللي ضاف القصة دي
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("HaircutStyle", haircutStyleSchema);
