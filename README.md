# باك اند نظام إدارة محل حلاقة (Barbershop Backend)

باك اند متكامل مبني بـ Node.js + Express + MongoDB، بيغطي:
- تسجيل دخول/تسجيل (أدمن، موظف/حلاق، عميل) عبر JWT
- إدارة الخدمات والموظفين
- حجز المواعيد مع منع تعارض الأوقات
- كتالوج قصات شعر برفع صور (Cloudinary)
- منتجات + صور المنتجات + مخزون
- حجز منتج من قبل العميل مقدمًا
- مبيعات (فواتير) وتقارير يومية/شهرية

---

## 1) الم  تطلبات قبل التشغيل

- Node.js (نسخة 18 أو أحدث) - تقدر تتأكد بكتابة: `node -v`
- MongoDB شغال (لوكال على جهازك، أو حساب مجاني على MongoDB Atlas)
- حساب مجاني على [Cloudinary](https://cloudinary.com) (لرفع صور القصات والمنتجات)

---

## 2) خطوات التشغيل

### أ) فك الضغط وتثبيت المكتبات
```bash
cd barbershop-backend
npm install
```

### ب) إعداد متغيرات البيئة
انسخ ملف `.env.example` وسمّيه `.env`:
```bash
cp .env.example .env
```
افتح `.env` واملأ القيم:
- `MONGO_URI`: رابط قاعدة البيانات بتاعتك (لوكال أو Atlas)
- `JWT_SECRET`: أي نص عشوائي طويل وسري
- بيانات Cloudinary التلاتة (هتلاقيها في Dashboard حسابك على cloudinary.com)

### ج) تشغيل السيرفر
```bash
npm run dev
```
لو كل حاجة تمام، هتشوف في التيرمينال:
```
✅ MongoDB متصلة بنجاح: ...
🚀 السيرفر شغال على البورت 5000
```

---

## 3) إزاي تتأكد إن كل حاجة شغالة فعلاً (خطوات الاختبار)

افتح المتصفح على `http://localhost:5000` المفروض تشوف:
```json
{ "message": "🚀 السيرفر شغال تمام! Barbershop Backend API" }
```

بعد كده جرب الخطوات دي بالترتيب (تقدر تستخدم Postman أو curl):

### 1. تسجيل أدمن جديد
```bash
curl -X POST http://localhost:5000/api/auth/register-user \
  -H "Content-Type: application/json" \
  -d '{"name":"صاحب المحل","email":"admin@test.com","phone":"01000000000","password":"123456","role":"admin"}'
```
لو رجعلك JSON فيه `token`، يبقى التسجيل شغال. احتفظ بالـ token ده.

### 2. تسجيل الدخول
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@test.com","password":"123456"}'
```

### 3. إضافة خدمة (بالتوكن اللي أخدته)
```bash
curl -X POST http://localhost:5000/api/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ضع_التوكن_هنا" \
  -d '{"name":"حلاقة شعر","price":50,"durationInMinutes":30}'
```

### 4. عرض الخدمات (Public - من غير توكن)
```bash
curl http://localhost:5000/api/services
```

### 5. رفع قصة شعر بصورة (Multipart)
```bash
curl -X POST http://localhost:5000/api/styles \
  -H "Authorization: Bearer ضع_التوكن_هنا" \
  -F "title=فيد أمريكي" \
  -F "images=@/path/to/photo.jpg"
```

### 6. إضافة منتج بصورة
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer ضع_التوكن_هنا" \
  -F "name=شامبو" \
  -F "costPrice=30" \
  -F "sellingPrice=50" \
  -F "quantityInStock=20" \
  -F "isAvailableForCustomerReservation=true" \
  -F "image=@/path/to/product.jpg"
```

لو كل خطوة من دول رجعت `status 200/201` وبيانات منطقية (مش خطأ)، يبقى الباك اند شغال صح.

### علامات إن فيه مشكلة:
- **`❌ فشل الاتصال بقاعدة البيانات`** → تأكد إن `MONGO_URI` صحيح وإن MongoDB شغالة فعلاً
- **`401 مفيش توكن`** → تأكد إنك حاطط الهيدر `Authorization: Bearer ...` صح
- **خطأ من Cloudinary وقت رفع صورة** → تأكد إن بيانات الـ 3 متغيرات بتاعت Cloudinary في `.env` صحيحة

---

## 4) ملحوظة مهمة (شفافية)

الكود اتعمله فحص نحوي كامل (Syntax Check) لكل الملفات وطلع سليم 100%،
لكن التشغيل الفعلي (npm install + الاتصال بقاعدة بيانات حقيقية + رفع صور فعلية لـ Cloudinary)
محتاج اتصال إنترنت وحساب Cloudinary حقيقي، وده مش متاح في بيئة إنشاء الملفات دي.
يعني لازم تجرب الخطوات اللي فوق بنفسك على جهازك عشان تتأكد 100% إن كل حاجة شغالة زي ما ينفع،
وأنا موجود لو واجهتك أي مشكلة أثناء التجربة.

---

## 5) هيكلة المشروع
```
barbershop-backend/
├── src/
│   ├── config/       (db.js, cloudinary.js)
│   ├── models/       (كل الـ Schemas)
│   ├── controllers/  (منطق كل جزئية)
│   ├── middlewares/  (auth, role, upload, error handler)
│   ├── routes/       (الربط بين الـ URLs والـ controllers)
│   └── app.js
├── server.js
├── .env.example
└── package.json
```
