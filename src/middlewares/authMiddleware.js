// ==========================================
// الميدلوير ده بيحرس أي endpoint محتاج "أدمن مسجل دخول"
// دلوقتي بيقرأ التوكن من httpOnly cookie بدل ما ياخده من هيدر Authorization
// (لسه بيقبل الهيدر كـ fallback احتياطي، مفيدة وقت اختبار الـ API بأدوات زي Postman)
// ==========================================

const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  // الأولوية للتوكن اللي جاي من الكوكي (طريقة الفرونت اند الرسمية دلوقتي)
  let token = req.cookies?.admin_token;

  // fallback: لو مفيش كوكي، نقبل الهيدر التقليدي "Authorization: Bearer  xxx"
  // (مفيد لو حد بيختبر الـ API مباشرة بأداة زي Postman من غير متصفح)
  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "مفيش تسجيل دخول، الوصول مرفوض" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);

    if (!req.user || req.user.role !== "admin") {
      return res.status(401).json({ message: "غير مصرح، سجل دخول كأدمن" });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: "توكن غير صالح، سجل دخول تاني" });
  }
};

module.exports = { protect };