// ==========================================
// راوتس حجز المنتجات: الحجز والاستعلام Public (بالاسم والتليفون)
// عرض/تحديث/حذف الحجوزات للأدمن بس
// ==========================================

const express = require("express");
const router = express.Router();
const {
  createReservation,
  getReservations,
  lookupReservationsByPhone,
  updateReservationStatus,
  updateReservation,
  deleteReservation,
} = require("../controllers/reservationController");
const { protect } = require("../middlewares/authMiddleware");

router.get("/lookup", lookupReservationsByPhone);

router.post("/", createReservation); // Public
router.get("/", protect, getReservations); // أدمن بس
router.put("/:id", protect, updateReservation); // أدمن بس - تعديل بيانات الحجز كاملة
router.put("/:id/status", protect, updateReservationStatus); // أدمن بس
router.delete("/:id", protect, deleteReservation); // أدمن بس

module.exports = router;