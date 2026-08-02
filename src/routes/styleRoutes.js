// ==========================================
// راوتس قصات الشعر: العرض متاح للجميع، الإضافة والتعديل والحذف للأدمن بس
// ==========================================

const express = require("express");
const router = express.Router();
const {
  getStyles,
  createStyle,
  addImageToStyle,
  deleteStyle,
} = require("../controllers/styleController");
const { protect } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

router.get("/", getStyles); // Public

router.post("/", protect, upload.array("images", 5), createStyle);
router.post("/:id/images", protect, upload.array("images", 5), addImageToStyle);
router.delete("/:id", protect, deleteStyle);

module.exports = router;