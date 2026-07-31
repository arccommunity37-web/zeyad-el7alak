// ==========================================
// الكنترولر ده مسؤول عن حجز المنتجات من قبل العميل
// الفكرة: العميل بيحجز كمية من منتج، الكمية دي بتتخصم من المعروض فورًا
// (عشان محدش يحجز نفس القطعة مرتين)، ولو العميل ماجاش يستلم في الميعاد، الحجز بيتلغي والكمية ترجع
// ==========================================

const ProductReservation = require("../models/ProductReservation");
const Product = require("../models/Product");
const StockMovement = require("../models/StockMovement");

// ------------------------------------------
// @desc    العميل بيحجز منتج معين
// @route   POST /api/product-reservations
// ------------------------------------------
const createReservation = async (req, res, next) => {
  try {
    const { product: productId, quantity, reservedUntil } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404);
      return next(new Error("المنتج غير موجود"));
    }

    // نتأكد إن المنتج ده أصلاً مسموح يتحجز مقدمًا
    if (!product.isAvailableForCustomerReservation) {
      res.status(400);
      return next(new Error("المنتج ده مش متاح للحجز المسبق"));
    }

    // ✋ أهم خطوة: نتأكد إن الكمية المطلوبة متاحة فعلاً في المخزون
    if (product.quantityInStock < quantity) {
      res.status(400);
      return next(
        new Error(`الكمية المتاحة حاليًا (${product.quantityInStock}) أقل من اللي طلبتها`)
      );
    }

    // بنخصم الكمية فورًا من المعروض عشان "نحجزها" لحد ما العميل ييجي يستلم
    product.quantityInStock -= quantity;
    await product.save();

    const reservation = await ProductReservation.create({
      customer: req.user._id, // لازم يكون عميل مسجل دخول
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
// @desc    عرض كل حجوزات المنتجات (Admin/Employee)
// @route   GET /api/product-reservations
// ------------------------------------------
const getReservations = async (req, res, next) => {
  try {
    const reservations = await ProductReservation.find({})
      .populate("customer", "name phone")
      .populate("product", "name sellingPrice image")
      .sort({ createdAt: -1 });

    res.status(200).json(reservations);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    عرض حجوزات العميل الحالي بس
// @route   GET /api/product-reservations/my
// ------------------------------------------
const getMyReservations = async (req, res, next) => {
  try {
    const reservations = await ProductReservation.find({ customer: req.user._id })
      .populate("product", "name sellingPrice image")
      .sort({ createdAt: -1 });

    res.status(200).json(reservations);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    تحديث حالة الحجز (تأكيد / استلام / إلغاء)
// @route   PUT /api/product-reservations/:id/status
// ------------------------------------------
const updateReservationStatus = async (req, res, next) => {
  try {
    const { status } = req.body; // القيمة المتوقعة: confirmed | picked_up | cancelled

    const reservation = await ProductReservation.findById(req.params.id);
    if (!reservation) {
      res.status(404);
      return next(new Error("الحجز غير موجود"));
    }

    // لو الأدمن/الموظف عايز يلغي الحجز، لازم نرجع الكمية للمخزون تاني
    if (status === "cancelled" && reservation.status !== "cancelled") {
      const product = await Product.findById(reservation.product);
      if (product) {
        product.quantityInStock += reservation.quantity;
        await product.save();
      }
    }

    // لو العميل استلم المنتج فعليًا، بنسجل حركة "خروج" نهائية في سجل المخزون
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
// دالة مصدّرة (مش endpoint) هيستخدمها node-cron عشان يلغي الحجوزات اللي فاتت مهلتها تلقائيًا
// شايفينها هنا وهنستدعيها من ملف منفصل لجدولة التشغيل (cron job)
// ------------------------------------------
const cancelExpiredReservations = async () => {
  const now = new Date();

  // بندور على أي حجز لسه pending أو confirmed بس فات ميعاد استلامه
  const expiredReservations = await ProductReservation.find({
    status: { $in: ["pending", "confirmed"] },
    reservedUntil: { $lt: now },
  });

  for (const reservation of expiredReservations) {
    // بنرجع الكمية للمخزون
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
  getMyReservations,
  updateReservationStatus,
  cancelExpiredReservations,
};
