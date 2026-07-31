// ==========================================
// موديل User: بيمثل صاحب المحل (admin) أو الحلاق/الموظف (employee)
// العميل (Customer) ليه موديل منفصل تحت اسم Customer.js
// ==========================================

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// بنعرف شكل البيانات (Schema) بتاعة المستخدم
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "الاسم مطلوب"], // لازم يتبعت اسم وإلا هيرفض الحفظ
      trim: true, // بيشيل أي مسافات زيادة في الأول والآخر
    },
    email: {
      type: String,
      required: [true, "البريد الإلكتروني مطلوب"],
      unique: true, // مينفعش يتكرر نفس الإيميل لمستخدمين مختلفين
      lowercase: true, // بيحول الإيميل لحروف صغيرة تلقائيًا عشان نتجنب مشاكل التكرار
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "رقم التليفون مطلوب"],
    },
    password: {
      type: String,
      required: [true, "كلمة المرور مطلوبة"],
      minlength: 6, // أقل حاجة 6 حروف/أرقام
      select: false, // معناها إن الباسورد مش هيترجع تلقائيًا في أي query إلا لو طلبناه بوضوح
    },
    role: {
      type: String,
      enum: ["admin", "employee"], // مفيش قيمة تالتة مسموح بيها
      default: "employee",
    },
    specialties: {
      type: [String], // مصفوفة نصوص - يعني الخدمات اللي الحلاق شاطر فيها
      default: [],
    },
    workingHours: {
      from: { type: String, default: "10:00" }, // معاد بداية الشغل
      to: { type: String, default: "22:00" }, // معاد نهاية الشغل
      daysOff: { type: [String], default: [] }, // أيام الإجازة الأسبوعية (مثلاً ["Friday"])
    },
    isActive: {
      type: Boolean,
      default: true, // لو الأدمن عطّل موظف، بيبقى false بدل ما نحذفه نهائي
    },
  },
  {
    timestamps: true, // بيضيف تلقائيًا createdAt و updatedAt
  }
);

// ==========================================
// Middleware (Hook) بيشتغل تلقائيًا "قبل" ما نحفظ أي مستخدم (pre-save)
// وظيفته: تشفير كلمة المرور قبل ما تتخزن في قاعدة البيانات
// ==========================================
userSchema.pre("save", async function (next) {
  // لو الباسورد ماتغيرش (يعني بنعمل تعديل في بيانات تانية بس مش الباسورد)
  // متعملش تشفير تاني عشان متبوظش الباسورد الأصلي
  if (!this.isModified("password")) {
    return next();
  }

  // بنعمل "ملح" (salt) عشوائي، وده بيخلي التشفير أقوى وأصعب في الاختراق
  const salt = await bcrypt.genSalt(10);
  // بنشفر الباسورد فعليًا ونستبدله بالنسخة المشفرة
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ==========================================
// دالة مساعدة (Method) بنضيفها على كل مستخدم عشان نقارن الباسورد وقت تسجيل الدخول
// بتاخد الباسورد اللي المستخدم كتبه وتقارنه بالمشفر المخزن في الداتا بيز
// ==========================================
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
