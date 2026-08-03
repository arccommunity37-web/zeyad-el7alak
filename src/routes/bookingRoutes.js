// ==========================================
// راوتس الحجوزات: الحجز والاستعلام Public (بالاسم والتليفون، بدون وقت خالص - يوم ودور بس)
// عرض كل الحجوزات وتحديث حالتها للأدمن بس
// ==========================================

const express = require("express");
const router = express.Router();
const {
  createBooking,
  getBookings,
  lookupBookingsByPhone,
  updateBookingStatus,
  getQueueCount,
} = require("../controllers/bookingController");
const { protect } = require("../middlewares/authMiddleware");

// مهم: المسارات الثابتة لازم تتحط قبل "/:id"
router.get("/queue-count", getQueueCount);
router.get("/lookup", lookupBookingsByPhone);

router.post("/", createBooking); // Public - أي عميل يقدر يحجز بالاسم والتليفون
router.get("/", protect, getBookings); // أدمن بس - لوحة التحكم
router.put("/:id/status", protect, updateBookingStatus); // أدمن بس

module.exports = router;