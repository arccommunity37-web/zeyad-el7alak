// ==========================================
// موديل User: بيمثل صاحب المحل (admin) أو الحلاق/الموظف (employee)
// مهم: تسجيل الدخول الفعلي متاح للأدمن بس. الحلاقين بيتحطوا كبيانات بس (الأدمن هو اللي بيضيفهم)
// عشان كده الباسورد بقى اختياري - الحلاق ممكن يتعمله بدون باسورد لأنه أصلاً مش هيسجل دخول أبدًا
// ==========================================

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "الاسم مطلوب"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "البريد الإلكتروني مطلوب"], // بيستخدمه الأدمن كـ يوزر نيم لتسجيل الدخول
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "رقم التليفون مطلوب"],
    },
    password: {
      type: String,
      minlength: 6,
      select: false,
      // ملحوظة: الباسورد بقى اختياري (مش required) عشان نقدر نضيف حلاقين (employee)
      // من غير ما نجبرهم يبقى ليهم باسورد، لأنهم أصلاً مش هيسجلوا دخول أبدًا
    },
    role: {
      type: String,
      enum: ["admin", "employee"],
      default: "employee",
    },
    specialties: {
      type: [String],
      default: [],
    },
    workingHours: {
      from: { type: String, default: "10:00" },
      to: { type: String, default: "22:00" },
      daysOff: { type: [String], default: [] },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// تشفير الباسورد قبل الحفظ - بس لو فيه باسورد أصلاً (الحلاق ممكن يتعمله من غيره)
userSchema.pre("save", async function (next) {
  if (!this.password || !this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// مقارنة الباسورد وقت تسجيل الدخول (مستخدمة للأدمن بس فعليًا)
userSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.password) return false; // لو مفيش باسورد أصلاً (حلاق)، مينفعش يسجل دخول خالص
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);