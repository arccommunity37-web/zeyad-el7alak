// ==========================================
// راوتس إدارة الحلاقين - الإدارة أدمن بس، عرض القايمة العامة Public
// ==========================================

const express = require("express");
const router = express.Router();
const {
  getUsers,
  getUserById,
  updateUser,
  deactivateUser,
  getPublicEmployees,
} = require("../controllers/userController");
const { protect } = require("../middlewares/authMiddleware");

// راوت عام (Public) - العميل محتاجه عشان يختار حلاق وقت الحجز
router.get("/employees", getPublicEmployees);

router.get("/", protect, getUsers);
router.get("/:id", protect, getUserById);
router.put("/:id", protect, updateUser);
router.delete("/:id", protect, deactivateUser);

module.exports = router;