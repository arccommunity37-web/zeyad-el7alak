// ==========================================
// الكنترولر ده مسؤول عن الحجوزات - بيدعم وضعين حسب إعدادات المحل (BookingSettings.mode):
// - "queue": حجز بالدور بس (مع حد أقصى اختياري لعدد الأدوار في اليوم)
// - "time": حجز بمعاد محدد (حسب ساعات شغل ومدة حجز كل حلاق)، ولو المعاد مشغول العميل يقدر
//           يختار مكان في قايمة الانتظار (سعتها بيحددها الأدمن)
// ==========================================

const Booking = require("../models/Booking");
const Service = require("../models/Service");
const Customer = require("../models/Customer");
const User = require("../models/User");
const { getOrCreateSettings } = require("./settingsController");

// تحويل "HH:mm" لعدد دقايق، والعكس
const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};
const minutesToTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

// بتحسب حدود اليوم (من 00:00 لـ 23:59) عشان نقدر نفلتر بالتاريخ صح
const getDayRange = (date) => {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  return { dayStart, dayEnd };
};

// بترجع اسم اليوم بالإنجليزي (زي "Friday") عشان نقارنه بـ workingHours.daysOff
const getWeekdayName = (date) => {
  return new Date(date).toLocaleDateString("en-US", { weekday: "long" });
};

// ------------------------------------------
// دالة مساعدة: بتولّد كل المعادات الممكنة ليوم معين حسب ساعات شغل الحلاق ومدة الحجز بتاعته
// ------------------------------------------
const generateTimeSlots = (workingHours, slotDurationMinutes) => {
  const slots = [];
  let cursor = timeToMinutes(workingHours.from);
  const end = timeToMinutes(workingHours.to);

  while (cursor + slotDurationMinutes <= end) {
    slots.push(minutesToTime(cursor));
    cursor += slotDurationMinutes;
  }
  return slots;
};

// ------------------------------------------
// دالة مساعدة مشتركة: بتدور على عميل برقم تليفونه، ولو مش موجود بتنشئه
// ------------------------------------------
const findOrCreateCustomer = async (customerName, customerPhone) => {
  let customer = await Customer.findOne({ phone: customerPhone });
  if (!customer) {
    customer = await Customer.create({ name: customerName, phone: customerPhone });
  } else if (customer.name !== customerName) {
    customer.name = customerName;
    await customer.save();
  }
  return customer;
};

// ------------------------------------------
// @desc    إنشاء حجز جديد - Public، سلوكه بيختلف حسب وضع الحجز الحالي في المحل
// @route   POST /api/bookings
// body دايمًا فيه: { customerName, customerPhone, employee, services, date, notes? }
// في وضع "time" لازم كمان: { startTime } أو { waitingPosition } (واحد بس مش الاتنين)
// ------------------------------------------
const createBooking = async (req, res, next) => {
  try {
    const { customerName, customerPhone, employee, services, date, notes, startTime, waitingPosition } =
      req.body;

    if (!customerName || !customerPhone) {
      res.status(400);
      return next(new Error("الاسم ورقم التليفون مطلوبين"));
    }

    const customer = await findOrCreateCustomer(customerName, customerPhone);

    const selectedServices = await Service.find({ _id: { $in: services } });
    if (selectedServices.length === 0) {
      res.status(400);
      return next(new Error("لازم تختار خدمة واحدة على الأقل"));
    }
    const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

    const settings = await getOrCreateSettings();
    const { dayStart, dayEnd } = getDayRange(date);

    const baseBookingData = {
      customer: customer._id,
      customerName,
      customerPhone,
      employee,
      services,
      date,
      totalPrice,
      notes,
    };

    // ========== وضع "الدور" ==========
    if (settings.mode === "queue") {
      const bookingsCountToday = await Booking.countDocuments({
        employee,
        date: { $gte: dayStart, $lte: dayEnd },
        status: { $ne: "cancelled" },
      });

      // ✋ لو الأدمن حاطط حد أقصى وخلص، نرفض الحجز
      if (settings.queueLimitEnabled && bookingsCountToday >= settings.queueLimit) {
        res.status(409);
        return next(new Error("الأدوار المتاحة خلصت النهاردة، جرب يوم تاني"));
      }

      const booking = await Booking.create({ ...baseBookingData, turn: bookingsCountToday + 1 });
      return res.status(201).json(booking);
    }

    // ========== وضع "الوقت" ==========
    if (settings.mode === "time") {
      // العميل لازم يحدد إما معاد حقيقي أو رقم في قايمة الانتظار - مش الاتنين ومش ولا واحد
      if (startTime && waitingPosition) {
        res.status(400);
        return next(new Error("حدد إما معاد أو مكان في قايمة الانتظار، مش الاتنين"));
      }

      if (startTime) {
        // بنتأكد إن حد ماحجزش نفس المعاد ده قبلنا (Race condition بسيط بس بيغطي أغلب الحالات)
        const conflict = await Booking.findOne({
          employee,
          date: { $gte: dayStart, $lte: dayEnd },
          startTime,
          isWaiting: false,
          status: { $ne: "cancelled" },
        });

        if (conflict) {
          res.status(409);
          return next(new Error("المعاد ده اتحجز قبل ما تأكد، اختار معاد تاني"));
        }

        const booking = await Booking.create({ ...baseBookingData, startTime, isWaiting: false });
        return res.status(201).json(booking);
      }

      if (waitingPosition) {
        if (waitingPosition < 1 || waitingPosition > settings.waitingListCapacity) {
          res.status(400);
          return next(new Error("رقم قايمة الانتظار غير صالح"));
        }

        const conflict = await Booking.findOne({
          employee,
          date: { $gte: dayStart, $lte: dayEnd },
          waitingPosition,
          isWaiting: true,
          status: { $ne: "cancelled" },
        });

        if (conflict) {
          res.status(409);
          return next(new Error("المكان ده في قايمة الانتظار اتحجز قبل ما تأكد، اختار رقم تاني"));
        }

        const booking = await Booking.create({
          ...baseBookingData,
          isWaiting: true,
          waitingPosition,
        });
        return res.status(201).json(booking);
      }

      res.status(400);
      return next(new Error("لازم تحدد معاد أو مكان في قايمة الانتظار"));
    }

    // احتياطي: لو وضع غير متعرف عليه لأي سبب
    res.status(500);
    next(new Error("وضع الحجز في إعدادات المحل غير صالح"));
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    عرض المعادات والانتظار المتاحة ليوم معين مع حلاق معين - Public (وضع "الوقت" بس)
// @route   GET /api/bookings/time-slots?employee=xxx&date=2026-08-10
// ------------------------------------------
const getTimeSlots = async (req, res, next) => {
  try {
    const { employee, date } = req.query;

    const employeeDoc = await User.findById(employee);
    if (!employeeDoc) {
      res.status(404);
      return next(new Error("الحلاق غير موجود"));
    }

    const weekday = getWeekdayName(date);
    if (employeeDoc.workingHours.daysOff.includes(weekday)) {
      return res.status(200).json({ isDayOff: true, slots: [], waitingList: [] });
    }

    const { dayStart, dayEnd } = getDayRange(date);
    const settings = await getOrCreateSettings();

    // كل المعادات الحقيقية الممكنة حسب ساعات شغل ومدة حجز الحلاق ده
    const allSlots = generateTimeSlots(employeeDoc.workingHours, employeeDoc.slotDurationMinutes);

    // المعادات المحجوزة فعليًا (مش ملغية)
    const bookedTimeDocs = await Booking.find({
      employee,
      date: { $gte: dayStart, $lte: dayEnd },
      isWaiting: false,
      startTime: { $ne: null },
      status: { $ne: "cancelled" },
    }).select("startTime");
    const bookedTimes = new Set(bookedTimeDocs.map((b) => b.startTime));

    const slots = allSlots.map((time) => ({
      time,
      status: bookedTimes.has(time) ? "booked" : "available",
    }));

    // أماكن قايمة الانتظار المحجوزة
    const bookedWaitingDocs = await Booking.find({
      employee,
      date: { $gte: dayStart, $lte: dayEnd },
      isWaiting: true,
      status: { $ne: "cancelled" },
    }).select("waitingPosition");
    const bookedPositions = new Set(bookedWaitingDocs.map((b) => b.waitingPosition));

    const waitingList = [];
    for (let i = 1; i <= settings.waitingListCapacity; i++) {
      waitingList.push({ position: i, status: bookedPositions.has(i) ? "booked" : "available" });
    }

    res.status(200).json({ isDayOff: false, slots, waitingList });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    عرض كل الحجوزات - أدمن بس
// @route   GET /api/bookings
// ------------------------------------------
const getBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({})
      .populate("employee", "name")
      .populate("services", "name price durationInMinutes")
      .sort({ date: -1, turn: 1, startTime: 1 });

    res.status(200).json(bookings);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    العميل بيشوف طلباته برقم تليفونه بس - Public
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
      .sort({ date: -1, turn: 1, startTime: 1 });

    res.status(200).json(bookings);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    تحديث حالة الحجز (تأكيد/إتمام/إلغاء) - أدمن بس
// لو الحالة اتغيرت لـ "cancelled"، المعاد/رقم الانتظار بيرجع فاضي تلقائيًا
// (مش محتاج أي كود إضافي هنا فعليًا، لأن كل الاستعلامات فوق أصلاً بتستبعد status=cancelled)
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
// @desc    حذف حجز نهائيًا - أدمن بس
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
// @desc    معرفة عدد الحجوزات الموجودة فعلاً لحلاق معين في يوم معين - Public (وضع "الدور" بس)
// @route   GET /api/bookings/queue-count?employee=xxx&date=2026-08-10
// ------------------------------------------
const getQueueCount = async (req, res, next) => {
  try {
    const { employee, date } = req.query;
    const { dayStart, dayEnd } = getDayRange(date);

    const count = await Booking.countDocuments({
      employee,
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $ne: "cancelled" },
    });

    const settings = await getOrCreateSettings();
    const isFull = settings.queueLimitEnabled && count >= settings.queueLimit;

    res.status(200).json({
      currentQueueCount: count,
      nextTurn: count + 1,
      isFull,
      queueLimitEnabled: settings.queueLimitEnabled,
      queueLimit: settings.queueLimit,
    });
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
  getTimeSlots,
};