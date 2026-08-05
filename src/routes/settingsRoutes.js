// ==========================================
// راوتس إعدادات الحجز: العرض Public (العميل محتاجها يحدد شكل الواجهة)، التعديل أدمن بس
// ==========================================

const express = require("express");
const router = express.Router();
const { getBookingSettings, updateBookingSettings } = require("../controllers/settingsController");
const { protect } = require("../middlewares/authMiddleware");

router.get("/booking", getBookingSettings); // Public
router.put("/booking", protect, updateBookingSettings); // أدمن بس

module.exports = router;