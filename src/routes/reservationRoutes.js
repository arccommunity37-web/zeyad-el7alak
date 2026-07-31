// ==========================================
// راوتس حجز المنتجات من قبل العميل
// ==========================================

const express = require("express");
const router = express.Router();
const {
  createReservation,
  getReservations,
  getMyReservations,
  updateReservationStatus,
} = require("../controllers/reservationController");
const { protect } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");

// مهم: "my" لازم يتحط قبل أي راوت بيستخدم "/:id" لنفس السبب اللي فات
router.get("/my", protect, getMyReservations);

router.post("/", protect, createReservation); // أي عميل مسجل دخول يقدر يحجز
router.get("/", protect, authorize("admin", "employee"), getReservations);
router.put("/:id/status", protect, authorize("admin", "employee"), updateReservationStatus);

module.exports = router;
