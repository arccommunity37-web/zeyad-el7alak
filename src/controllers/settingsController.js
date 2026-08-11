// ==========================================
// الكنترولر ده مسؤول عن إعدادات الحجز العامة (Singleton) + إعدادات مخصصة لكل يوم بالذات
// أي حقل الأدمن مايحددوش ليوم معين، بيرجع يستخدم القيمة العامة تلقائيًا
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
// ⭐ الدالة الأهم: بترجع "الإعدادات الفعلية الكاملة" ليوم معين بالذات
// بتدمج بين استثناء اليوم (لو موجود) والإعداد العام - أي حقل مش محدد لليوم، بياخد القيمة العامة
// bookingController بيستخدمها في كل حاجة (حجز جديد، عرض معادات، عرض عدد الدور...)
// ------------------------------------------
const getEffectiveSettingsForDate = async (date) => {
  const dateKey = formatDateKey(date);
  const override = await DayModeOverride.findOne({ dateKey });
  const globalSettings = await getOrCreateSettings();

  const isClosedGlobally = Boolean(globalSettings.isShopClosed);

  return {
    mode: override?.mode ?? globalSettings.mode,
    isClosed: isClosedGlobally || (override?.isClosed ?? false),
    isShopClosed: isClosedGlobally,
    isBookingPaused: isClosedGlobally,
    queueLimitEnabled: override?.queueLimitEnabled ?? globalSettings.queueLimitEnabled,
    queueLimit: override?.queueLimit ?? globalSettings.queueLimit,
    waitingListCapacity: override?.waitingListCapacity ?? globalSettings.waitingListCapacity,
    workingHoursFrom: override?.workingHoursFrom ?? globalSettings.workingHoursFrom,
    workingHoursTo: override?.workingHoursTo ?? globalSettings.workingHoursTo,
    slotDurationMinutes: override?.slotDurationMinutes ?? globalSettings.slotDurationMinutes,
  };
};

// دالة قديمة لسه مستخدمة في مكان أو اتنين - بترجع بس الوضع (queue/time) الفعلي لليوم
const getEffectiveModeForDate = async (date) => {
  const settings = await getEffectiveSettingsForDate(date);
  return settings.mode;
};

const isDateClosed = async (date) => {
  const settings = await getEffectiveSettingsForDate(date);
  return Boolean(settings.isClosed);
};

// ------------------------------------------
// @desc    عرض إعدادات الحجز العامة الحالية (الافتراضية لكل الأيام) - Public
// @route   GET /api/settings/booking
// ------------------------------------------
const getBookingSettings = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();
    const settingsObj = settings.toObject();
    settingsObj.isBookingPaused = settingsObj.isShopClosed;
    res.status(200).json(settingsObj);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    تحديث إعدادات الحجز العامة (الافتراضية) - أدمن بس
// @route   PUT /api/settings/booking
// ------------------------------------------
const updateBookingSettings = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();

    const {
      isShopClosed,
      isBookingPaused,
      mode,
      queueLimitEnabled,
      queueLimit,
      waitingListCapacity,
      workingHoursFrom,
      workingHoursTo,
      slotDurationMinutes,
    } = req.body;

    const closedVal = isShopClosed !== undefined ? isShopClosed : isBookingPaused;
    if (typeof closedVal === "boolean") settings.isShopClosed = closedVal;
    if (mode) settings.mode = mode;
    if (typeof queueLimitEnabled === "boolean") settings.queueLimitEnabled = queueLimitEnabled;
    if (typeof queueLimit === "number") settings.queueLimit = queueLimit;
    if (typeof waitingListCapacity === "number") settings.waitingListCapacity = waitingListCapacity;
    if (workingHoursFrom) settings.workingHoursFrom = workingHoursFrom;
    if (workingHoursTo) settings.workingHoursTo = workingHoursTo;
    if (typeof slotDurationMinutes === "number") settings.slotDurationMinutes = slotDurationMinutes;

    await settings.save();

    const settingsObj = settings.toObject();
    settingsObj.isBookingPaused = settingsObj.isShopClosed;
    res.status(200).json(settingsObj);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    عرض الإعدادات الفعلية الكاملة ليوم معين بالذات - Public
// العميل بيستخدمها يعرف يعرض واجهة إيه لليوم اللي هيختاره
// @route   GET /api/settings/booking/effective?date=2026-08-10
// ------------------------------------------
const getEffectiveMode = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) {
      res.status(400);
      return next(new Error("التاريخ مطلوب"));
    }

    const effective = await getEffectiveSettingsForDate(date);
    res.status(200).json({ date, ...effective });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    تحديد إعدادات مخصصة ليوم معين بالذات (أي حقل منهم، أو كلهم مع بعض) - أدمن بس
// @route   PUT /api/settings/booking/day-override
// body: { date, mode?, isClosed?, queueLimitEnabled?, queueLimit?, workingHoursFrom?, workingHoursTo?, slotDurationMinutes? }
// ------------------------------------------
const setDayOverride = async (req, res, next) => {
  try {
    const {
      date,
      mode,
      isClosed,
      queueLimitEnabled,
      queueLimit,
      waitingListCapacity,
      workingHoursFrom,
      workingHoursTo,
      slotDurationMinutes,
    } = req.body;

    if (!date) {
      res.status(400);
      return next(new Error("التاريخ مطلوب"));
    }

    if (mode !== undefined && mode !== null && !["queue", "time"].includes(mode)) {
      res.status(400);
      return next(new Error('طريقة الحجز لازم تكون "queue" أو "time"'));
    }

    const dateKey = formatDateKey(date);
    const update = {};
    if (mode !== undefined) update.mode = mode;
    if (typeof isClosed === "boolean") update.isClosed = isClosed;
    if (typeof queueLimitEnabled === "boolean") update.queueLimitEnabled = queueLimitEnabled;
    if (typeof queueLimit === "number") update.queueLimit = queueLimit;
    if (typeof waitingListCapacity === "number") update.waitingListCapacity = waitingListCapacity;
    if (workingHoursFrom) update.workingHoursFrom = workingHoursFrom;
    if (workingHoursTo) update.workingHoursTo = workingHoursTo;
    if (typeof slotDurationMinutes === "number") update.slotDurationMinutes = slotDurationMinutes;

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
// @desc    إلغاء كل الإعدادات المخصصة ليوم معين (يرجع يستخدم الإعداد العام في كل حاجة) - أدمن بس
// @route   DELETE /api/settings/booking/day-override/:date
// ------------------------------------------
const deleteDayOverride = async (req, res, next) => {
  try {
    const dateKey = formatDateKey(req.params.date);
    await DayModeOverride.findOneAndDelete({ dateKey });
    res.status(200).json({ message: "تم إلغاء إعدادات اليوم المخصصة - رجع يستخدم الإعداد العام" });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    عرض كل الأيام اللي ليها إعدادات مخصصة - أدمن بس
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
  getEffectiveSettingsForDate,
  getEffectiveModeForDate,
  isDateClosed,
  getEffectiveMode,
  setDayOverride,
  deleteDayOverride,
  getAllDayOverrides,
};