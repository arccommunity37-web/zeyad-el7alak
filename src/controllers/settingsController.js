// ==========================================
// الكنترولر ده مسؤول عن إعدادات الحجز العامة (Singleton) + استثناءات كل يوم بالذات
// (تغيير طريقة الحجز ليوم معين، و/أو قفل اليوم بالكامل من أي حجز)
// ==========================================

const BookingSettings = require("../models/BookingSettings");
const DayModeOverride = require("../models/DayModeOverride");

const getOrCreateSettings = async () => {
  let settings = await BookingSettings.findOne({});
  if (!settings) {
    settings = await BookingSettings.create({});
  }
  return settings;
};

const formatDateKey = (date) => {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// ------------------------------------------
// دالة مساعدة أساسية: بترجع طريقة الحجز "الفعلية" ليوم معين بالذات
// ------------------------------------------
const getEffectiveModeForDate = async (date) => {
  const dateKey = formatDateKey(date);
  const override = await DayModeOverride.findOne({ dateKey });
  if (override && override.mode) return override.mode;

  const settings = await getOrCreateSettings();
  return settings.mode;
};

// ------------------------------------------
// دالة مساعدة أساسية: بتتحقق هل يوم معين مقفول بالكامل ولا لأ
// bookingController بيستخدمها قبل أي عملية حجز/عرض معادات
// ------------------------------------------
const isDateClosed = async (date) => {
  const dateKey = formatDateKey(date);
  const override = await DayModeOverride.findOne({ dateKey });
  return Boolean(override && override.isClosed);
};

// ------------------------------------------
// @desc    عرض إعدادات الحجز العامة الحالية - Public
// @route   GET /api/settings/booking
// ------------------------------------------
const getBookingSettings = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();
    res.status(200).json(settings);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    تحديث إعدادات الحجز العامة - أدمن بس
// @route   PUT /api/settings/booking
// ------------------------------------------
const updateBookingSettings = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();

    const {
      mode,
      queueLimitEnabled,
      queueLimit,
      waitingListCapacity,
      workingHoursFrom,
      workingHoursTo,
      slotDurationMinutes,
    } = req.body;

    if (mode) settings.mode = mode;
    if (typeof queueLimitEnabled === "boolean") settings.queueLimitEnabled = queueLimitEnabled;
    if (typeof queueLimit === "number") settings.queueLimit = queueLimit;
    if (typeof waitingListCapacity === "number") settings.waitingListCapacity = waitingListCapacity;
    if (workingHoursFrom) settings.workingHoursFrom = workingHoursFrom;
    if (workingHoursTo) settings.workingHoursTo = workingHoursTo;
    if (typeof slotDurationMinutes === "number") settings.slotDurationMinutes = slotDurationMinutes;

    await settings.save();
    res.status(200).json(settings);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    عرض طريقة الحجز الفعلية وحالة القفل ليوم معين بالذات - Public
// @route   GET /api/settings/booking/effective?date=2026-08-10
// ------------------------------------------
const getEffectiveMode = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) {
      res.status(400);
      return next(new Error("التاريخ مطلوب"));
    }

    const mode = await getEffectiveModeForDate(date);
    const closed = await isDateClosed(date);

    res.status(200).json({ date, mode, isClosed: closed });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    تحديد طريقة حجز مخصصة ليوم معين، و/أو قفله بالكامل - أدمن بس
// @route   PUT /api/settings/booking/day-override
// body المتوقع: { date, mode?, isClosed? } - لازم واحد منهم على الأقل
// ------------------------------------------
const setDayOverride = async (req, res, next) => {
  try {
    const { date, mode, isClosed } = req.body;

    if (!date) {
      res.status(400);
      return next(new Error("التاريخ مطلوب"));
    }

    if (mode === undefined && isClosed === undefined) {
      res.status(400);
      return next(new Error('لازم تحدد "mode" أو "isClosed" على الأقل'));
    }

    if (mode !== undefined && mode !== null && !["queue", "time"].includes(mode)) {
      res.status(400);
      return next(new Error('طريقة الحجز لازم تكون "queue" أو "time"'));
    }

    const dateKey = formatDateKey(date);
    const update = {};
    if (mode !== undefined) update.mode = mode;
    if (typeof isClosed === "boolean") update.isClosed = isClosed;

    const override = await DayModeOverride.findOneAndUpdate(
      { dateKey },
      { dateKey, ...update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json(override);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    إلغاء الاستثناء الخاص بيوم معين بالكامل (يرجع اليوم مفتوح وبالوضع العام) - أدمن بس
// @route   DELETE /api/settings/booking/day-override/:date
// ------------------------------------------
const deleteDayOverride = async (req, res, next) => {
  try {
    const dateKey = formatDateKey(req.params.date);
    await DayModeOverride.findOneAndDelete({ dateKey });
    res.status(200).json({ message: "تم إلغاء الاستثناء - اليوم رجع مفتوح وبيستخدم الوضع العام" });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    عرض كل الاستثناءات المضبوطة حاليًا - أدمن بس
// @route   GET /api/settings/booking/day-overrides
// ------------------------------------------
const getAllDayOverrides = async (req, res, next) => {
  try {
    const overrides = await DayModeOverride.find({}).sort({ dateKey: 1 });
    res.status(200).json(overrides);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBookingSettings,
  updateBookingSettings,
  getOrCreateSettings,
  getEffectiveModeForDate,
  isDateClosed,
  getEffectiveMode,
  setDayOverride,
  deleteDayOverride,
  getAllDayOverrides,
};