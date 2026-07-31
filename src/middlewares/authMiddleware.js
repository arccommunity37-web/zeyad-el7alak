// ==========================================
// الميدلوير ده شغله إنه "يحرس" أي endpoint محتاج المستخدم يكون مسجل دخول
// بيتأكد إن فيه توكن صحيح مبعوت مع الطلب، ولو صحيح بيجيب بيانات المستخدم/العميل ويحطها في req.user
// ==========================================

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Customer = require("../models/Customer");

const protect = async (req, res, next) => {
  let token;

  // العادة إن التوكن بيتبعت في الهيدر بالشكل ده: "Authorization: Bearer xxxxxxx"
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      // بنفصل كلمة "Bearer" ونجيب التوكن بس
      token = req.headers.authorization.split(" ")[1];

      // بنتحقق إن التوكن ده فعلاً موقّع من عندنا وماتلاعبش فيه حد ولا انتهت صلاحيته
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // بنجيب بيانات صاحب التوكن من الداتا بيز حسب نوعه (مستخدم عادي أو عميل)
      if (decoded.userType === "customer") {
        req.user = await Customer.findById(decoded.id);
        req.userType = "customer";
      } else {
        req.user = await User.findById(decoded.id);
        req.userType = "user";
      }

      // لو مفيش يوزر أو العميل اتمسح من الداتا بيز بعد ما اتعمله التوكن
      if (!req.user) {
        return res.status(401).json({ message: "المستخدم غير موجود، سجل دخول تاني" });
      }

      // كله تمام، يبقى نكمل للـ middleware أو الـ controller اللي بعده
      next();
    } catch (error) {
      // لو التوكن غلط أو منتهي أو متلاعب فيه
      return res.status(401).json({ message: "توكن غير صالح، سجل دخول تاني" });
    }
  }

  // لو مفيش هيدر Authorization أصلاً
  if (!token) {
    return res.status(401).json({ message: "مفيش توكن، الوصول مرفوض" });
  }
};

module.exports = { protect };
