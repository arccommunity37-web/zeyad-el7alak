// ==========================================
// الكنترولر ده مسؤول عن إشعارات/تنبيهات المحل اللي بتظهر للعملاء في فترة زمنية محددة
// ==========================================

const Announcement = require("../models/Announcement");

// ------------------------------------------
// @desc    عرض الإشعارات الفعّالة دلوقتي بالظبط (الوقت الحالي بين startAt وendAt) - Public
// الفرونت اند بينادي الـ endpoint ده في كل صفحات العميل عشان يعرض الشريط المتحرك لو فيه إشعار شغال
// @route   GET /api/announcements/active
// ------------------------------------------
const getActiveAnnouncements = async (req, res, next) => {
  try {
    const now = new Date();
    const announcements = await Announcement.find({
      startAt: { $lte: now },
      endAt: { $gte: now },
    }).sort({ startAt: 1 });

    res.status(200).json(announcements);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    عرض كل الإشعارات (شغالة وقديمة ومستقبلية) - أدمن بس
// @route   GET /api/announcements
// ------------------------------------------
const getAllAnnouncements = async (req, res, next) => {
  try {
    const announcements = await Announcement.find({}).sort({ startAt: -1 });
    res.status(200).json(announcements);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    إنشاء إشعار جديد - أدمن بس
// @route   POST /api/announcements
// body: { message, startAt, endAt }
// ------------------------------------------
const createAnnouncement = async (req, res, next) => {
  try {
    const { message, startAt, endAt } = req.body;

    if (!message || !startAt || !endAt) {
      res.status(400);
      return next(new Error("النص ووقت البداية ووقت النهاية كلهم مطلوبين"));
    }

    const announcement = await Announcement.create({ message, startAt, endAt });
    res.status(201).json(announcement);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    تعديل إشعار - أدمن بس
// @route   PUT /api/announcements/:id
// ------------------------------------------
const updateAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      res.status(404);
      return next(new Error("الإشعار غير موجود"));
    }

    const { message, startAt, endAt } = req.body;
    if (message) announcement.message = message;
    if (startAt) announcement.startAt = startAt;
    if (endAt) announcement.endAt = endAt;

    await announcement.save();
    res.status(200).json(announcement);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    حذف إشعار - أدمن بس
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