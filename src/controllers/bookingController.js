// ==========================================
// الكنترولر ده مسؤول عن الحجوزات - نظام "يوم + دور" مش وقت محدد
// العميل بيختار يوم وحلاق، والنظام بيدّيه رقم دوره تلقائيًا (turn)
// ==========================================

const Booking = require("../models/Booking");
const Service = require("../models/Service");
const Customer = require("../models/Customer");

// ------------------------------------------
// @desc    إنشاء حجز جديد - Public، من غير تسجيل دخول خالص
// @route   POST /api/bookings
// body المتوقع: { customerName, customerPhone, employee, services, date, notes }
// ------------------------------------------
const createBooking = async (req, res, next) => {
  try {
    const { customerName, customerPhone, employee, services, date, notes } = req.body;

    if (!customerName || !customerPhone) {
      res.status(400);
      return next(new Error("الاسم ورقم التليفون مطلوبين"));
    }

    // بندور على العميل برقم تليفونه في جدول Customer المنفصل (عشان نقدر نجمع كل طلباته ببعض لاحقًا)
    let customer = await Customer.findOne({ phone: customerPhone });
    if (!customer) {
      customer = await Customer.create({ name: customerName, phone: customerPhone });
    } else if (customer.name !== customerName) {
      customer.name = customerName;
      await customer.save();
    }

    const selectedServices = await Service.find({ _id: { $in: services } });
    if (selectedServices.length === 0) {
      res.status(400);
      return next(new Error("لازم تختار خدمة واحدة على الأقل"));
    }

    const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // رقم دور العميل الجديد = عدد الحجوزات (مش الملغية) لنفس الحلاق في نفس اليوم + 1
    const bookingsCountToday = await Booking.countDocuments({
      employee,
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $ne: "cancelled" },
    });

    const turn = bookingsCountToday + 1;

    const booking = await Booking.create({
      customer: customer._id,
      customerName,
      customerPhone,
      employee,
      services,
      date,
      turn,
      totalPrice,
      notes,
    });

    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    عرض كل الحجوزات - أدمن بس (لوحة التحكم)
// @route   GET /api/bookings
// ------------------------------------------
const getBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({})
      .populate("employee", "name")
      .populate("services", "name price durationInMinutes")
      .sort({ date: -1, turn: 1 });

    res.status(200).json(bookings);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    العميل بيشوف طلباته (الحالية والتاريخ) برقم تليفونه بس - Public
// @route   GET /api/bookings/lookup?phone=xxxxxxxxxx
// ------------------------------------------
const lookupBookingsByPhone = async (req, res, next) => {
  try {
    const { phone } = req.query;

    if (!phone) {
      res.status(400);
      return next(new Error("رقم التليفون مطلوب"));
    }

    const bookings = await Booking.find({ customerPhone: phone })
      .populate("employee", "name")
      .populate("services", "name price durationInMinutes")
      .sort({ date: -1, turn: 1 });

    res.status(200).json(bookings);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    تحديث حالة الحجز (تأكيد/إتمام/إلغاء) - أدمن بس
// @route   PUT /api/bookings/:id/status
// ------------------------------------------
const updateBookingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      res.status(404);
      return next(new Error("الحجز غير موجود"));
    }

    booking.status = status;
    await booking.save();

    res.status(200).json(booking);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    حذف حجز نهائيًا من قاعدة البيانات - أدمن بس
// @route   DELETE /api/bookings/:id
// ------------------------------------------
const deleteBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);

    if (!booking) {
      res.status(404);
      return next(new Error("الحجز غير موجود"));
    }

    res.status(200).json({ message: "تم حذف الحجز بنجاح" });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    معرفة عدد الحجوزات الموجودة فعلاً لحلاق معين في يوم معين - Public
// @route   GET /api/bookings/queue-count?employee=xxx&date=2026-08-10
// ------------------------------------------
const getQueueCount = async (req, res, next) => {
  try {
    const { employee, date } = req.query;

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const count = await Booking.countDocuments({
      employee,
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $ne: "cancelled" },
    });

    res.status(200).json({ currentQueueCount: count, nextTurn: count + 1 });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBooking,
  getBookings,
  lookupBookingsByPhone,
  updateBookingStatus,
  deleteBooking,
  getQueueCount,
};