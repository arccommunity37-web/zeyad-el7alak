// ==========================================
// موديل Announcement: إعلان/تنبيه بيظهر للعملاء في فترة زمنية محددة بس (من تاريخ لتاريخ)
// مثال: "المحل هيبقى مقفول يوم 10 فبراير من الساعة 10 بالليل لحد 10 الصبح"
// ==========================================

const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: [true, "نص الإشعار مطلوب"],
      trim: true,
    },
    startAt: {
      type: Date,
      required: [true, "وقت بداية ظهور الإشعار مطلوب"],
    },
    endAt: {
      type: Date,
      required: [true, "وقت نهاية ظهور الإشعار مطلوب"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Announcement", announcementSchema);