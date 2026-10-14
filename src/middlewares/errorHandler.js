const mongoose = require("mongoose");
const multer = require("multer");
const ApiError = require("./ApiError");

// หน้าที่: จับทุก request ที่ไม่ตรงกับ route ใดเลย แล้วส่งต่อเป็น 404 ให้ errorHandler จัดการ
const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `ไม่พบ route: ${req.method} ${req.originalUrl}`));
};

// หน้าที่: Error-handling middleware กลางของแอป แปลง error แต่ละชนิด (Mongoose, Multer, JSON parse ฯลฯ)
// ให้เป็น HTTP status code + ข้อความที่เหมาะสม แล้วตอบกลับเป็น JSON หรือ render หน้า error ตามชนิดของ request
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์";

  // Mongoose: ObjectId ไม่ถูกต้อง
  if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `ค่า "${err.value}" ไม่ใช่ ObjectId ที่ถูกต้องสำหรับฟิลด์ ${err.path}`;
  }

  // Mongoose: validation ไม่ผ่าน
  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }

  // Mongo duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {}).join(", ");
    message = `ข้อมูลซ้ำในฟิลด์: ${field}`;
  }

  if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "รูปแบบ JSON ไม่ถูกต้อง";
  }

  // multer: ไฟล์ใหญ่เกินกำหนด/ส่งผิด field name ฯลฯ
  if (err instanceof multer.MulterError) {
    statusCode = 400;
    message = err.code === "LIMIT_FILE_SIZE" ? "ไฟล์มีขนาดใหญ่เกิน 5MB" : err.message;
  }

  if (statusCode === 500) {
    console.error("[errorHandler]", err);
  }

  // หน้าเว็บ (ไม่ใช่ /api/*) ที่ accept html ให้ render หน้า error EJS แทน JSON
  // (401 บนหน้าเว็บถูก requireWebAuth redirect ไป /auth ไปแล้วตั้งแต่ก่อนถึงที่นี่)
  const isApiRequest = req.originalUrl.startsWith("/api/");
  if (!isApiRequest && req.accepts(["html", "json"]) === "html") {
    const view = statusCode === 404 ? "errors/404" : statusCode === 403 ? "errors/403" : "errors/500";
    return res.status(statusCode).render(view, { title: "เกิดข้อผิดพลาด", message });
  }

  res.status(statusCode).json({
    success: false,
    message
  });
};

module.exports = { errorHandler, notFoundHandler };
