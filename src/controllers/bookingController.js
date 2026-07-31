// ==========================================
// الكنترولر ده مسؤول عن كل حاجة متعلقة بحجز المواعيد
// أهم حاجة فيه: التأكد إن مفيش تعارض بين حجزين لنفس الحلاق في نفس الوقت
// ==========================================

const Booking = require("../models/Booking");
const Service = require("../models/Service");

// ------------------------------------------
// دالة مساعدة: بتحول وقت بصيغة "HH:mm" لعدد دقايق من بداية اليوم
// عشان يسهل علينا نقارن ونجمع الأوقات رياضيًا
// مثال: "14:30" -> 870 دقيقة (14*60 + 30)
// ------------------------------------------
const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// ------------------------------------------
// دالة مساعدة: عكس الفانكشن اللي فوق - بتحول عدد الدقايق لصيغة "HH:mm"
// ------------------------------------------
const minutesToTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

// ------------------------------------------
// دالة مساعدة: بتتحقق هل فيه تعارض بين حجز جديد وحجوزات موجودة لنفس الحلاق في نفس اليوم
// المنطق: حجزين بيتعارضوا لو (بداية الأول قبل نهاية التاني) و(بداية التاني قبل نهاية الأول)
// ------------------------------------------
const hasTimeConflict = (existingBookings, newStart, newEnd) => {
  return existingBookings.some((booking) => {
    const existingStart = timeToMinutes(booking.startTime);
    const existingEnd = timeToMinutes(booking.endTime);
    return newStart < existingEnd && existingStart < newEnd;
  });
};

// ------------------------------------------
// @desc    إنشاء حجز جديد
// @route   POST /api/bookings
// ------------------------------------------
const createBooking = async (req, res, next) => {
  try {
    const { employee, services, date, startTime, notes } = req.body;

    // بنجيب بيانات الخدمات المختارة عشان نحسب منها: السعر الإجمالي + المدة الكلية
    const selectedServices = await Service.find({ _id: { $in: services } });
    if (selectedServices.length === 0) {
      res.status(400);
      return next(new Error("لازم تختار خدمة واحدة على الأقل"));
    }

    // بنجمع مدة كل الخدمات المختارة عشان نعرف الحجز هيخلص الساعة كام
    const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationInMinutes, 0);
    const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = startMinutes + totalDuration;
    const endTime = minutesToTime(endMinutes);

    // بنجيب كل حجوزات نفس الحلاق في نفس اليوم (اللي لسه مش ملغية) عشان نتحقق من التعارض
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const existingBookings = await Booking.find({
      employee,
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $ne: "cancelled" }, // الحجوزات الملغية مش بتحجب حجز جديد في نفس المكان
    });

    // ✋ دي أهم نقطة: بنتأكد إن الميعاد الجديد ملوش أي تعارض مع حجز موجود لنفس الحلاق
    if (hasTimeConflict(existingBookings, startMinutes, endMinutes)) {
      res.status(409); // Conflict
      return next(new Error("الميعاد ده متحجز بالفعل لنفس الحلاق، اختار وقت تاني"));
    }

    const booking = await Booking.create({
      customer: req.userType === "customer" ? req.user._id : req.body.customer,
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
// @desc    عرض الحجوزات (بتختلف حسب مين اللي بيطلب: عميل يشوف بتاعته بس، موظف يشوف حجوزاته، أدمن يشوف الكل)
// @route   GET /api/bookings
// ------------------------------------------
const getBookings = async (req, res, next) => {
  try {
    let filter = {};

    if (req.userType === "customer") {
      filter.customer = req.user._id;
    } else if (req.user.role === "employee") {
      filter.employee = req.user._id;
    }
    // لو أدمن، الفلتر بيفضل فاضي يعني بيشوف كل الحجوزات

    const bookings = await Booking.find(filter)
      .populate("customer", "name phone")
      .populate("employee", "name")
      .populate("services", "name price durationInMinutes")
      .sort({ date: -1, startTime: -1 }); // الأحدث الأول

    res.status(200).json(bookings);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    تحديث حالة الحجز (تأكيد / إتمام / إلغاء)
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
// @desc    عرض المواعيد المتاحة لحلاق معين في يوم معين
// @route   GET /api/bookings/available-slots?employee=xxx&date=2026-08-01
// الفكرة: بنرجع الفترات الفاضية بين حجوزاته بناءً على ساعات عمله
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

    // بنجيب حجوزات الحلاق ده في اليوم ده مرتبة حسب وقت البداية
    const bookings = await Booking.find({
      employee,
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $ne: "cancelled" },
    }).sort({ startTime: 1 });

    // بنحول ساعات عمله لدقايق عشان نقدر نحسب عليها
    const workStart = timeToMinutes(employeeDoc.workingHours.from);
    const workEnd = timeToMinutes(employeeDoc.workingHours.to);

    // بنمشي على الحجوزات ونلاقي الفجوات (الفراغات) اللي بينهم
    const freeSlots = [];
    let cursor = workStart;

    bookings.forEach((booking) => {
      const bookingStart = timeToMinutes(booking.startTime);
      const bookingEnd = timeToMinutes(booking.endTime);

      // لو فيه فراغ قبل الحجز ده، نضيفه كـ slot متاح
      if (bookingStart > cursor) {
        freeSlots.push({ from: minutesToTime(cursor), to: minutesToTime(bookingStart) });
      }
      // بعد كده الـ cursor بيتحرك لآخر وقت الحجز ده
      cursor = Math.max(cursor, bookingEnd);
    });

    // لو فاضل وقت بعد آخر حجز لحد نهاية شغله
    if (cursor < workEnd) {
      freeSlots.push({ from: minutesToTime(cursor), to: minutesToTime(workEnd) });
    }

    res.status(200).json(freeSlots);
  } catch (error) {
    next(error);
  }
};

module.exports = { createBooking, getBookings, updateBookingStatus, getAvailableSlots };
