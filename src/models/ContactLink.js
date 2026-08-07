// ==========================================
// موديل ContactLink: لينك أو رقم بيضيفه الأدمن ويظهر للعملاء (جروب واتساب، إنستا باي، فيسبوك...)
// كل عنصر ليه نوع، عنوان، القيمة (لينك أو رقم)، وصورة بروفايل اختيارية
// ==========================================

const mongoose = require("mongoose");

const contactLinkSchema = new mongoose.Schema(
  {
    // نوع العنصر - نص حر يحدده الأدمن (مثلاً: "جروب واتساب"، "إنستا باي"، "فيسبوك"...)
    type: {
      type: String,
      required: [true, "نوع العنصر مطلوب"],
      trim: true,
    },
    title: {
      type: String,
      required: [true, "العنوان مطلوب"],
      trim: true,
    },
    // اللينك أو الرقم نفسه
    value: {
      type: String,
      required: [true, "اللينك أو الرقم مطلوب"],
      trim: true,
    },
    // صورة بروفايل اختيارية للعنصر ده
    image: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    // ترتيب الظهور (رقم أصغر = يظهر الأول)
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ContactLink", contactLinkSchema);