// ==========================================
// راوتس إدارة الحلاقين - الإدارة أدمن بس، عرض القايمة العامة Public
// ==========================================

const express = require("express");
const router = express.Router();
const {
  getUsers,
  getUserById,
  updateUser,
  updateUserImage,
  deactivateUser,
  deleteUserPermanently,
  getPublicEmployees,
} = require("../controllers/userController");
const { protect } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

router.get("/employees", getPublicEmployees); // Public

router.get("/", protect, getUsers);
router.get("/:id", protect, getUserById);
router.put("/:id", protect, updateUser);
router.post("/:id/image", protect, upload.single("image"), updateUserImage);
router.delete("/:id", protect, deactivateUser); // تعطيل (Soft)
router.delete("/:id/permanent", protect, deleteUserPermanently); // حذف نهائي (Hard)

module.exports = router;