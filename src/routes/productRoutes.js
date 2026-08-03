// ==========================================
// راوتس المنتجات والمخزون - العرض Public، الإدارة أدمن بس
// ==========================================

const express = require("express");
const router = express.Router();
const {
  getProducts,
  createProduct,
  updateProduct,
  updateProductImage,
  stockIn,
  getLowStockProducts,
  deleteProduct,
} = require("../controllers/productController");
const { protect } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

router.get("/low-stock", protect, getLowStockProducts);
router.get("/", getProducts); // Public - العميل يشوف المنتجات من غير تسجيل دخول

router.post("/", protect, upload.single("image"), createProduct);
router.put("/:id", protect, updateProduct);
router.post("/:id/image", protect, upload.single("image"), updateProductImage);
router.post("/:id/stock-in", protect, stockIn);
router.delete("/:id", protect, deleteProduct); // أدمن بس - حذف نهائي

module.exports = router;