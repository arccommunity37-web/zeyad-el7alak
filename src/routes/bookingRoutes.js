// ==========================================
// راوتس الحجوزات: الحجز والاستعلام Public (بالاسم والتليفون)
// بتدعم وضعين: دور (queue) ووقت محدد (time) - حسب إعدادات المحل الحالية
// عرض/تحديث/حذف الحجوزات للأدمن بس
// ==========================================

const express = require("express");
const router = express.Router();
const {
  createBooking,
  getBookings,
  lookupBookingsByPhone,
  updateBookingStatus,
  deleteBooking,
  getQueueCount,
  getTimeSlots,
} = require("../controllers/bookingController");
const { protect } = require("../middlewares/authMiddleware");

// مهم: المسارات الثابتة لازم تتحط قبل "/:id"
router.get("/queue-count", getQueueCount); // وضع "الدور"
router.get("/time-slots", getTimeSlots); // وضع "الوقت"
router.get("/lookup", lookupBookingsByPhone);

router.post("/", createBooking); // Public
router.get("/", protect, getBookings); // أدمن بس
router.put("/:id/status", protect, updateBookingStatus); // أدمن بس
router.delete("/:id", protect, deleteBooking); // أدمن بس

module.exports = router;