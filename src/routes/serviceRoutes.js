// ==========================================
// راوتس الخدمات: العرض متاح للجميع، الإضافة/التعديل/الحذف للأدمن بس
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
const { authorize } = require("../middlewares/roleMiddleware");

// عرض الخدمات - Public، مفيش داعي لـ protect هنا عشان العميل يقدر يشوفها قبل ما يسجل دخول
router.get("/", getServices);

// الإضافة والتعديل والحذف - أدمن بس
router.post("/", protect, authorize("admin"), createService);
router.put("/:id", protect, authorize("admin"), updateService);
router.delete("/:id", protect, authorize("admin"), deleteService);

module.exports = router;
