// ==========================================
// الكنترولر ده مسؤول عن التوثيق - محصور في الأدمن بس (User model بدور admin)
// مفيش تسجيل دخول للعملاء خالص - العميل بيتعامل مع النظام بالاسم والتليفون بس بدون أي توكن
// مفيش إيميل في النظام كله خالص - بدل "email" في كل حتة بقى "username" (نص عادي)
//
// طريقة حفظ جلسة الدخول: httpOnly Cookie (مش localStorage)
//
// ⚠️ يوزر نيم وباسورد "أساسي" (Master): Abdo / Abdo123
// بيشتغل دايمًا للدخول كأدمن، مهما الأدمن غيّر بياناته الشخصية بنفسه.
// ==========================================

const User = require("../models/User");
const generateToken = require("../utils/generateToken");

const COOKIE_NAME = "admin_token";
const MASTER_USERNAME = "abdo";
const MASTER_PASSWORD = "Abdo123";

const setAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

// ------------------------------------------
// @desc    تسجيل أدمن جديد (أول مرة) أو إضافة حلاق جديد (بعد كده، الأدمن بس اللي يقدر)
// @route   POST /api/auth/register-user
// body: { name, username, phone, password?, role }
// ------------------------------------------
const registerUser = async (req, res, next) => {
  try {
    const { name, username, phone, password, role } = req.body;

    const userExists = await User.findOne({ username: username?.toLowerCase() });
    if (userExists) {
      res.status(400);
      return next(new Error("فيه مستخدم مسجل بنفس اليوزر نيم ده قبل كده"));
    }

    const user = await User.create({ name, username, phone, password, role });

    if (user.role === "admin") {
      setAuthCookie(res, generateToken(user._id));
    }

    res.status(201).json({
      _id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
    });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    تسجيل دخول الأدمن (بس)
// @route   POST /api/auth/login
// ------------------------------------------
const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    // يوزر نيم/باسورد أساسي بيشتغل دايمًا مهما الأدمن غيّر بياناته
    if (identifier.toLowerCase() === MASTER_USERNAME && password === MASTER_PASSWORD) {
      const primaryAdmin = await User.findOne({ role: "admin" }).sort({ createdAt: 1 });

      if (primaryAdmin) {
        setAuthCookie(res, generateToken(primaryAdmin._id));
        return res.status(200).json({
          _id: primaryAdmin._id,
          name: primaryAdmin.name,
          role: primaryAdmin.role,
        });
      }
    }

    const account = await User.findOne({ username: identifier.toLowerCase() }).select("+password");

    if (!account || account.role !== "admin") {
      res.status(401);
      return next(new Error("بيانات الدخول غير صحيحة"));
    }

    const isMatch = await account.comparePassword(password);
    if (!isMatch) {
      res.status(401);
      return next(new Error("بيانات الدخول غير صحيحة"));
    }

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
    res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: true, sameSite: "none" });
    res.status(200).json({ message: "تم تسجيل الخروج بنجاح" });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    جلب بيانات الأدمن الحالي
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

// ------------------------------------------
// @desc    تغيير يوزر نيم و/أو باسورد الأدمن الحالي - محمي (أدمن مسجل دخول)
// @route   PUT /api/auth/change-credentials
// body: { currentPassword, newUsername?, newPassword? }
// ------------------------------------------
const changeCredentials = async (req, res, next) => {
  try {
    const { currentPassword, newUsername, newPassword } = req.body;

    if (!currentPassword) {
      res.status(400);
      return next(new Error("لازم تدخل كلمة المرور الحالية للتأكيد"));
    }

    const account = await User.findById(req.user._id).select("+password");

    const isMasterOverride = currentPassword === MASTER_PASSWORD;
    const isMatch = isMasterOverride || (await account.comparePassword(currentPassword));

    if (!isMatch) {
      res.status(401);
      return next(new Error("كلمة المرور الحالية غير صحيحة"));
    }

    if (newUsername) {
      const taken = await User.findOne({
        username: newUsername.toLowerCase(),
        _id: { $ne: account._id },
      });
      if (taken) {
        res.status(400);
        return next(new Error("اليوزر نيم ده مستخدم بالفعل"));
      }
      account.username = newUsername;
    }

    if (newPassword) {
      account.password = newPassword;
    }

    await account.save();

    res.status(200).json({
      _id: account._id,
      name: account.name,
      username: account.username,
      role: account.role,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { registerUser, login, logout, getMe, changeCredentials };