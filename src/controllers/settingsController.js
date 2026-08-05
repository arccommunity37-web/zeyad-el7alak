// ==========================================
// الكنترولر ده مسؤول عن إعدادات الحجز العامة (وثيقة واحدة بس في قاعدة البيانات - Singleton)
// ==========================================

const BookingSettings = require("../models/BookingSettings");

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

// ------------------------------------------
// @desc    عرض إعدادات الحجز الحالية - Public
// العميل محتاجها عشان يعرف يعرض واجهة "الدور" ولا واجهة "الوقت"
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
// @desc    تحديث إعدادات الحجز - أدمن بس
// @route   PUT /api/settings/booking
// body المتوقع: أي حقل من { mode, queueLimitEnabled, queueLimit, waitingListCapacity }
// ------------------------------------------
const updateBookingSettings = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();

    const { mode, queueLimitEnabled, queueLimit, waitingListCapacity } = req.body;

    if (mode) settings.mode = mode;
    if (typeof queueLimitEnabled === "boolean") settings.queueLimitEnabled = queueLimitEnabled;
    if (typeof queueLimit === "number") settings.queueLimit = queueLimit;
    if (typeof waitingListCapacity === "number") settings.waitingListCapacity = waitingListCapacity;

    await settings.save();
    res.status(200).json(settings);
  } catch (error) {
    next(error);
  }
};

module.exports = { getBookingSettings, updateBookingSettings, getOrCreateSettings };