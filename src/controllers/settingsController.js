// ==========================================
// الكنترولر ده مسؤول عن إعدادات الحجز العامة (Singleton) + استثناءات طريقة الحجز لكل يوم بالذات
// ==========================================

const BookingSettings = require("../models/BookingSettings");
const DayModeOverride = require("../models/DayModeOverride");

// ------------------------------------------
// دالة مساعدة: بترجع وثيقة الإعدادات، ولو مفيش وثيقة أصلاً (أول مرة) بتنشئها بالقيم الافتراضية
// ------------------------------------------
const getOrCreateSettings = async () => {
  let settings = await BookingSettings.findOne({});
  if (!settings) {
    settings = await BookingSettings.create({});
  }
  return settings;
};

// دالة مساعدة: بتحول أي تاريخ لصيغة نصية موحدة "YYYY-MM-DD" (بتوقيت السيرفر المحلي)
// عشان نضمن إن نفس اليوم دايمًا بيدي نفس المفتاح، مهما كانت صيغة التاريخ الجاية من الفرونت
const formatDateKey = (date) => {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// ------------------------------------------
// دالة مساعدة أساسية: بترجع طريقة الحجز "الفعلية" ليوم معين بالذات
// لو فيه استثناء متسجل لليوم ده، بيرجعه هو، وإلا بيرجع الوضع العام من BookingSettings
// الدالة دي بيستخدمها bookingController مباشرة (مش بس الراوت العام)
// ------------------------------------------
const getEffectiveModeForDate = async (date) => {
  const dateKey = formatDateKey(date);
  const override = await DayModeOverride.findOne({ dateKey });
  if (override) return override.mode;

  const settings = await getOrCreateSettings();
  return settings.mode;
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
      isBookingPaused,
    } = req.body;

    if (mode) settings.mode = mode;
    if (typeof queueLimitEnabled === "boolean") settings.queueLimitEnabled = queueLimitEnabled;
    if (typeof queueLimit === "number") settings.queueLimit = queueLimit;
    if (typeof waitingListCapacity === "number") settings.waitingListCapacity = waitingListCapacity;
    if (workingHoursFrom) settings.workingHoursFrom = workingHoursFrom;
    if (workingHoursTo) settings.workingHoursTo = workingHoursTo;
    if (typeof slotDurationMinutes === "number") settings.slotDurationMinutes = slotDurationMinutes;
    if (typeof isBookingPaused === "boolean") settings.isBookingPaused = isBookingPaused;

    await settings.save();
    res.status(200).json(settings);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    عرض طريقة الحجز الفعلية ليوم معين بالذات - Public
// الفرونت اند بينادي الـ endpoint ده أول ما يفتح صفحة الحجز لتاريخ معين، عشان يعرف يعرض واجهة إيه
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
    const settings = await getOrCreateSettings();
    res.status(200).json({ date, mode, isBookingPaused: settings.isBookingPaused });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    تحديد طريقة حجز مخصصة ليوم معين بالذات (استثناء عن الوضع العام) - أدمن بس
// @route   PUT /api/settings/booking/day-override
// body المتوقع: { date, mode }
// ------------------------------------------
const setDayOverride = async (req, res, next) => {
  try {
    const { date, mode } = req.body;

    if (!date || !["queue", "time"].includes(mode)) {
      res.status(400);
      return next(new Error('التاريخ وطريقة الحجز ("queue" أو "time") مطلوبين'));
    }

    const dateKey = formatDateKey(date);

    // upsert: لو فيه استثناء لنفس اليوم بالفعل، بيتحدث بدل ما يتكرر
    const override = await DayModeOverride.findOneAndUpdate(
      { dateKey },
      { dateKey, mode },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json(override);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    إلغاء الاستثناء الخاص بيوم معين (يرجع يستخدم الوضع العام تاني) - أدمن بس
// @route   DELETE /api/settings/booking/day-override/:date
// ------------------------------------------
const deleteDayOverride = async (req, res, next) => {
  try {
    const dateKey = formatDateKey(req.params.date);
    await DayModeOverride.findOneAndDelete({ dateKey });
    res.status(200).json({ message: "تم إلغاء الاستثناء، اليوم ده هيستخدم الوضع العام تاني" });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    عرض كل الاستثناءات المضبوطة حاليًا (لعرضها في تقويم لوحة التحكم) - أدمن بس
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
  getEffectiveMode,
  setDayOverride,
  deleteDayOverride,
  getAllDayOverrides,
};