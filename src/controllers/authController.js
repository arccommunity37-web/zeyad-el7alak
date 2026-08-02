// ==========================================
// الكنترولر ده مسؤول عن التوثيق - وبقى محصور في الأدمن والحلاقين بس (User model)
// مفيش تسجيل دخول للعملاء خالص - العميل بيتعامل مع النظام بالاسم والتليفون بس بدون أي توكن
// ==========================================

const User = require("../models/User");
const generateToken = require("../utils/generateToken");

// ------------------------------------------
// @desc    تسجيل أدمن جديد (أول مرة) أو إضافة حلاق جديد (بعد كده، الأدمن بس اللي يقدر)
// @route   POST /api/auth/register-user
// محمي بميدلوير guardUserRegistration - مفتوح بس لو مفيش أدمن أصلاً في النظام
// ------------------------------------------
const registerUser = async (req, res, next) => {
  try {
    const { name, email, phone, password, role } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      return next(new Error("فيه مستخدم مسجل بالإيميل ده قبل كده"));
    }

    // لو بيضيف حلاق (employee)، الباسورد مش لازم أصلاً لأنه مش هيسجل دخول أبدًا
    const user = await User.create({ name, email, phone, password, role });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      // التوكن بيترجع بس لو أدمن (الحلاق أصلاً مش محتاج توكن لأنه مش هيسجل دخول)
      token: user.role === "admin" ? generateToken(user._id) : null,
    });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    تسجيل دخول الأدمن (بس - مفيش حاجة اسمها تسجيل دخول عميل أو حلاق)
// @route   POST /api/auth/login
// ------------------------------------------
const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    // بندور بالإيميل، ونحول لحروف صغيرة عشان "Admin" و"admin" يتعاملوا كإيميل واحد
    const account = await User.findOne({ email: identifier.toLowerCase() }).select("+password");

    if (!account || account.role !== "admin") {
      res.status(401);
      return next(new Error("بيانات الدخول غير صحيحة"));
    }

    const isMatch = await account.comparePassword(password);
    if (!isMatch) {
      res.status(401);
      return next(new Error("بيانات الدخول غير صحيحة"));
    }

    res.status(200).json({
      _id: account._id,
      name: account.name,
      role: account.role,
      token: generateToken(account._id),
    });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    جلب بيانات الأدمن الحالي (صاحب التوكن)
// @route   GET /api/auth/me
// ------------------------------------------
const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      _id: req.user._id,
      name: req.user.name,
      role: req.user.role,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { registerUser, login, getMe };