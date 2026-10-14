const ApiError = require("./ApiError");
const User = require("../models/User");

// Session-based auth: ตรวจจาก req.session.userId แล้วเช็คสถานะ isActive จาก DB จริงทุก request
// (ไม่เชื่อ req.session.role เฉยๆ เพราะ role/isActive อาจถูกแก้หลัง login ไปแล้ว)
const requireAuth = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return next(new ApiError(401, "กรุณาเข้าสู่ระบบก่อนใช้งาน"));
    }
    const user = await User.findById(req.session.userId);
    if (!user || !user.isActive) {
      return next(new ApiError(401, "บัญชีของคุณถูกระงับการใช้งาน"));
    }
    req.user = { id: user._id.toString(), role: user.role, isActive: user.isActive, name: user.name };
    next();
  } catch (err) {
    next(err);
  }
};

// เหมือน requireAuth แต่ไม่ reject ถ้าไม่ได้ login/ถูกแบน — ใช้กับหน้า public ที่ต้องรู้ว่าใคร login อยู่บ้าง
const optionalAuth = async (req, res, next) => {
  try {
    if (req.session && req.session.userId) {
      const user = await User.findById(req.session.userId);
      if (user && user.isActive) {
        req.user = { id: user._id.toString(), role: user.role, isActive: user.isActive, name: user.name };
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};

// หน้าที่: ปิดกั้น route ที่ต้องเป็นผู้ดูแลระบบเท่านั้น (ต้องผ่าน requireAuth มาก่อนเพื่อให้มี req.user)
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new ApiError(403, "ต้องเป็น admin เท่านั้น"));
  }
  next();
};

module.exports = { requireAuth, requireAdmin, optionalAuth };
