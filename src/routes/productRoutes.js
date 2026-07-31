// ==========================================
// راوتس المنتجات والمخزون - أدمن بس هو اللي يقدر يضيف/يعدل، العرض متاح لأي مسجل دخول
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
} = require("../controllers/productController");
const { protect } = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");
const upload = require("../middlewares/uploadMiddleware");

// مهم: "low-stock" لازم يتحط قبل "/:id" عشان مايتفسرش غلط كـ id
router.get("/low-stock", protect, authorize("admin", "employee"), getLowStockProducts);

router.get("/", protect, getProducts);

// upload.single("image") يعني: استقبل ملف واحد بس في حقل اسمه "image"
router.post("/", protect, authorize("admin"), upload.single("image"), createProduct);

router.put("/:id", protect, authorize("admin"), updateProduct);
router.post("/:id/image", protect, authorize("admin"), upload.single("image"), updateProductImage);
router.post("/:id/stock-in", protect, authorize("admin"), stockIn);

module.exports = router;
