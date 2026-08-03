// ==========================================
// الكنترولر ده مسؤول عن حجز المنتجات - بالاسم والتليفون بس، من غير تسجيل دخول
// ==========================================

const ProductReservation = require("../models/ProductReservation");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const StockMovement = require("../models/StockMovement");

// ------------------------------------------
// @desc    العميل بيحجز منتج معين - Public
// @route   POST /api/product-reservations
// ------------------------------------------
const createReservation = async (req, res, next) => {
  try {
    const { customerName, customerPhone, product: productId, quantity, reservedUntil } = req.body;

    if (!customerName || !customerPhone) {
      res.status(400);
      return next(new Error("الاسم ورقم التليفون مطلوبين"));
    }

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404);
      return next(new Error("المنتج غير موجود"));
    }

    if (!product.isAvailableForCustomerReservation) {
      res.status(400);
      return next(new Error("المنتج ده مش متاح للحجز المسبق"));
    }

    if (product.quantityInStock < quantity) {
      res.status(400);
      return next(
        new Error(`الكمية المتاحة حاليًا (${product.quantityInStock}) أقل من اللي طلبتها`)
      );
    }

    let customer = await Customer.findOne({ phone: customerPhone });
    if (!customer) {
      customer = await Customer.create({ name: customerName, phone: customerPhone });
    } else if (customer.name !== customerName) {
      customer.name = customerName;
      await customer.save();
    }

    product.quantityInStock -= quantity;
    await product.save();

    const reservation = await ProductReservation.create({
      customer: customer._id,
      customerName,
      customerPhone,
      product: productId,
      quantity,
      reservedUntil,
    });

    res.status(201).json(reservation);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    عرض كل حجوزات المنتجات - أدمن بس
// @route   GET /api/product-reservations
// ------------------------------------------
const getReservations = async (req, res, next) => {
  try {
    const reservations = await ProductReservation.find({})
      .populate("product", "name sellingPrice image")
      .sort({ createdAt: -1 });

    res.status(200).json(reservations);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    العميل بيشوف حجوزاته برقم تليفونه بس - Public
// @route   GET /api/product-reservations/lookup?phone=xxxxxxxxxx
// ------------------------------------------
const lookupReservationsByPhone = async (req, res, next) => {
  try {
    const { phone } = req.query;

    if (!phone) {
      res.status(400);
      return next(new Error("رقم التليفون مطلوب"));
    }

    const reservations = await ProductReservation.find({ customerPhone: phone })
      .populate("product", "name sellingPrice image")
      .sort({ createdAt: -1 });

    res.status(200).json(reservations);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    تحديث حالة الحجز (تأكيد/استلام/إلغاء) - أدمن بس
// @route   PUT /api/product-reservations/:id/status
// ------------------------------------------
const updateReservationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const reservation = await ProductReservation.findById(req.params.id);
    if (!reservation) {
      res.status(404);
      return next(new Error("الحجز غير موجود"));
    }

    if (status === "cancelled" && reservation.status !== "cancelled") {
      const product = await Product.findById(reservation.product);
      if (product) {
        product.quantityInStock += reservation.quantity;
        await product.save();
      }
    }

    if (status === "picked_up") {
      await StockMovement.create({
        product: reservation.product,
        type: "out",
        quantity: reservation.quantity,
        reason: "استلام حجز منتج",
      });
    }

    reservation.status = status;
    await reservation.save();

    res.status(200).json(reservation);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    حذف حجز منتج نهائيًا - أدمن بس
// لو الحجز لسه ماتلغيش، بنرجع الكمية للمخزون الأول قبل الحذف عشان الأرقام تفضل صح
// @route   DELETE /api/product-reservations/:id
// ------------------------------------------
const deleteReservation = async (req, res, next) => {
  try {
    const reservation = await ProductReservation.findById(req.params.id);
    if (!reservation) {
      res.status(404);
      return next(new Error("الحجز غير موجود"));
    }

    if (!["cancelled", "picked_up"].includes(reservation.status)) {
      const product = await Product.findById(reservation.product);
      if (product) {
        product.quantityInStock += reservation.quantity;
        await product.save();
      }
    }

    await reservation.deleteOne();
    res.status(200).json({ message: "تم حذف الحجز بنجاح" });
  } catch (error) {
    next(error);
  }
};

// دالة يستخدمها node-cron/Vercel Cron لإلغاء الحجوزات المنتهية تلقائيًا
const cancelExpiredReservations = async () => {
  const now = new Date();

  const expiredReservations = await ProductReservation.find({
    status: { $in: ["pending", "confirmed"] },
    reservedUntil: { $lt: now },
  });

  for (const reservation of expiredReservations) {
    const product = await Product.findById(reservation.product);
    if (product) {
      product.quantityInStock += reservation.quantity;
      await product.save();
    }
    reservation.status = "cancelled";
    await reservation.save();
  }

  if (expiredReservations.length > 0) {
    console.log(`🕐 تم إلغاء ${expiredReservations.length} حجز منتج منتهي الصلاحية تلقائيًا`);
  }
};

module.exports = {
  createReservation,
  getReservations,
  lookupReservationsByPhone,
  updateReservationStatus,
  deleteReservation,
  cancelExpiredReservations,
};