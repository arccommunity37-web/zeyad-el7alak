// ==========================================
// راوتس المبيعات ونقطة البيع - أدمن أو موظف بس (العميل مش المفروض يعمل فاتورة بنفسه)
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
const { authorize } = require("../middlewares/roleMiddleware");

// مهم: راوتس التقارير لازم تتحط قبل أي راوت فيه "/:id" (مفيش هنا فعليًا، بس بنحافظ على العادة الصح)
router.get("/reports/daily", protect, authorize("admin"), getDailyReport);
router.get("/reports/monthly", protect, authorize("admin"), getMonthlyReport);

router.post("/", protect, authorize("admin", "employee"), createSale);
router.get("/", protect, authorize("admin", "employee"), getSales);

module.exports = router;
