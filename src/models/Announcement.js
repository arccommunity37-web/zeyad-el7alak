// ==========================================
// موديل Announcement: إشعار/تنبيه نصي بيظهر للعملاء - بدون أي وقت بداية أو نهاية
// بيفضل ظاهر "مدى الحياة" لحد ما الأدمن يعدله أو يمسحه بنفسه يدويًا
// isActive بتدي الأدمن خيار إضافي: يقدر "يخفيه" مؤقتًا من غير ما يمسحه نهائي
// ==========================================

const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: [true, "نص الإشعار مطلوب"],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Announcement", announcementSchema);