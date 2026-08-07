// ==========================================
// موديل User: بيمثل صاحب المحل (admin) أو الحلاق/الموظف (employee)
// مهم: تسجيل الدخول الفعلي متاح للأدمن بس. الحلاقين بيتحطوا كبيانات بس (الأدمن هو اللي بيضيفهم)
// عشان كده الباسورد بقى اختياري - الحلاق ممكن يتعمله بدون باسورد لأنه أصلاً مش هيسجل دخول أبدًا
//
// ملحوظة: مفيش إيميل خالص في النظام - بدل "email" بقى فيه "username" (نص عادي، مش لازم يكون بصيغة إيميل)
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
    username: {
      type: String,
      required: [true, "اليوزر نيم مطلوب"], // بيستخدمه الأدمن للدخول - نص عادي، مش إيميل
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
      // اختياري - الحلاق ممكن يتعمله من غيره لأنه مش هيسجل دخول أبدًا
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
    slotDurationMinutes: {
      type: Number,
      default: 30,
      min: [5, "مدة الحجز لازم تكون 5 دقايق على الأقل"],
    },
    // صورة بروفايل الحلاق (اختيارية) - بترفع على Cloudinary زي صور المنتجات بالظبط
    image: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
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

userSchema.pre("save", async function (next) {
  if (!this.password || !this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);