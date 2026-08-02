// ==========================================
// راوتس الخدمات: العرض Public، الإضافة/التعديل/الحذف أدمن بس
// ==========================================

const express = require("express");
const router = express.Router();
const {
  getServices,
  createService,
  updateService,
  deleteService,
} = require("../controllers/serviceController");
const { protect } = require("../middlewares/authMiddleware");

router.get("/", getServices); // Public

router.post("/", protect, createService);
router.put("/:id", protect, updateService);
router.delete("/:id", protect, deleteService);

module.exports = router;