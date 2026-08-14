// ==========================================
// الكنترولر ده مسؤول عن "كتالوج قصات الشعر" - الحلاق/الأدمن بيضيف قصة برفع صورة أو أكتر ليها
// والعميل يقدر يتصفحها قبل ما يحجز عشان يختار الشكل اللي عاجبه
// ==========================================

const HaircutStyle = require("../models/HaircutStyle");
const { uploadImage } = require("../utils/uploadImage");

// ------------------------------------------
// @desc    عرض كل قصات الشعر المتاحة (Public)
// @route   GET /api/styles
// ------------------------------------------
const getStyles = async (req, res, next) => {
  try {
    const styles = await HaircutStyle.find({ isActive: true })
      .populate("relatedService", "name price") // بنجيب اسم وسعر الخدمة المرتبطة بس
      .populate("addedBy", "name"); // واسم الحلاق اللي ضافها بس

    res.status(200).json(styles);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    إضافة قصة جديدة مع صورة (أو أكتر) ليها
// @route   POST /api/styles
// ملحوظة: بيستقبل الصور عن طريق multer middleware (اسم الحقل: "images")
// ------------------------------------------
const createStyle = async (req, res, next) => {
  try {
    const { title, relatedService } = req.body;

    // req.files بتتظبط من الـ multer middleware (upload.array("images"))
    if (!req.files || req.files.length === 0) {
      res.status(400);
      return next(new Error("لازم ترفع صورة واحدة على الأقل للقصة"));
    }

    // بنرفع كل صورة على حدة (بعد ضغطها) على Cloudinary، وبننتظر لحد ما كل الصور تخلص رفع
    const uploadedImages = await Promise.all(
      req.files.map((file) => uploadImage(file.buffer, "barbershop/styles"))
    );

    const style = await HaircutStyle.create({
      title,
      relatedService: relatedService || null,
      images: uploadedImages,
      addedBy: req.user._id, // الأدمن اللي مسجل دخول وضاف القصة دي
    });

    res.status(201).json(style);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    إضافة صورة زيادة لقصة موجودة بالفعل
// @route   POST /api/styles/:id/images
// ------------------------------------------
const addImageToStyle = async (req, res, next) => {
  try {
    const style = await HaircutStyle.findById(req.params.id);
    if (!style) {
      res.status(404);
      return next(new Error("القصة غير موجودة"));
    }

    if (!req.files || req.files.length === 0) {
      res.status(400);
      return next(new Error("لازم ترفع صورة واحدة على الأقل"));
    }

    const uploadedImages = await Promise.all(
      req.files.map((file) => uploadImage(file.buffer, "barbershop/styles"))
    );

    // بنضيف الصور الجديدة فوق القديمة، مش بنستبدلها
    style.images.push(...uploadedImages);
    await style.save();

    res.status(200).json(style);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    حذف/تعطيل قصة
// @route   DELETE /api/styles/:id
// ------------------------------------------
const deleteStyle = async (req, res, next) => {
  try {
    const style = await HaircutStyle.findById(req.params.id);
    if (!style) {
      res.status(404);
      return next(new Error("القصة غير موجودة"));
    }

    style.isActive = false;
    await style.save();

    res.status(200).json({ message: "تم حذف القصة بنجاح" });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStyles, createStyle, addImageToStyle, deleteStyle };