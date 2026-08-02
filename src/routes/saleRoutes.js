// ==========================================
// راوتس المبيعات ونقطة البيع - أدمن بس (مفيش تسجيل دخول حلاقين خالص دلوقتي)
// ==========================================

const express = require("express");
const router = express.Router();
const {
  createSale,
  getSales,
  getDailyReport,
  getMonthlyReport,
} = require("../controllers/saleController");
const { protect } = require("../middlewares/authMiddleware");

router.get("/reports/daily", protect, getDailyReport);
router.get("/reports/monthly", protect, getMonthlyReport);

router.post("/", protect, createSale);
router.get("/", protect, getSales);

module.exports = router;