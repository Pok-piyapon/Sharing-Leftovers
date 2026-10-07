const ApiError = require("./ApiError");

// Session-based auth: ตรวจจาก req.session.userId ที่ตั้งไว้ตอน login/register
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return next(new ApiError(401, "กรุณาเข้าสู่ระบบก่อนใช้งาน"));
  }
  req.user = { id: req.session.userId, role: req.session.role };
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new ApiError(403, "ต้องเป็น admin เท่านั้น"));
  }
  next();
};

module.exports = { requireAuth, requireAdmin };
