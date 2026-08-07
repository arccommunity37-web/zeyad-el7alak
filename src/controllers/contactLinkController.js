// ==========================================
// الكنترولر ده مسؤول عن لينكات/أرقام التواصل اللي الأدمن بيضيفها (جروب، إنستا باي...)
// ==========================================

const stream = require("stream");
const ContactLink = require("../models/ContactLink");
const cloudinary = require("../config/cloudinary");

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
// @desc    عرض كل اللينكات المفعّلة (مرتبة حسب order) - Public
// @route   GET /api/contact-links
// ------------------------------------------
const getContactLinks = async (req, res, next) => {
  try {
    const filter = req.query.all === "true" ? {} : { isActive: true };
    const links = await ContactLink.find(filter).sort({ order: 1, createdAt: 1 });
    res.status(200).json(links);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    إضافة لينك/رقم جديد (مع صورة بروفايل اختيارية) - أدمن بس - FormData
// @route   POST /api/contact-links
// ------------------------------------------
const createContactLink = async (req, res, next) => {
  try {
    const { type, title, value, order, isActive } = req.body;

    let image = { url: "", publicId: "" };
    if (req.file) {
      const result = await uploadBufferToCloudinary(req.file.buffer, "barbershop/contact-links");
      image = { url: result.secure_url, publicId: result.public_id };
    }

    const link = await ContactLink.create({
      type,
      title,
      value,
      order: order ? Number(order) : 0,
      isActive: typeof isActive === "string" ? isActive === "true" : true,
      image,
    });

    res.status(201).json(link);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    تعديل لينك/رقم (مع إمكانية تحديث الصورة) - أدمن بس - FormData
// @route   PUT /api/contact-links/:id
// ------------------------------------------
const updateContactLink = async (req, res, next) => {
  try {
    const link = await ContactLink.findById(req.params.id);
    if (!link) {
      res.status(404);
      return next(new Error("العنصر غير موجود"));
    }

    const { type, title, value, order, isActive } = req.body;
    if (type) link.type = type;
    if (title) link.title = title;
    if (value) link.value = value;
    if (order !== undefined) link.order = Number(order);
    if (isActive !== undefined) link.isActive = isActive === "true" || isActive === true;

    if (req.file) {
      if (link.image && link.image.publicId) {
        await cloudinary.uploader.destroy(link.image.publicId);
      }
      const result = await uploadBufferToCloudinary(req.file.buffer, "barbershop/contact-links");
      link.image = { url: result.secure_url, publicId: result.public_id };
    }

    await link.save();
    res.status(200).json(link);
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// @desc    حذف لينك/رقم نهائيًا - أدمن بس
// @route   DELETE /api/contact-links/:id
// ------------------------------------------
const deleteContactLink = async (req, res, next) => {
  try {
    const link = await ContactLink.findById(req.params.id);
    if (!link) {
      res.status(404);
      return next(new Error("العنصر غير موجود"));
    }

    if (link.image && link.image.publicId) {
      await cloudinary.uploader.destroy(link.image.publicId);
    }

    await link.deleteOne();
    res.status(200).json({ message: "تم حذف العنصر بنجاح" });
  } catch (error) {
    next(error);
  }
};

module.exports = { getContactLinks, createContactLink, updateContactLink, deleteContactLink };