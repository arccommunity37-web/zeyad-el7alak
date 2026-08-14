// ==========================================
// دالة موحدة لضغط ورفع الصور على Cloudinary
// بيستخدمها كل الكنترولرز (منتجات، حلاقين، قصات، لينكات تواصل) بدل ما كل واحد
// يكرر نفس الكود، وكمان بتضغط الصورة قبل الرفع عشان تقلل وقت وحجم النقل
// ==========================================

const stream = require("stream");
const sharp = require("sharp");
const cloudinary = require("../config/cloudinary");

// ------------------------------------------
// الإعدادات الافتراضية للضغط - ممكن تتخصص لكل استخدام لو احتجنا
// maxWidth: أقصى عرض للصورة (لو أكبر، بيتم تصغيرها بنفس النسبة)
// quality: جودة الحفظ بعد الضغط (0-100) - 75 كويس جدًا بصريًا ومحسوس في السرعة
// ------------------------------------------
const DEFAULT_MAX_WIDTH = 1600;
const DEFAULT_QUALITY = 75;

// ------------------------------------------
// بتاخد الـ buffer الخام للصورة (من multer) وتضغطه:
// - بتصغّر أي صورة عرضها أكبر من maxWidth (من غير ما تكبّر صورة صغيرة أصلاً)
// - بتحولها لصيغة JPEG موحدة بجودة أقل شوية (خفيفة بصريًا ومحسوسة في السرعة)
// - بتشيل بيانات الـ EXIF (بيانات الكاميرا/الموقع) عشان تقلل الحجم كمان
// ------------------------------------------
const compressImageBuffer = async (buffer, options = {}) => {
  const maxWidth = options.maxWidth || DEFAULT_MAX_WIDTH;
  const quality = options.quality || DEFAULT_QUALITY;

  return sharp(buffer)
    .rotate() // بيصحح اتجاه الصورة تلقائيًا حسب بيانات الكاميرا قبل ما نشيلها
    .resize({ width: maxWidth, withoutEnlargement: true }) // مايكبرش صورة أصلاً صغيرة
    .jpeg({ quality, mozjpeg: true }) // ضغط JPEG محسّن
    .toBuffer();
};

// ------------------------------------------
// بترفع buffer (مضغوط أو خام) على Cloudinary عن طريق stream
// نفس الطريقة المستخدمة في كل الكنترولرز الأصلية
// ------------------------------------------
const uploadBufferToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    bufferStream.pipe(uploadStream);
  });
};

// ------------------------------------------
// الدالة الرئيسية اللي هتستخدمها كل الكنترولرز:
// بتاخد الـ buffer الخام + اسم الفولدر على Cloudinary
// وبترجع { url, publicId } جاهزين للتخزين في قاعدة البيانات
//
// لو الضغط فشل لأي سبب (صورة تالفة مثلاً)، بنرفع الصورة الأصلية زي ما هي
// بدل ما نوقف العملية بالكامل - أهم حاجة إن المستخدم ميقفش عالق
//
// الرابط اللي بيترجع دلوقتي محسّن تلقائيًا للعرض (f_auto,q_auto):
// - fetch_format: "auto" -> Cloudinary بيختار الصيغة الأفضل حسب المتصفح (WebP/AVIF بدل JPEG)
// - quality: "auto"      -> أفضل جودة ممكنة بأقل حجم حسب محتوى الصورة نفسها
// من غير ما نرفع أي نسخة إضافية أو نغيّر أي حاجة في الملف الأصلي المخزّن على Cloudinary
// ------------------------------------------
const uploadImage = async (buffer, folder, options = {}) => {
  let bufferToUpload = buffer;

  try {
    bufferToUpload = await compressImageBuffer(buffer, options);
  } catch (compressionError) {
    console.warn("⚠️ فشل ضغط الصورة، هترفع بحجمها الأصلي:", compressionError.message);
    bufferToUpload = buffer;
  }

  const result = await uploadBufferToCloudinary(bufferToUpload, folder);

  const optimizedUrl = cloudinary.url(result.public_id, {
    secure: true,
    fetch_format: "auto",
    quality: "auto",
  });

  return { url: optimizedUrl, publicId: result.public_id };
};

module.exports = { uploadImage, compressImageBuffer, uploadBufferToCloudinary };