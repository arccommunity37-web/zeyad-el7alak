// ==========================================
// راوتس قصات الشعر: العرض متاح للجميع، الإضافة والتعديل لصاحب المحل والحلاقين
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
const { authorize } = require("../middlewares/roleMiddleware");
const upload = require("../middlewares/uploadMiddleware");

// عرض القصات - Public
router.get("/", getStyles);

// إضافة قصة جديدة مع صور (لغاية 5 صور في المرة الواحدة) - أدمن أو موظف (حلاق)
// upload.array("images", 5) يعني: استقبل حقل اسمه "images"، وممكن يكون فيه لغاية 5 ملفات
router.post("/", protect, authorize("admin", "employee"), upload.array("images", 5), createStyle);

// إضافة صورة زيادة لقصة موجودة
router.post(
  "/:id/images",
  protect,
  authorize("admin", "employee"),
  upload.array("images", 5),
  addImageToStyle
);

// حذف قصة
router.delete("/:id", protect, authorize("admin", "employee"), deleteStyle);

module.exports = router;
