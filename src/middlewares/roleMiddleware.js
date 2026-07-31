// ==========================================
// الميدلوير ده بيتحقق إن المستخدم اللي بيعمل الطلب عنده الصلاحية المناسبة
// مثال استخدام: authorize("admin") يعني بس الأدمن يقدر يدخل الـ endpoint ده
// authorize("admin", "employee") يعني الاتنين مسموح لهم
// ==========================================

// الفانكشن دي بترجع middleware تاني، ده اسمه "Higher Order Function"
// بنعمل كده عشان نقدر نستخدمها بأدوار مختلفة في كل route حسب الحاجة
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // لازم يكون فيه req.user أصلاً (يعني الـ protect middleware اشتغل قبل كده)
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: "غير مصرح لك بالوصول" });
    }

    // بنتأكد إن دور المستخدم موجود ضمن الأدوار المسموح لها
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `الدور (${req.user.role}) مش مسموح له بالوصول للجزئية دي`,
      });
    }

    // كل حاجة تمام، كمّل للـ controller
    next();
  };
};

module.exports = { authorize };
