// ==========================================
// راوتس الحجوزات: الحجز والاستعلام Public (بالاسم والتليفون)
// عرض كل الحجوزات وتحديث حالتها للأدمن بس
// ==========================================

const express = require("express");
const router = express.Router();
const {
  createBooking,
  getBookings,
  lookupBookingsByPhone,
  updateBookingStatus,
  getAvailableSlots,
} = require("../controllers/bookingController");
const { protect } = require("../middlewares/authMiddleware");

// مهم: المسارات الثابتة ("available-slots", "lookup") لازم تتحط قبل "/:id"
router.get("/available-slots", getAvailableSlots);
router.get("/lookup", lookupBookingsByPhone);

router.post("/", createBooking); // Public - أي عميل يقدر يحجز بالاسم والتليفون
router.get("/", protect, getBookings); // أدمن بس - لوحة التحكم
router.put("/:id/status", protect, updateBookingStatus); // أدمن بس

module.exports = router;