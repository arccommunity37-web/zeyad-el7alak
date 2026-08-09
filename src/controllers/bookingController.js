// ==========================================
// الكنترولر ده مسؤول عن الحجوزات - بيدعم وضعين حسب "طريقة الحجز الفعلية لليوم المطلوب"
// وبيدي العميل صلاحية يعدل/يلغي حجزه بنفسه (برقم تليفونه + كلمة سر اختيارية لو حطها)
// والأدمن صلاحية كاملة يعدل/يمسح/يفلتر أي حجز
// ==========================================

const Booking = require("../models/Booking");
const Service = require("../models/Service");
const Customer = require("../models/Customer");
const User = require("../models/User");
const { getOrCreateSettings, getEffectiveModeForDate, isDateClosed } = require("./settingsController");

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};
const minutesToTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

const getDayRange = (date) => {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  return { dayStart, dayEnd };
};

const getWeekdayName = (date) => new Date(date).toLocaleDateString("en-US", { weekday: "long" });

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
// دالة مساعدة مشتركة: بتحدد "المكان" (turn أو startTime أو waitingPosition) لحجز جديد أو
// معدَّل، وبترمي خطأ واضح لو فيه تعارض. excludeBookingId بنستخدمه وقت "تعديل" حجز موجود
// عشان الحجز ماتعارضش مع نفسه
// ------------------------------------------
const resolveBookingSlot = async ({
  effectiveMode,
  employee,
  date,
  settings,
  startTime,
  waitingPosition,
  excludeBookingId = null,
}) => {
  const { dayStart, dayEnd } = getDayRange(date);
  const excludeClause = excludeBookingId ? { _id: { $ne: excludeBookingId } } : {};

  if (effectiveMode === "queue") {
    const bookingsCountToday = await Booking.countDocuments({
      employee,
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $ne: "cancelled" },
      ...excludeClause,
    });

    if (settings.queueLimitEnabled && bookingsCountToday >= settings.queueLimit) {
      const err = new Error("الأدوار المتاحة خلصت النهاردة، جرب يوم تاني");
      err.statusCode = 409;
      throw err;
    }

    return { turn: bookingsCountToday + 1, startTime: null, isWaiting: false, waitingPosition: null };
  }

  if (effectiveMode === "time") {
    if (startTime && waitingPosition) {
      const err = new Error("حدد إما معاد أو مكان في قايمة الانتظار، مش الاتنين");
      err.statusCode = 400;
      throw err;
    }

    if (startTime) {
      const conflict = await Booking.findOne({
        employee,
        date: { $gte: dayStart, $lte: dayEnd },
        startTime,
        isWaiting: false,
        status: { $ne: "cancelled" },
        ...excludeClause,
      });
      if (conflict) {
        const err = new Error("المعاد ده اتحجز قبل ما تأكد، اختار معاد تاني");
        err.statusCode = 409;
        throw err;
      }
      return { turn: null, startTime, isWaiting: false, waitingPosition: null };
    }

    if (waitingPosition) {
      if (waitingPosition < 1 || waitingPosition > settings.waitingListCapacity) {
        const err = new Error("رقم قايمة الانتظار غير صالح");
        err.statusCode = 400;
        throw err;
      }
      const conflict = await Booking.findOne({
        employee,
        date: { $gte: dayStart, $lte: dayEnd },
        waitingPosition,
        isWaiting: true,
        status: { $ne: "cancelled" },
        ...excludeClause,
      });
      if (conflict) {
        const err = new Error("المكان ده في قايمة الانتظار اتحجز قبل ما تأكد، اختار رقم تاني");
        err.statusCode = 409;
        throw err;
      }
      return { turn: null, startTime: null, isWaiting: true, waitingPosition };
    }

    const err = new Error("لازم تحدد معاد أو مكان في قايمة الانتظار");
    err.statusCode = 400;
    throw err;
  }

  const err = new Error("وضع الحجز في إعدادات المحل غير صالح");
  err.statusCode = 500;
  throw err;
};

// ------------------------------------------
// دالة مساعدة: بتتحقق إن اللي بيعدل/يلغي الحجز فعلاً صاحبه (برقم التليفون)
// ولو الحجز عليه كلمة سر، لازم تتبعت وتكون صح كمان
// ------------------------------------------
const verifyOwnership = async (bookingId, customerPhone, password) => {
  const booking = await Booking.findById(bookingId).select("+cancelPassword");

  if (!booking) {
    const err = new Error("الحجز غير موجود");
    err.statusCode = 404;
    throw err;
  }

  if (booking.customerPhone !== customerPhone) {
    const err = new Error("رقم التليفون مش مطابق لصاحب الحجز");
    err.statusCode = 403;
    throw err;
  }

  if (booking.cancelPassword) {
    if (!password) {
      const err = new Error("الحجز ده محمي بكلمة سر، لازم تدخلها");
      err.statusCode = 401;
      throw err;
    }
    const isMatch = await booking.compareCancelPassword(password);
    if (!isMatch) {
      const err = new Error("كلمة السر غلط");
      err.statusCode = 401;
      throw err;
    }
  }

  return booking;
};

// ------------------------------------------
// @desc    إنشاء حجز جديد - Public
// @route   POST /api/bookings
// body: { customerName, customerPhone, employee, services, date, notes?, startTime?, waitingPosition?, cancelPassword? }
// ------------------------------------------
const createBooking = async (req, res, next) => {
  try {
    const {
      customerName,
      customerPhone,
      employee,
      services,
      date,
      notes,
      startTime,
      waitingPosition,
      cancelPassword,
    } = req.body;

    if (!customerName || !customerPhone) {
      res.status(400);
      return next(new Error("الاسم ورقم التليفون مطلوبين"));
    }

    // ✋ لو اليوم ده مقفول بالكامل، نرفض الحجز فورًا قبل أي حاجة تانية
    if (await isDateClosed(date)) {
      res.status(403);
      return next(new Error("اليوم ده مقفول، اختار يوم تاني"));
    }

    const customer = await findOrCreateCustomer(customerName, customerPhone);

    const selectedServices = await Service.find({ _id: { $in: services } });
    if (selectedServices.length === 0) {
      res.status(400);
      return next(new Error("لازم تختار خدمة واحدة على الأقل"));
    }
    const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

    const settings = await getOrCreateSettings();
    const effectiveMode = await getEffectiveModeForDate(date);

    const slot = await resolveBookingSlot({
      effectiveMode,
      employee,
      date,
      settings,
      startTime,
      waitingPosition,
    });

    const booking = await Booking.create({
      customer: customer._id,
      customerName,
      customerPhone,
      employee,
      services,
      date,
      notes,
      totalPrice,
      cancelPassword: cancelPassword || null, // اختيارية تمامًا
      ...slot,
    });

    res.status(201).json(booking);
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

// ------------------------------------------
// @desc    العميل بيعدل حجزه بنفسه (تغيير حلاق/يوم/معاد/خدمات) - Public
// لازم يثبت ملكيته برقم تليفونه (+ كلمة السر لو الحجز محمي بيها)
// @route   PUT /api/bookings/:id
// body: { customerPhone, password?, employee?, services?, date?, notes?, startTime?, waitingPosition? }
// ------------------------------------------
const customerUpdateBooking = async (req, res, next) => {
  try {
    const { customerPhone, password, employee, services, date, notes, startTime, waitingPosition } =
      req.body;

    if (!customerPhone) {
      res.status(400);
      return next(new Error("رقم التليفون مطلوب للتأكد إنك صاحب الحجز"));
    }

    const booking = await verifyOwnership(req.params.id, customerPhone, password);

    if (["completed", "cancelled"].includes(booking.status)) {
      res.status(400);
      return next(new Error("الحجز ده خلص أو اتلغى، مينفعش تعدله"));
    }

    const newEmployee = employee || booking.employee;
    const newDate = date || booking.date;

    // لو غيّر الحلاق أو اليوم أو معاد/مكان الانتظار، لازم نحسب "مكانه" الجديد من الأول
    const dateOrSlotChanged =
      Boolean(employee) || Boolean(date) || Boolean(startTime) || Boolean(waitingPosition);

    if (dateOrSlotChanged) {
      // ✋ لو غيّر اليوم لواحد مقفول، نرفض التعديل
      if (date && (await isDateClosed(newDate))) {
        res.status(403);
        return next(new Error("اليوم ده مقفول، اختار يوم تاني"));
      }

      const settings = await getOrCreateSettings();
      const effectiveMode = await getEffectiveModeForDate(newDate);

      const slot = await resolveBookingSlot({
        effectiveMode,
        employee: newEmployee,
        date: newDate,
        settings,
        startTime,
        waitingPosition,
        excludeBookingId: booking._id,
      });

      Object.assign(booking, slot);
    }

    if (employee) booking.employee = employee;
    if (date) booking.date = date;
    if (typeof notes === "string") booking.notes = notes;

    if (services && services.length > 0) {
      const selectedServices = await Service.find({ _id: { $in: services } });
      booking.services = services;
      booking.totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
    }

    // بعد أي تعديل، الحجز يرجع "قيد الانتظار" تاني عشان الأدمن يراجعه
    booking.status = "pending";

    await booking.save();
    res.status(200).json(booking);
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

// ------------------------------------------
// @desc    العميل بيلغي حجزه بنفسه - Public
// @route   PUT /api/bookings/:id/cancel
// body: { customerPhone, password? }
// ------------------------------------------
const customerCancelBooking = async (req, res, next) => {
  try {
    const { customerPhone, password } = req.body;

    if (!customerPhone) {
      res.status(400);
      return next(new Error("رقم التليفون مطلوب للتأكد إنك صاحب الحجز"));
    }

    const booking = await verifyOwnership(req.params.id, customerPhone, password);

    booking.status = "cancelled";
    await booking.save();

    res.status(200).json({ message: "تم إلغاء الحجز بنجاح" });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

// ------------------------------------------
// @desc    عرض المعادات والانتظار المتاحة ليوم معين - Public (وضع "الوقت")
// @route   GET /api/bookings/time-slots?employee=xxx&date=2026-08-10
// ------------------------------------------
const getTimeSlots = async (req, res, next) => {
  try {
    const { employee, date } = req.query;

    // ✋ لو اليوم مقفول بالكامل، نرجع فاضي على طول
    if (await isDateClosed(date)) {
      return res.status(200).json({ isDayOff: true, isClosed: true, slots: [], waitingList: [] });
    }

    const employeeDoc = await User.findById(employee);
    if (!employeeDoc) {
      res.status(404);
      return next(new Error("الحلاق غير موجود"));
    }

    const weekday = getWeekdayName(date);
    if (employeeDoc.workingHours.daysOff.includes(weekday)) {
      return res.status(200).json({ isDayOff: true, isClosed: false, slots: [], waitingList: [] });
    }

    const { dayStart, dayEnd } = getDayRange(date);
    const settings = await getOrCreateSettings();

    const allSlots = generateTimeSlots(
      { from: settings.workingHoursFrom, to: settings.workingHoursTo },
      settings.slotDurationMinutes
    );

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

    res.status(200).json({ isDayOff: false, isClosed: false, slots, waitingList });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    عرض الحجوزات - أدمن بس، بيدعم فلترة اختيارية
// @route   GET /api/bookings?status=pending&employee=&date=
// من غير أي فلتر، بيرجع الحجوزات "الحالية" (مش completed ومش cancelled) بس - عشان
// دي شاشة "الحجوزات" الأساسية؛ استخدم status=completed أو status=cancelled لشاشات السجل/المحذوف
// ------------------------------------------
const getBookings = async (req, res, next) => {
  try {
    const { status, employee, date } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    } else {
      filter.status = { $nin: ["completed", "cancelled"] };
    }
    if (employee) filter.employee = employee;
    if (date) {
      const { dayStart, dayEnd } = getDayRange(date);
      filter.date = { $gte: dayStart, $lte: dayEnd };
    }

    const bookings = await Booking.find(filter)
      .populate("employee", "name")
      .populate("services", "name price durationInMinutes")
      .sort({ date: -1, turn: 1, startTime: 1 });

    res.status(200).json(bookings);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    "الأيام السابقة" - كل الحجوزات اللي تاريخها فات، بكل حالاتها (عشان يبان "محدش جه" لو حجز فاضل pending)
// @route   GET /api/bookings/history
// أدمن بس
// ------------------------------------------
const getBookingsHistory = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const bookings = await Booking.find({ date: { $lt: todayStart } })
      .populate("employee", "name")
      .populate("services", "name price durationInMinutes")
      .sort({ date: -1, turn: 1, startTime: 1 });

    res.status(200).json(bookings);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    العميل بيشوف طلباته برقم تليفونه - Public
// كل حجز فيه hasPassword (هل محمي بكلمة سر) وpeopleAhead (لوضع الدور بس)
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
      .select("+cancelPassword")
      .populate("employee", "name")
      .populate("services", "name price durationInMinutes")
      .sort({ date: -1, turn: 1, startTime: 1 })
      .lean();

    const enrichedBookings = await Promise.all(
      bookings.map(async (booking) => {
        const hasPassword = Boolean(booking.cancelPassword);
        delete booking.cancelPassword; // منرجعش الهاش خالص للفرونت

        if (booking.turn === null || booking.turn === undefined) {
          return { ...booking, hasPassword };
        }

        const { dayStart, dayEnd } = getDayRange(booking.date);
        const employeeId = booking.employee?._id || booking.employee;

        const peopleAhead = await Booking.countDocuments({
          employee: employeeId,
          date: { $gte: dayStart, $lte: dayEnd },
          turn: { $lt: booking.turn },
          status: { $nin: ["completed", "cancelled"] },
        });

        return { ...booking, hasPassword, peopleAhead };
      })
    );

    res.status(200).json(enrichedBookings);
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
// @desc    تعديل كامل لأي حجز - أدمن بس (بيقدر يغيّر أي حاجة فيه، شامل السعر - مهم لطباعة الفاتورة)
// @route   PUT /api/bookings/:id/admin
// ------------------------------------------
const adminUpdateBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      res.status(404);
      return next(new Error("الحجز غير موجود"));
    }

    const {
      customerName,
      customerPhone,
      employee,
      services,
      date,
      notes,
      startTime,
      waitingPosition,
      turn,
      status,
      totalPrice, // ✋ الأدمن يقدر يعدل السعر يدوي (مهم وقت طباعة الفاتورة)
    } = req.body;

    const newEmployee = employee || booking.employee;
    const newDate = date || booking.date;
    const slotFieldsChanged =
      Boolean(employee) || Boolean(date) || Boolean(startTime) || Boolean(waitingPosition) ||
      typeof turn === "number";

    if (slotFieldsChanged && typeof turn !== "number") {
      // لو الأدمن مش بيحدد رقم الدور يدوي، بنحسبه زي العميل بالظبط
      const settings = await getOrCreateSettings();
      const effectiveMode = await getEffectiveModeForDate(newDate);
      const slot = await resolveBookingSlot({
        effectiveMode,
        employee: newEmployee,
        date: newDate,
        settings,
        startTime,
        waitingPosition,
        excludeBookingId: booking._id,
      });
      Object.assign(booking, slot);
    } else if (typeof turn === "number") {
      // الأدمن يقدر يحط رقم دور يدوي مباشرة من غير أي تحقق (تحكم كامل)
      booking.turn = turn;
      booking.startTime = startTime || null;
      booking.isWaiting = Boolean(waitingPosition);
      booking.waitingPosition = waitingPosition || null;
    }

    if (customerName) booking.customerName = customerName;
    if (customerPhone) booking.customerPhone = customerPhone;
    if (employee) booking.employee = employee;
    if (date) booking.date = date;
    if (typeof notes === "string") booking.notes = notes;
    if (status) booking.status = status;
    if (typeof totalPrice === "number") booking.totalPrice = totalPrice;

    if (services && services.length > 0) {
      booking.services = services;
      // لو الأدمن معدلش السعر يدوي، بنحسبه من الخدمات الجديدة تلقائيًا
      if (typeof totalPrice !== "number") {
        const selectedServices = await Service.find({ _id: { $in: services } });
        booking.totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
      }
    }

    await booking.save();
    res.status(200).json(booking);
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

// ------------------------------------------
// @desc    حذف حجز واحد نهائيًا - أدمن بس
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
// @desc    حذف كل حجوزات يوم معين (أو حلاق معين، أو حالة معينة) دفعة واحدة - أدمن بس
// مفيدة لمسح يوم كامل من السجل أو من المحذوف
// @route   DELETE /api/bookings/bulk?employee=&date=&status=
// ------------------------------------------
const bulkDeleteBookings = async (req, res, next) => {
  try {
    const { employee, date, status } = req.query;

    if (!employee && !date && !status) {
      res.status(400);
      return next(new Error("لازم تحدد فلتر واحد على الأقل (يوم أو حلاق أو حالة) عشان الحذف الجماعي"));
    }

    const filter = {};
    if (employee) filter.employee = employee;
    if (status) filter.status = status;
    if (date) {
      const { dayStart, dayEnd } = getDayRange(date);
      filter.date = { $gte: dayStart, $lte: dayEnd };
    }

    const result = await Booking.deleteMany(filter);
    res.status(200).json({ message: `تم حذف ${result.deletedCount} حجز` });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    معرفة عدد الحجوزات لحلاق معين في يوم معين - Public (وضع "الدور")
// @route   GET /api/bookings/queue-count?employee=xxx&date=2026-08-10
// ------------------------------------------
const getQueueCount = async (req, res, next) => {
  try {
    const { employee, date } = req.query;

    // ✋ لو اليوم مقفول بالكامل، نرجع "مليان" فورًا عشان الفرونت يمنع الحجز
    if (await isDateClosed(date)) {
      return res.status(200).json({
        currentQueueCount: 0,
        nextTurn: null,
        isFull: true,
        isClosed: true,
        queueLimitEnabled: false,
        queueLimit: null,
      });
    }

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
      isClosed: false,
      queueLimitEnabled: settings.queueLimitEnabled,
      queueLimit: settings.queueLimit,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBooking,
  customerUpdateBooking,
  customerCancelBooking,
  getBookings,
  getBookingsHistory,
  lookupBookingsByPhone,
  updateBookingStatus,
  adminUpdateBooking,
  deleteBooking,
  bulkDeleteBookings,
  getQueueCount,
  getTimeSlots,
};