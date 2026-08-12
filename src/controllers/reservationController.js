// ==========================================
// الكنترولر ده مسؤول عن حجز المنتجات - بالاسم والتليفون بس، من غير تسجيل دخول
// ==========================================

const ProductReservation = require("../models/ProductReservation");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const StockMovement = require("../models/StockMovement");
const Sale = require("../models/Sale");

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
    const { status } = req.query;

    let filter = {};
    if (status === "active") {
      filter = { status: { $in: ["pending", "confirmed"] } };
    } else if (status === "delivered") {
      filter = { status: { $in: ["completed", "picked_up"] } };
    } else if (status === "cancelled") {
      filter = { status: "cancelled" };
    } else if (status === "completed") {
      filter = { status: { $in: ["completed", "picked_up"] } };
    }
    // If no status param → return all (existing behaviour)

    const reservations = await ProductReservation.find(filter)
      .populate("product", "name sellingPrice image")
      .populate("customer", "name phone")
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

    const isDelivered = status === "picked_up" || status === "completed";
    const wasDelivered = reservation.status === "picked_up" || reservation.status === "completed";

    if (isDelivered && !wasDelivered) {
      await StockMovement.create({
        product: reservation.product,
        type: "out",
        quantity: reservation.quantity,
        reason: "استلام حجز منتج",
      });

      // ⭐ تسليم المنتج بيعمل فاتورة بيع (Sale) تلقائياً عشان تظهر في شاشة المبيعات وتتحسب في الأرباح!
      const productDoc = await Product.findById(reservation.product);
      if (productDoc) {
        const unitPrice = productDoc.sellingPrice || 0;
        const subtotal = unitPrice * reservation.quantity;
        await Sale.create({
          customer: reservation.customer || null,
          items: [
            {
              type: "product",
              refId: productDoc._id,
              name: productDoc.name,
              quantity: reservation.quantity,
              unitPrice: unitPrice,
              subtotal: subtotal,
            },
          ],
          totalAmount: subtotal,
          paymentMethod: "cash",
        });
      }
    }

    reservation.status = status;
    await reservation.save();

    res.status(200).json(reservation);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    تعديل بيانات الحجز كاملة (الكمية، الاسم، التليفون، المنتج، الحالة) - أدمن بس
// @route   PUT /api/product-reservations/:id
// ------------------------------------------
const updateReservation = async (req, res, next) => {
  try {
    const reservation = await ProductReservation.findById(req.params.id);
    if (!reservation) {
      res.status(404);
      return next(new Error("الحجز غير موجود"));
    }

    const {
      customerName,
      customerPhone,
      product: newProductId,
      quantity,
      qty,
      count,
      status,
      reservedUntil,
    } = req.body;

    // Resolve the new quantity from any of the accepted keys
    const newQty = Number(quantity ?? qty ?? count ?? reservation.quantity);

    // ── Quantity adjustment ──────────────────────────────────────
    const oldQty = reservation.quantity;
    const productId = newProductId || reservation.product;
    const productChanged = newProductId && String(newProductId) !== String(reservation.product);

    if (productChanged) {
      // 1️⃣ Restore old quantity back to old product
      const oldProduct = await Product.findById(reservation.product);
      if (oldProduct) {
        oldProduct.quantityInStock += oldQty;
        await oldProduct.save();
      }
      // 2️⃣ Deduct new quantity from new product
      const newProduct = await Product.findById(newProductId);
      if (!newProduct) {
        res.status(404);
        return next(new Error("المنتج الجديد غير موجود"));
      }
      if (newProduct.quantityInStock < newQty) {
        res.status(400);
        return next(new Error(`الكمية المتاحة في المخزون (${newProduct.quantityInStock}) أقل من الكمية المطلوبة`));
      }
      newProduct.quantityInStock -= newQty;
      await newProduct.save();
    } else if (newQty !== oldQty) {
      // Same product, just quantity changed
      const diff = newQty - oldQty; // positive → need more stock, negative → return to stock
      const product = await Product.findById(reservation.product);
      if (product) {
        if (diff > 0 && product.quantityInStock < diff) {
          res.status(400);
          return next(new Error(`الكمية المتاحة في المخزون (${product.quantityInStock}) أقل من الفرق المطلوب`));
        }
        product.quantityInStock -= diff;
        await product.save();
      }
    }

    // ── Handle status change (cancelled → restore stock, delivered → create sale) ──
    if (status && status !== reservation.status) {
      if (status === "cancelled" && reservation.status !== "cancelled") {
        const product = await Product.findById(productId);
        if (product) {
          product.quantityInStock += newQty;
          await product.save();
        }
      }

      const isDelivered = status === "picked_up" || status === "completed";
      const wasDelivered = reservation.status === "picked_up" || reservation.status === "completed";

      if (isDelivered && !wasDelivered) {
        await StockMovement.create({
          product: productId,
          type: "out",
          quantity: newQty,
          reason: "استلام حجز منتج (تعديل أدمن)",
        });

        const productDoc = await Product.findById(productId);
        if (productDoc) {
          const unitPrice = productDoc.sellingPrice || 0;
          const subtotal = unitPrice * newQty;
          await Sale.create({
            customer: reservation.customer || null,
            items: [
              {
                type: "product",
                refId: productDoc._id,
                name: productDoc.name,
                quantity: newQty,
                unitPrice,
                subtotal,
              },
            ],
            totalAmount: subtotal,
            paymentMethod: "cash",
          });
        }
      }
    }

    // ── Update customer record if phone/name changed ──────────────
    if (customerPhone && customerPhone !== reservation.customerPhone) {
      let customer = await Customer.findOne({ phone: customerPhone });
      if (!customer) {
        customer = await Customer.create({ name: customerName || reservation.customerName, phone: customerPhone });
      } else if (customerName && customer.name !== customerName) {
        customer.name = customerName;
        await customer.save();
      }
      reservation.customer = customer._id;
    }

    // ── Apply all field updates ───────────────────────────────────
    if (customerName) reservation.customerName = customerName;
    if (customerPhone) reservation.customerPhone = customerPhone;
    if (productChanged) reservation.product = newProductId;
    reservation.quantity = newQty;
    if (status) reservation.status = status;
    if (reservedUntil) reservation.reservedUntil = reservedUntil;

    await reservation.save();

    const updated = await ProductReservation.findById(reservation._id)
      .populate("product", "name sellingPrice image")
      .populate("customer", "name phone");

    res.status(200).json(updated);
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
  updateReservation,
  deleteReservation,
  cancelExpiredReservations,
};