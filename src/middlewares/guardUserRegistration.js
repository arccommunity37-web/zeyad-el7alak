// ==========================================
// الميدلوير ده بيحمي endpoint إنشاء حساب أدمن/حلاق جديد (register-user)
// المنطق: لو مفيش أدمن في النظام أصلاً (أول تشغيل)، بنسمح بالإنشاء بحرية (Bootstrap)
// لو فيه أدمن موجود بالفعل، لازم اللي بيبعت الطلب يكون هو نفسه أدمن مسجل دخول
// ==========================================

const jwt = require("jsonwebtoken");
const User = require("../models/User");

const guardUserRegistration = async (req, res, next) => {
  try {
    const adminExists = await User.exists({ role: "admin" });

    // لو مفيش أدمن خالص لسه (أول مرة يتشغل فيها النظام) - بنسمح بالإنشاء من غير أي حماية
    if (!adminExists) {
      return next();
    }

    // لو فيه أدمن بالفعل، لازم اللي بيبعت الطلب يكون هو نفسه أدمن مسجل دخول
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      res.status(401);
      return next(new Error("لازم تسجل دخول كأدمن عشان تضيف حساب جديد"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const requester = await User.findById(decoded.id);

    if (!requester || requester.role !== "admin") {
      res.status(403);
      return next(new Error("لازم تكون أدمن عشان تضيف حساب جديد"));
    }

    next();
  } catch (error) {
    res.status(401);
    next(new Error("توكن غير صالح، سجل دخول تاني"));
  }
};

module.exports = guardUserRegistration;