// ==========================================
// موديل Service: بيمثل الخدمة اللي المحل بيقدمها (حلاقة، صبغة، حمام كريم...)
// ==========================================

const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "اسم الخدمة مطلوب"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: [true, "سعر الخدمة مطلوب"],
      min: [0, "السعر مينفعش يكون بالسالب"],
    },
    durationInMinutes: {
      type: Number,
      required: [true, "مدة الخدمة بالدقايق مطلوبة"],
      min: [1, "المدة لازم تكون دقيقة على الأقل"],
    },
    isActive: {
      type: Boolean,
      default: true, // ممكن الأدمن يوقف خدمة مؤقتًا بدل ما يمسحها
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", serviceSchema);
