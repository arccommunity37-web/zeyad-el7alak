// ==========================================
// الكنترولر ده مسؤول عن المنتجات والمخزون: إضافة/تعديل منتج، رفع صورته،
// إضافة كمية جديدة (stock-in)، وعرض المنتجات اللي قربت تخلص
// ==========================================

const stream = require("stream");
const Product = require("../models/Product");
const StockMovement = require("../models/StockMovement");
const cloudinary = require("../config/cloudinary");

// دالة رفع الصورة - نفس الفكرة المستخدمة في styleController
const uploadBufferToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    bufferStream.pipe(uploadStream);
  });
};

// ------------------------------------------
// @desc    عرض كل المنتجات
// @route   GET /api/products
// ------------------------------------------
const getProducts = async (req, res, next) => {
  try {
    const products = await Product.find({});
    res.status(200).json(products);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    إضافة منتج جديد (ممكن مع صورة أو من غيرها)
// @route   POST /api/products
// ------------------------------------------
const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      category,
      costPrice,
      sellingPrice,
      quantityInStock,
      minStockAlert,
      unit,
      isAvailableForCustomerReservation,
    } = req.body;

    let image = { url: "", publicId: "" };

    // لو المنتج اتبعت معاه صورة وقت الإنشاء (req.file من multer)
    if (req.file) {
      const result = await uploadBufferToCloudinary(req.file.buffer, "barbershop/products");
      image = { url: result.secure_url, publicId: result.public_id };
    }

    const product = await Product.create({
      name,
      category,
      costPrice,
      sellingPrice,
      quantityInStock,
      minStockAlert,
      unit,
      image,
      isAvailableForCustomerReservation,
    });

    // لو دخلنا كمية ابتدائية، بنسجلها كحركة "دخول" في سجل المخزون
    if (quantityInStock > 0) {
      await StockMovement.create({
        product: product._id,
        type: "in",
        quantity: quantityInStock,
        reason: "رصيد افتتاحي عند إضافة المنتج",
      });
    }

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    تعديل بيانات منتج (السعر، الاسم، الفئة...) - مش بيغير الكمية هنا
// @route   PUT /api/products/:id
// ------------------------------------------
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      return next(new Error("المنتج غير موجود"));
    }

    // بنمنع تعديل الكمية من هنا مباشرة، عشان دايمًا نستخدم "stock-in" أو عملية بيع
    // وده يضمن إن سجل StockMovement فاضل دايمًا متزامن مع الكمية الفعلية
    const { quantityInStock, ...allowedUpdates } = req.body;

    Object.assign(product, allowedUpdates);
    const updated = await product.save();

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    رفع/تحديث صورة المنتج
// @route   POST /api/products/:id/image
// ------------------------------------------
const updateProductImage = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      return next(new Error("المنتج غير موجود"));
    }

    if (!req.file) {
      res.status(400);
      return next(new Error("لازم ترفع صورة"));
    }

    // لو المنتج كان ليه صورة قديمة، نحذفها من Cloudinary الأول عشان منسبش صور يتيمة تاخد مساحة
    if (product.image && product.image.publicId) {
      await cloudinary.uploader.destroy(product.image.publicId);
    }

    const result = await uploadBufferToCloudinary(req.file.buffer, "barbershop/products");
    product.image = { url: result.secure_url, publicId: result.public_id };
    await product.save();

    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    إضافة كمية جديدة للمخزون (لما الأدمن يشتري بضاعة جديدة)
// @route   POST /api/products/:id/stock-in
// ------------------------------------------
const stockIn = async (req, res, next) => {
  try {
    const { quantity, reason } = req.body;

    if (!quantity || quantity <= 0) {
      res.status(400);
      return next(new Error("الكمية لازم تكون رقم أكبر من صفر"));
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      return next(new Error("المنتج غير موجود"));
    }

    // بنزود الكمية في المنتج
    product.quantityInStock += Number(quantity);
    await product.save();

    // وبنسجل الحركة في سجل المخزون عشان يبقى عندنا تاريخ كامل لحركة البضاعة
    await StockMovement.create({
      product: product._id,
      type: "in",
      quantity,
      reason: reason || "إضافة بضاعة جديدة",
    });

    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    عرض المنتجات اللي كميتها قربت تخلص (وصلت لحد التنبيه أو أقل)
// @route   GET /api/products/low-stock
// ------------------------------------------
const getLowStockProducts = async (req, res, next) => {
  try {
    // بنستخدم $expr عشان نقارن بين حقلين في نفس الدوكيومنت (الكمية الحالية مع حد التنبيه)
    const lowStockProducts = await Product.find({
      $expr: { $lte: ["$quantityInStock", "$minStockAlert"] },
    });

    res.status(200).json(lowStockProducts);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  updateProductImage,
  stockIn,
  getLowStockProducts,
};
