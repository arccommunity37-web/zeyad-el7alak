// ==========================================
// راوتس الحجوزات: الحجز والاستعلام Public (بالاسم والتليفون، يوم ودور بس)
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
} = require("../controllers/bookingController");
const { protect } = require("../middlewares/authMiddleware");

router.get("/queue-count", getQueueCount);
router.get("/lookup", lookupBookingsByPhone);

router.post("/", createBooking); // Public
router.get("/", protect, getBookings); // أدمن بس
router.put("/:id/status", protect, updateBookingStatus); // أدمن بس
router.delete("/:id", protect, deleteBooking); // أدمن بس

module.exports = router;