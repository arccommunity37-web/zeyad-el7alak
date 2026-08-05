// ==========================================
// راوتس إعدادات الحجز: العرض Public (العميل محتاجها يحدد شكل الواجهة)، التعديل أدمن بس
// ==========================================

const express = require("express");
const router = express.Router();
const {
  getBookingSettings,
  updateBookingSettings,
  getEffectiveMode,
  setDayOverride,
  deleteDayOverride,
  getAllDayOverrides,
} = require("../controllers/settingsController");
const { protect } = require("../middlewares/authMiddleware");

// الإعدادات العامة للمحل
router.get("/booking", getBookingSettings); // Public
router.put("/booking", protect, updateBookingSettings); // أدمن بس

// طريقة الحجز الفعلية ليوم معين (بتاخد في الاعتبار أي استثناء مضبوط)
router.get("/booking/effective", getEffectiveMode); // Public

// استثناءات طريقة الحجز لأيام محددة
router.get("/booking/day-overrides", protect, getAllDayOverrides); // أدمن بس
router.put("/booking/day-override", protect, setDayOverride); // أدمن بس
router.delete("/booking/day-override/:date", protect, deleteDayOverride); // أدمن بس

module.exports = router;