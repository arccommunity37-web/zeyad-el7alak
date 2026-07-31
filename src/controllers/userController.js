// ==========================================
// الكنترولر ده مسؤول عن إدارة الموظفين (الحلاقين) من قبل الأدمن
// كل الـ endpoints هنا لازم تكون محمية بـ authorize("admin") في الـ routes
// ==========================================

const User = require("../models/User");

// ------------------------------------------
// @desc    عرض كل الموظفين
// @route   GET /api/users
// ------------------------------------------
const getUsers = async (req, res, next) => {
  try {
    // بنجيب كل المستخدمين (مش بنرجع الباسورد أصلاً لأنه select:false في الموديل)
    const users = await User.find({});
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
// @desc    تعديل بيانات موظف (الاسم، ساعات العمل، التخصصات...)
// @route   PUT /api/users/:id
// ------------------------------------------
const updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      return next(new Error("الموظف غير موجود"));
    }

    // بنحدث بس الحقول اللي اتبعتت، والباقي يفضل زي ما هو
    const { name, phone, specialties, workingHours, isActive } = req.body;

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (specialties) user.specialties = specialties;
    if (workingHours) user.workingHours = { ...user.workingHours, ...workingHours };
    if (typeof isActive === "boolean") user.isActive = isActive;

    const updatedUser = await user.save();
    res.status(200).json(updatedUser);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    تعطيل موظف (مش حذف نهائي - عشان البيانات التاريخية متتأثرش)
// @route   DELETE /api/users/:id
// ------------------------------------------
const deactivateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      return next(new Error("الموظف غير موجود"));
    }

    // بدل ما نمسحه خالص من الداتا بيز، بنعطله بس
    // كده لو ليه حجوزات أو فواتير قديمة، تفضل موجودة وواضحة
    user.isActive = false;
    await user.save();

    res.status(200).json({ message: "تم تعطيل الموظف بنجاح" });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, getUserById, updateUser, deactivateUser };
