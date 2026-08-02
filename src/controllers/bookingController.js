// ==========================================
// الكنترولر ده مسؤول عن الحجوزات - العميل بيحجز بالاسم والتليفون بس، من غير أي تسجيل دخول
// وبيقدر يشوف حالة/تاريخ طلباته لاحقًا بنفس رقم التليفون
// ==========================================

const Booking = require("../models/Booking");
const Service = require("../models/Service");
const Customer = require("../models/Customer");

// تحويل "HH:mm" لعدد دقايق، والعكس - عشان نحسب ونقارن الأوقات بسهولة
const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};
const minutesToTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

// بتتحقق هل فيه تعارض بين حجز جديد وحجوزات موجودة لنفس الحلاق في نفس اليوم
const hasTimeConflict = (existingBookings, newStart, newEnd) => {
  return existingBookings.some((booking) => {
    const existingStart = timeToMinutes(booking.startTime);
    const existingEnd = timeToMinutes(booking.endTime);
    return newStart < existingEnd && existingStart < newEnd;
  });
};

// ------------------------------------------
// @desc    إنشاء حجز جديد - Public، من غير تسجيل دخول خالص
// @route   POST /api/bookings
// body المتوقع: { customerName, customerPhone, employee, services, date, startTime, notes }
// ------------------------------------------
const createBooking = async (req, res, next) => {
  try {
    const { customerName, customerPhone, employee, services, date, startTime, notes } = req.body;

    if (!customerName || !customerPhone) {
      res.status(400);
      return next(new Error("الاسم ورقم التليفون مطلوبين"));
    }

    // بندور على العميل برقم تليفونه، ولو مش موجود بننشئه دلوقتي (من غير باسورد خالص)
    let customer = await Customer.findOne({ phone: customerPhone });
    if (!customer) {
      customer = await Customer.create({ name: customerName, phone: customerPhone });
    } else if (customer.name !== customerName) {
      // لو غيّر اسمه المرة دي، بنحدثه (اختياري بس مفيد)
      customer.name = customerName;
      await customer.save();
    }

    const selectedServices = await Service.find({ _id: { $in: services } });
    if (selectedServices.length === 0) {
      res.status(400);
      return next(new Error("لازم تختار خدمة واحدة على الأقل"));
    }

    const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationInMinutes, 0);
    const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = startMinutes + totalDuration;
    const endTime = minutesToTime(endMinutes);

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const existingBookings = await Booking.find({
      employee,
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $ne: "cancelled" },
    });

    if (hasTimeConflict(existingBookings, startMinutes, endMinutes)) {
      res.status(409);
      return next(new Error("الميعاد ده متحجز بالفعل لنفس الحلاق، اختار وقت تاني"));
    }

    const booking = await Booking.create({
      customer: customer._id,
      employee,
      services,
      date,
      startTime,
      endTime,
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
      .populate("customer", "name phone")
      .populate("employee", "name")
      .populate("services", "name price durationInMinutes")
      .sort({ date: -1, startTime: -1 });

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

    const customer = await Customer.findOne({ phone });
    if (!customer) {
      return res.status(200).json([]); // مفيش عميل بالرقم ده، يبقى مفيش طلبات
    }

    const bookings = await Booking.find({ customer: customer._id })
      .populate("employee", "name")
      .populate("services", "name price durationInMinutes")
      .sort({ date: -1, startTime: -1 });

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
// @desc    عرض المواعيد المتاحة لحلاق معين في يوم معين - Public
// @route   GET /api/bookings/available-slots?employee=xxx&date=2026-08-01
// ------------------------------------------
const getAvailableSlots = async (req, res, next) => {
  try {
    const { employee, date } = req.query;

    const User = require("../models/User");
    const employeeDoc = await User.findById(employee);
    if (!employeeDoc) {
      res.status(404);
      return next(new Error("الحلاق غير موجود"));
    }

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      employee,
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $ne: "cancelled" },
    }).sort({ startTime: 1 });

    const workStart = timeToMinutes(employeeDoc.workingHours.from);
    const workEnd = timeToMinutes(employeeDoc.workingHours.to);

    const freeSlots = [];
    let cursor = workStart;

    bookings.forEach((booking) => {
      const bookingStart = timeToMinutes(booking.startTime);
      const bookingEnd = timeToMinutes(booking.endTime);
      if (bookingStart > cursor) {
        freeSlots.push({ from: minutesToTime(cursor), to: minutesToTime(bookingStart) });
      }
      cursor = Math.max(cursor, bookingEnd);
    });

    if (cursor < workEnd) {
      freeSlots.push({ from: minutesToTime(cursor), to: minutesToTime(workEnd) });
    }

    res.status(200).json(freeSlots);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBooking,
  getBookings,
  lookupBookingsByPhone,
  updateBookingStatus,
  getAvailableSlots,
};