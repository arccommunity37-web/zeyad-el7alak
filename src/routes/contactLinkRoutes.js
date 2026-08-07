// ==========================================
// راوتس لينكات التواصل: العرض Public، الإدارة أدمن بس
// ==========================================

const express = require("express");
const router = express.Router();
const {
  getContactLinks,
  createContactLink,
  updateContactLink,
  deleteContactLink,
} = require("../controllers/contactLinkController");
const { protect } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

router.get("/", getContactLinks); // Public

router.post("/", protect, upload.single("image"), createContactLink);
router.put("/:id", protect, upload.single("image"), updateContactLink);
router.delete("/:id", protect, deleteContactLink);

module.exports = router;