// ==========================================
// موديل Customer: بيمثل العميل اللي بيحجز مواعيد أو منتجات
// ملحوظة: العميل ممكن يسجل بإيميل وباسورد، أو ممكن نسمحله يحجز كـ "زائر" برقم تليفون بس
// (القرار ده بتاعك، هنا الموديل بيدعم الحالتين)
// ==========================================

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "اسم العميل مطلوب"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "رقم التليفون مطلوب"],
      unique: true, // كل عميل ليه رقم تليفون مختلف، وده اللي بنميّزه بيه
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      // مش required عشان نسمح بحجز كـ زائر بدون إيميل
    },
    password: {
      type: String,
      minlength: 6,
      select: false,
      // مش required برضو، لأن العميل ممكن يستخدم الموقع بدون تسجيل دخول كامل
    },
  },
  {
    timestamps: true,
  }
);

// نفس فكرة تشفير الباسورد اللي عملناها في موديل User
customerSchema.pre("save", async function (next) {
  // لو مفيش باسورد أصلاً (عميل زائر) أو الباسورد ماتغيرش، منعملش حاجة
  if (!this.password || !this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// دالة لمقارنة الباسورد وقت تسجيل الدخول
customerSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.password) return false; // عميل زائر مفهوش باسورد أصلاً
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("Customer", customerSchema);
