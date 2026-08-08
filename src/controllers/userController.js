// ==========================================
// الكنترولر ده مسؤول عن إدارة الموظفين (الحلاقين) من قبل الأدمن
// ==========================================

const stream = require("stream");
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");

// دالة رفع الصورة على Cloudinary - نفس الفكرة المستخدمة في باقي الكنترولرز
const uploadBufferToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    bufferStream.pipe(uploadStream);
  });
};

// ------------------------------------------
// @desc    عرض قايمة الحلاقين المتاحين (Public) - العميل يحتاجها وقت اختيار الحلاق في صفحة الحجز
// @route   GET /api/users/employees
// بنرجع بيانات محدودة بس (الاسم، الصورة، التخصصات، ساعات العمل) من غير أي بيانات حساسة
// ------------------------------------------
const getPublicEmployees = async (req, res, next) => {
  try {
    const employees = await User.find({ role: "employee", isActive: true }).select(
      "name specialties workingHours image"
    );
    res.status(200).json(employees);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    عرض كل الموظفين
// @route   GET /api/users
// ------------------------------------------
const getUsers = async (req, res, next) => {
  try {
    const filter = req.query.all === "true" ? {} : { isActive: true };
    const users = await User.find(filter);
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    عرض موظف واحد بالتفصيل
// @route   GET /api/users/:id
// ------------------------------------------
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      return next(new Error("الموظف غير موجود"));
    }
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    تعديل بيانات موظف (الاسم، ساعات العمل، التخصصات، اليوزر نيم...)
// @route   PUT /api/users/:id
// ------------------------------------------
const updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      return next(new Error("الموظف غير موجود"));
    }

    const { name, username, phone, specialties, workingHours, isActive, slotDurationMinutes } =
      req.body;

    if (name) user.name = name;
    if (username) user.username = username;
    if (phone) user.phone = phone;
    if (specialties) user.specialties = specialties;
    if (workingHours) user.workingHours = { ...user.workingHours, ...workingHours };
    if (typeof isActive === "boolean") user.isActive = isActive;
    if (typeof slotDurationMinutes === "number") user.slotDurationMinutes = slotDurationMinutes;

    const updatedUser = await user.save();
    res.status(200).json(updatedUser);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    رفع/تحديث صورة بروفايل الحلاق - أدمن بس
// @route   POST /api/users/:id/image
// ------------------------------------------
const updateUserImage = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      return next(new Error("الموظف غير موجود"));
    }

    if (!req.file) {
      res.status(400);
      return next(new Error("لازم ترفع صورة"));
    }

    // لو كان ليه صورة قديمة، بنحذفها من Cloudinary الأول
    if (user.image && user.image.publicId) {
      await cloudinary.uploader.destroy(user.image.publicId);
    }

    const result = await uploadBufferToCloudinary(req.file.buffer, "barbershop/employees");
    user.image = { url: result.secure_url, publicId: result.public_id };
    await user.save();

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    تعطيل موظف (مش حذف نهائي)
// @route   DELETE /api/users/:id
// ------------------------------------------
const deactivateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      return next(new Error("الموظف غير موجود"));
    }

    user.isActive = false;
    await user.save();

    res.status(200).json({ message: "تم تعطيل الموظف بنجاح" });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    حذف موظف نهائيًا من قاعدة البيانات - أدمن بس
// بيحذف صورته من Cloudinary كمان لو موجودة. ملحوظة: الحجوزات والفواتير القديمة
// اللي كانت مرتبطة بالحلاق ده هتفضل موجودة (فيها اسمه وقت الحجز كنص محفوظ مسبقًا)،
// بس مش هيبقى ليها مرجع حي في جدول الحلاقين
// @route   DELETE /api/users/:id/permanent
// ------------------------------------------
const deleteUserPermanently = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      return next(new Error("الموظف غير موجود"));
    }

    if (user.image && user.image.publicId) {
      await cloudinary.uploader.destroy(user.image.publicId);
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "تم حذف الموظف نهائيًا من قاعدة البيانات" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  updateUserImage,
  deactivateUser,
  deleteUserPermanently,
  getPublicEmployees,
};