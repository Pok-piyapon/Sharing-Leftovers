const mongoose = require("mongoose");
const ApiError = require("./ApiError");

const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `ไม่พบ route: ${req.method} ${req.originalUrl}`));
};

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

  if (statusCode === 500) {
    console.error("[errorHandler]", err);
  }

  res.status(statusCode).json({
    success: false,
    message
  });
};

module.exports = { errorHandler, notFoundHandler };
