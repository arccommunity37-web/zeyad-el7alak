// ==========================================
// الكنترولر ده مسؤول عن CRUD الخدمات (حلاقة، صبغة، حمام كريم...)
// ==========================================

const Service = require("../models/Service");

// ------------------------------------------
// @desc    عرض كل الخدمات (Public - أي حد يقدر يشوفها حتى من غير تسجيل دخول)
// @route   GET /api/services
// ------------------------------------------
const getServices = async (req, res, next) => {
  try {
    // بنرجع بس الخدمات المفعّلة للعميل العادي، إلا لو طلب كل حاجة (مثلاً الأدمن)
    const filter = req.query.all === "true" ? {} : { isActive: true };
    const services = await Service.find(filter);
    res.status(200).json(services);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    إضافة خدمة جديدة (Admin فقط)
// @route   POST /api/services
// ------------------------------------------
const createService = async (req, res, next) => {
  try {
    const { name, description, price, durationInMinutes } = req.body;
    const service = await Service.create({ name, description, price, durationInMinutes });
    res.status(201).json(service);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    تعديل خدمة موجودة
// @route   PUT /api/services/:id
// ------------------------------------------
const updateService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      res.status(404);
      return next(new Error("الخدمة غير موجودة"));
    }

    // بنحدث الحقول اللي اتبعتت بس
    Object.assign(service, req.body);
    const updated = await service.save();
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    حذف/تعطيل خدمة
// @route   DELETE /api/services/:id
// ------------------------------------------
const deleteService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      res.status(404);
      return next(new Error("الخدمة غير موجودة"));
    }

    // بنعطلها بدل ما نمسحها، عشان لو مرتبطة بحجوزات قديمة تفضل واضحة في السجل
    service.isActive = false;
    await service.save();

    res.status(200).json({ message: "تم تعطيل الخدمة بنجاح" });
  } catch (error) {
    next(error);
  }
};

module.exports = { getServices, createService, updateService, deleteService };
