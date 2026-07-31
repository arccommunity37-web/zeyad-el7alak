// ==========================================
// الميدلوير ده بيمسك أي خطأ حصل في أي مكان في التطبيق (لو حد عمل next(error))
// ويرجعه للعميل بشكل منظم بدل ما السيرفر يقع أو يرجع رسالة غير مفهومة
// لازم يتحط في آخر app.js عشان يشتغل صح (بعد كل الـ routes)
// ==========================================

const errorHandler = (err, req, res, next) => {
  // لو حد حدد status code معين وقت رمي الخطأ، بنستخدمه، وإلا بنعتبره خطأ سيرفر عام (500)
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    message: err.message || "حصل خطأ غير متوقع في السيرفر",
    // بنظهر تفاصيل الخطأ (stack trace) بس وقت التطوير، مش وقت الإنتاج، عشان أمان أكتر
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

module.exports = errorHandler;
