// ==========================================
// الكنترولر ده مسؤول عن كل حاجة متعلقة بالتوثيق:
// تسجيل مستخدم جديد (موظف/أدمن)، تسجيل عميل جديد، تسجيل الدخول، وجلب بيانات المستخدم الحالي
// ==========================================

const User = require("../models/User");
const Customer = require("../models/Customer");
const generateToken = require("../utils/generateToken");

// ------------------------------------------
// @desc    تسجيل موظف/أدمن جديد (بيستخدمها الأدمن غالبًا عشان يضيف حلاق جديد)
// @route   POST /api/auth/register-user
// ------------------------------------------
const registerUser = async (req, res, next) => {
  try {
    const { name, email, phone, password, role } = req.body;

    // بنتأكد الأول إن مفيش مستخدم بنفس الإيميل موجود قبل كده
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400); // Bad Request
      return next(new Error("فيه مستخدم مسجل بالإيميل ده قبل كده"));
    }

    // بننشئ المستخدم الجديد - الباسورد هيتشفر تلقائيًا بسبب الـ pre-save hook في الموديل
    const user = await User.create({ name, email, phone, password, role });

    // بنرجع بيانات المستخدم + توكن عشان يقدر يستخدم الموقع على طول من غير ما يعمل login منفصل
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, "user"),
    });
  } catch (error) {
    next(error); // بنبعت أي خطأ غير متوقع للـ errorHandler العام
  }
};

// ------------------------------------------
// @desc    تسجيل عميل جديد
// @route   POST /api/auth/register-customer
// ------------------------------------------
const registerCustomer = async (req, res, next) => {
  try {
    const { name, phone, email, password } = req.body;

    // العميل بيتميز برقم التليفون بتاعه
    const customerExists = await Customer.findOne({ phone });
    if (customerExists) {
      res.status(400);
      return next(new Error("فيه عميل مسجل بالرقم ده قبل كده"));
    }

    const customer = await Customer.create({ name, phone, email, password });

    res.status(201).json({
      _id: customer._id,
      name: customer.name,
      phone: customer.phone,
      token: generateToken(customer._id, "customer"),
    });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    تسجيل الدخول (لأي نوع حساب: مستخدم أو عميل)
// @route   POST /api/auth/login
// ملحوظة: بنستقبل "identifier" ممكن يكون إيميل (للمستخدم) أو رقم تليفون (للعميل)
// ------------------------------------------
const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    // بندور الأول في جدول المستخدمين (أدمن/موظف) بالإيميل
    // بنحول اللي المستخدم كتبه لحروف صغيرة عشان "Admin" و"admin" يتعاملوا كإيميل واحد
    // (لأن الموديل بيخزن الإيميل بحروف صغيرة تلقائيًا)
    // بنستخدم select("+password") عشان الباسورد أصلًا معمول عليه select: false في الموديل
    let account = await User.findOne({ email: identifier.toLowerCase() }).select("+password");
    let userType = "user";

    // لو ملقيناش، بندور في جدول العملاء بالتليفون
    if (!account) {
      account = await Customer.findOne({ phone: identifier }).select("+password");
      userType = "customer";
    }

    // لو مفيش حساب أصلاً بالإيميل ولا بالتليفون
    if (!account) {
      res.status(401);
      return next(new Error("بيانات الدخول غير صحيحة"));
    }

    // بنقارن الباسورد المكتوب بالمشفر المخزن
    const isMatch = await account.comparePassword(password);
    if (!isMatch) {
      res.status(401);
      return next(new Error("بيانات الدخول غير صحيحة"));
    }

    // كل حاجة تمام، نرجع بيانات الحساب + التوكن
    res.status(200).json({
      _id: account._id,
      name: account.name,
      userType,
      role: account.role || "customer", // لو عميل، مفيش role أصلاً فبنحطله "customer"
      token: generateToken(account._id, userType),
    });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    جلب بيانات صاحب التوكن الحالي (يعني "أنا مين؟")
// @route   GET /api/auth/me
// محتاج الـ protect middleware يشتغل قبلها عشان يبقى فيه req.user
// ------------------------------------------
const getMe = async (req, res, next) => {
  try {
    // req.user اتحطت بالفعل من جوه الـ protect middleware
    res.status(200).json({
      _id: req.user._id,
      name: req.user.name,
      userType: req.userType,
      role: req.user.role || "customer",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { registerUser, registerCustomer, login, getMe };