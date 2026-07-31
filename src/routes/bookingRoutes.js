// ==========================================
// راوتس الحجوزات - كلها محتاجة تسجيل دخول (عميل أو موظف أو أدمن)
// ==========================================

const express = require("express");
const router = express.Router();
const {
  createBooking,
  getBookings,
  updateBookingStatus,
  getAvailableSlots,
} = require("../controllers/bookingController");
const { protect } = require("../middlewares/authMiddleware");

// مهم: لازم "available-slots" يتحط قبل أي راوت فيه "/:id" عشان إكسبريس ميفهمهاش غلط
router.get("/available-slots", protect, getAvailableSlots);

router.post("/", protect, createBooking);
router.get("/", protect, getBookings);
router.put("/:id/status", protect, updateBookingStatus);

module.exports = router;
