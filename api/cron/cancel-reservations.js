// ==========================================
// الملف ده بديل لـ node-cron (اللي كان في server.js) عشان Vercel معندوش "سيرفر شغال طول الوقت"
// يقدر يجدول مهام دورية عليه
// بدل كده، Vercel بينادي الرابط ده بنفسه على معاد يومي محدد في ملف vercel.json
// وظيفته: يلغي أي حجز منتج فات ميعاد استلامه، ويرجع الكمية للمخزون تلقائيًا
// ==========================================

require("dotenv").config();
const connectDB = require("../../src/config/db");
const { cancelExpiredReservations } = require("../../src/controllers/reservationController");

let isConnected = false;

module.exports = async (req, res) => {
  try {
    if (!isConnected) {
      await connectDB();
      isConnected = true;
    }

    await cancelExpiredReservations();
    res.status(200).json({ message: "تم فحص وإلغاء الحجوزات المنتهية بنجاح" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};