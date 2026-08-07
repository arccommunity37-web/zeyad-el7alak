// ==========================================
// راوتس الحجوزات
// ==========================================

const express = require("express");
const router = express.Router();
const {
  createBooking,
  customerUpdateBooking,
  customerCancelBooking,
  getBookings,
  getBookingsHistory,
  lookupBookingsByPhone,
  updateBookingStatus,
  adminUpdateBooking,
  deleteBooking,
  bulkDeleteBookings,
  getQueueCount,
  getTimeSlots,
} = require("../controllers/bookingController");
const { protect } = require("../middlewares/authMiddleware");

// مهم: المسارات الثابتة لازم تتحط قبل "/:id"
router.get("/queue-count", getQueueCount); // Public
router.get("/time-slots", getTimeSlots); // Public
router.get("/lookup", lookupBookingsByPhone); // Public
router.get("/history", protect, getBookingsHistory); // أدمن - الأيام السابقة
router.delete("/bulk", protect, bulkDeleteBookings); // أدمن - حذف جماعي

router.post("/", createBooking); // Public
router.get("/", protect, getBookings); // أدمن

router.put("/:id", customerUpdateBooking); // Public - العميل بيعدل حجزه بنفسه
router.put("/:id/cancel", customerCancelBooking); // Public - العميل بيلغي حجزه بنفسه
router.put("/:id/status", protect, updateBookingStatus); // أدمن
router.put("/:id/admin", protect, adminUpdateBooking); // أدمن - تعديل كامل
router.delete("/:id", protect, deleteBooking); // أدمن

module.exports = router;