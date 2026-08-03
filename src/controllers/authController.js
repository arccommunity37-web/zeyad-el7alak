// ==========================================
// الكنترولر ده مسؤول عن التوثيق - محصور في الأدمن بس (User model بدور admin)
// مفيش تسجيل دخول للعملاء خالص - العميل بيتعامل مع النظام بالاسم والتليفون بس بدون أي توكن
//
// طريقة حفظ جلسة الدخول: httpOnly Cookie (مش localStorage)
// السبب: httpOnly يعني إن كود الـ JavaScript في المتصفح مايقدرش يقرا التوكن خالص
// (حماية من هجمات XSS)، والمتصفح هو اللي بيبعت الكوكي تلقائيًا مع كل طلب لنفس الدومين
// ==========================================

const User = require("../models/User");
const generateToken = require("../utils/generateToken");

// اسم الكوكي اللي هنخزن فيها توكن الأدمن
const COOKIE_NAME = "admin_token";

// ------------------------------------------
// دالة مساعدة: بتحط الكوكي على الـ response بإعدادات آمنة
// ------------------------------------------
const setAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true, // كود الـ JS في المتصفح مايقدرش يقرا الكوكي دي خالص (حماية من XSS)
    secure: true, // الكوكي بتتبعت بس عبر HTTPS
    sameSite: "none", // ضروري عشان الكوكي تشتغل بين دومينين مختلفين (الفرونت والباك اند)
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 أيام بالميلي ثانية
  });
};

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

    // لو الحساب الجديد أدمن، بنسجله دخول على طول بحط الكوكي (بدل ما يضطر يعمل login تاني)
    if (user.role === "admin") {
      setAuthCookie(res, generateToken(user._id));
    }

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
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

    // بنحط التوكن في httpOnly cookie بدل ما نرجعه في الـ body
    // (الفرونت اند مش محتاج يخزنه بنفسه في localStorage خالص)
    setAuthCookie(res, generateToken(account._id));

    res.status(200).json({
      _id: account._id,
      name: account.name,
      role: account.role,
    });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    تسجيل خروج الأدمن - بيمسح الكوكي
// @route   POST /api/auth/logout
// ------------------------------------------
const logout = async (req, res, next) => {
  try {
    // بنمسح نفس الكوكي بنفس الإعدادات اللي اتحطت بيها (لازم نفس sameSite/secure عشان تتمسح صح)
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res.status(200).json({ message: "تم تسجيل الخروج بنجاح" });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    جلب بيانات الأدمن الحالي (صاحب الكوكي)
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

module.exports = { registerUser, login, logout, getMe };