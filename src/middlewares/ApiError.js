// Custom error with HTTP status code, ใช้ throw ใน controller แล้ว errorHandler จัดการต่อ
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = ApiError;
