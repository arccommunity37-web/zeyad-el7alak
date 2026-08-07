// ==========================================
// راوتس الإشعارات: العرض الفعّال Public، الإدارة الكاملة أدمن بس
// ==========================================

const express = require("express");
const router = express.Router();
const {
  getActiveAnnouncements,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} = require("../controllers/announcementController");
const { protect } = require("../middlewares/authMiddleware");

router.get("/active", getActiveAnnouncements); // Public

router.get("/", protect, getAllAnnouncements);
router.post("/", protect, createAnnouncement);
router.put("/:id", protect, updateAnnouncement);
router.delete("/:id", protect, deleteAnnouncement);

module.exports = router;