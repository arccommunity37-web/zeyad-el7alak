// ==========================================
// الكنترولر ده مسؤول عن إشعارات/تنبيهات المحل - نص بيفضل ظاهر لحد ما الأدمن يعدله أو يمسحه
// ==========================================

const Announcement = require("../models/Announcement");

// ------------------------------------------
// @desc    عرض الإشعارات المفعّلة دلوقتي - Public
// الفرونت اند بينادي الـ endpoint ده في كل صفحات العميل عشان يعرض الشريط المتحرك
// @route   GET /api/announcements/active
// ------------------------------------------
const getActiveAnnouncements = async (req, res, next) => {
  try {
    const announcements = await Announcement.find({ isActive: true }).sort({ createdAt: -1 });
    res.status(200).json(announcements);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    عرض كل الإشعارات (مفعّلة ومخفية) - أدمن بس
// @route   GET /api/announcements
// ------------------------------------------
const getAllAnnouncements = async (req, res, next) => {
  try {
    const announcements = await Announcement.find({}).sort({ createdAt: -1 });
    res.status(200).json(announcements);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    إنشاء إشعار جديد - أدمن بس
// @route   POST /api/announcements
// body: { message }
// ------------------------------------------
const createAnnouncement = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message) {
      res.status(400);
      return next(new Error("نص الإشعار مطلوب"));
    }

    const announcement = await Announcement.create({ message });
    res.status(201).json(announcement);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    تعديل إشعار (النص و/أو إخفاءه مؤقتًا) - أدمن بس
// @route   PUT /api/announcements/:id
// body: { message?, isActive? }
// ------------------------------------------
const updateAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      res.status(404);
      return next(new Error("الإشعار غير موجود"));
    }

    const { message, isActive } = req.body;
    if (message) announcement.message = message;
    if (typeof isActive === "boolean") announcement.isActive = isActive;

    await announcement.save();
    res.status(200).json(announcement);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    حذف إشعار نهائيًا - أدمن بس
// @route   DELETE /api/announcements/:id
// ------------------------------------------
const deleteAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) {
      res.status(404);
      return next(new Error("الإشعار غير موجود"));
    }
    res.status(200).json({ message: "تم حذف الإشعار بنجاح" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActiveAnnouncements,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
};