// ==========================================
// راوتس حجز المنتجات: الحجز والاستعلام Public (بالاسم والتليفون)
// عرض كل الحجوزات وتحديث حالتها للأدمن بس
// ==========================================

const express = require("express");
const router = express.Router();
const {
  createReservation,
  getReservations,
  lookupReservationsByPhone,
  updateReservationStatus,
} = require("../controllers/reservationController");
const { protect } = require("../middlewares/authMiddleware");

router.get("/lookup", lookupReservationsByPhone); // Public

router.post("/", createReservation); // Public
router.get("/", protect, getReservations); // أدمن بس
router.put("/:id/status", protect, updateReservationStatus); // أدمن بس

module.exports = router;