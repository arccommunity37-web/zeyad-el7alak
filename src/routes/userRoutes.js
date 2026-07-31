// ==========================================
// راوتس إدارة الموظفين - كلها محمية ومحتاجة تسجيل دخول + صلاحية admin
// ==========================================

const express = require("express");
const router = express.Router();
const { getUsers, getUserById, updateUser, deactivateUser } = require("../controllers/userController");
const { protect } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");

// كل الراوتس هنا محتاجة: 1) تسجيل دخول (protect) 2) يكون أدمن (authorize("admin"))
router.get("/", protect, authorize("admin"), getUsers);
router.get("/:id", protect, authorize("admin"), getUserById);
router.put("/:id", protect, authorize("admin"), updateUser);
router.delete("/:id", protect, authorize("admin"), deactivateUser);

module.exports = router;
