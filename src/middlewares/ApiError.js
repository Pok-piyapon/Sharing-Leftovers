// Custom error with HTTP status code, ใช้ throw ใน controller แล้ว errorHandler จัดการต่อ
class ApiError extends Error {
  // หน้าที่: สร้าง Error object ที่พก HTTP status code ติดไปด้วย
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = ApiError;
