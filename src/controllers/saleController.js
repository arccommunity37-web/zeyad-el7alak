// ==========================================
// الكنترولر ده مسؤول عن تسجيل عمليات البيع (فاتورة ممكن فيها خدمات و/أو منتجات)
// أهم حاجة فيه: لما يتباع منتج، بيتخصم تلقائيًا من المخزون
// ==========================================

const Sale = require("../models/Sale");
const Product = require("../models/Product");
const Service = require("../models/Service");
const StockMovement = require("../models/StockMovement");

// ------------------------------------------
// @desc    تسجيل عملية بيع جديدة
// @route   POST /api/sales
// body المتوقع: { customer, items: [{ type, refId, quantity }] }
// ------------------------------------------
const createSale = async (req, res, next) => {
  try {
    const { customer, items } = req.body;

    if (!items || items.length === 0) {
      res.status(400);
      return next(new Error("لازم تضيف عنصر واحد على الأقل في الفاتورة"));
    }

    const processedItems = [];
    let totalAmount = 0;

    // بنمشي على كل عنصر في الفاتورة ونتأكد منه ونحسب سعره
    for (const item of items) {
      if (item.type === "product") {
        const product = await Product.findById(item.refId);
        if (!product) {
          res.status(404);
          return next(new Error(`منتج غير موجود: ${item.refId}`));
        }

        // ✋ لازم نتأكد إن الكمية المطلوبة متوفرة قبل ما نبيعها
        if (product.quantityInStock < item.quantity) {
          res.status(400);
          return next(
            new Error(`الكمية المتاحة من "${product.name}" (${product.quantityInStock}) أقل من المطلوب`)
          );
        }

        const subtotal = product.sellingPrice * item.quantity;
        totalAmount += subtotal;

        processedItems.push({
          type: "product",
          refId: product._id,
          name: product.name,
          quantity: item.quantity,
          unitPrice: product.sellingPrice,
          subtotal,
        });

        // بنخصم الكمية من المخزون فورًا
        product.quantityInStock -= item.quantity;
        await product.save();

        // وبنسجل حركة "خروج" في سجل المخزون
        await StockMovement.create({
          product: product._id,
          type: "out",
          quantity: item.quantity,
          reason: "بيع",
        });
      } else if (item.type === "service") {
        const service = await Service.findById(item.refId);
        if (!service) {
          res.status(404);
          return next(new Error(`خدمة غير موجودة: ${item.refId}`));
        }

        const quantity = item.quantity || 1; // الخدمة غالبًا مرة واحدة، بس سايبينها مرنة
        const subtotal = service.price * quantity;
        totalAmount += subtotal;

        processedItems.push({
          type: "service",
          refId: service._id,
          name: service.name,
          quantity,
          unitPrice: service.price,
          subtotal,
        });
      } else {
        res.status(400);
        return next(new Error("نوع العنصر لازم يكون 'service' أو 'product'"));
      }
    }

    const sale = await Sale.create({
      customer: customer || null,
      employee: req.user._id, // الموظف اللي مسجل دخول وبيعمل عملية البيع
      items: processedItems,
      totalAmount,
      paymentMethod: "cash",
    });

    res.status(201).json(sale);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    عرض كل الفواتير
// @route   GET /api/sales
// ------------------------------------------
const getSales = async (req, res, next) => {
  try {
    const sales = await Sale.find({})
      .populate("customer", "name phone")
      .populate("employee", "name")
      .sort({ createdAt: -1 });

    res.status(200).json(sales);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// دالة مساعدة مشتركة: بتحسب إجمالي المبيعات بين تاريخين معينين
// ------------------------------------------
const getSalesSummaryBetween = async (from, to) => {
  const sales = await Sale.find({ createdAt: { $gte: from, $lte: to } });

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalInvoices = sales.length;

  return { totalRevenue, totalInvoices, sales };
};

// ------------------------------------------
// @desc    تقرير مبيعات اليوم الحالي
// @route   GET /api/sales/reports/daily
// ------------------------------------------
const getDailyReport = async (req, res, next) => {
  try {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date();
    dayEnd.setHours(23, 59, 59, 999);

    const summary = await getSalesSummaryBetween(dayStart, dayEnd);
    res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    تقرير مبيعات الشهر الحالي
// @route   GET /api/sales/reports/monthly
// ------------------------------------------
const getMonthlyReport = async (req, res, next) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const summary = await getSalesSummaryBetween(monthStart, monthEnd);
    res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
};

module.exports = { createSale, getSales, getDailyReport, getMonthlyReport };
