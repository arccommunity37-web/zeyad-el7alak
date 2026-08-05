// ==========================================
// الكنترولر ده مسؤول عن التوثيق - محصور في الأدمن بس (User model بدور admin)
// مفيش تسجيل دخول للعملاء خالص - العميل بيتعامل مع النظام بالاسم والتليفون بس بدون أي توكن
//
// طريقة حفظ جلسة الدخول: httpOnly Cookie (مش localStorage)
//
// ⚠️ يوزر نيم وباسورد "أساسي" (Master): Abdo / Abdo123
// بيشتغل دايمًا للدخول كأدمن، مهما الأدمن غيّر بياناته الشخصية بنفسه.
// ده احتياطي عشان صاحب المحل ميتقفلش برا حسابه لو نسي بياناته الجديدة أو حصل خطأ.
// (لازم البيانات دي تتحفظ سرية زي أي باسورد تاني - أي حد يعرفها هيقدر يدخل بصلاحيات أدمن كاملة)
// ==========================================

const User = require("../models/User");
const generateToken = require("../utils/generateToken");

const COOKIE_NAME = "admin_token";
const MASTER_USERNAME = "abdo";
const MASTER_PASSWORD = "Abdo123";

// ------------------------------------------
// دالة مساعدة: بتحط الكوكي على الـ response بإعدادات آمنة
// ------------------------------------------
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
// ------------------------------------------
const registerUser = async (req, res, next) => {
  try {
    const { name, email, phone, password, role } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      return next(new Error("فيه مستخدم مسجل بالإيميل ده قبل كده"));
    }

    const user = await User.create({ name, email, phone, password, role });

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
// بيقبل إما بيانات الأدمن الحقيقية اللي هو غيّرها، أو اليوزر/الباسورد الأساسي (Master) في أي وقت
// @route   POST /api/auth/login
// ------------------------------------------
const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    // ✋ لو البيانات المبعوتة هي البيانات الأساسية (Master)، بندخّل بأول حساب أدمن موجود في النظام
    // مباشرة من غير ما نتحقق من الباسورد المخزن أصلاً - ده بيشتغل دايمًا مهما الأدمن غيّر بياناته
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

    // المسار العادي: بيانات الأدمن الحقيقية اللي هو محددها بنفسه
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

// ------------------------------------------
// @desc    تغيير يوزر نيم (إيميل) و/أو باسورد الأدمن الحالي - محمي (أدمن مسجل دخول)
// بيقبل الباسورد الحالي الحقيقي أو الباسورد الأساسي (Master) كتأكيد للسماح بالتغيير
// @route   PUT /api/auth/change-credentials
// body المتوقع: { currentPassword, newEmail?, newPassword? }
// ------------------------------------------
const changeCredentials = async (req, res, next) => {
  try {
    const { currentPassword, newEmail, newPassword } = req.body;

    if (!currentPassword) {
      res.status(400);
      return next(new Error("لازم تدخل كلمة المرور الحالية للتأكيد"));
    }

    const account = await User.findById(req.user._id).select("+password");

    // ✋ بنسمح بالتغيير لو الباسورد الحالي صح، أو لو استخدم الباسورد الأساسي (Master) كتأكيد
    const isMasterOverride = currentPassword === MASTER_PASSWORD;
    const isMatch = isMasterOverride || (await account.comparePassword(currentPassword));

    if (!isMatch) {
      res.status(401);
      return next(new Error("كلمة المرور الحالية غير صحيحة"));
    }

    if (newEmail) {
      const emailTaken = await User.findOne({
        email: newEmail.toLowerCase(),
        _id: { $ne: account._id },
      });
      if (emailTaken) {
        res.status(400);
        return next(new Error("الإيميل ده مستخدم بالفعل"));
      }
      account.email = newEmail;
    }

    if (newPassword) {
      account.password = newPassword; // pre-save hook في الموديل هيشفرها تلقائيًا
    }

    await account.save();

    res.status(200).json({
      _id: account._id,
      name: account.name,
      email: account.email,
      role: account.role,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { registerUser, login, logout, getMe, changeCredentials };