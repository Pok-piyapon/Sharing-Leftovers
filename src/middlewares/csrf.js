const ApiError = require("./ApiError");

// ใช้กับฟอร์ม POST จริงที่ไม่ได้ยิงผ่าน ApiService/fetch (ปัจจุบันมีแค่ /auth/logout)
module.exports = function verifyCsrf(req, res, next) {
  const token = req.body && req.body._csrf;
  if (!token || token !== req.session.csrfToken) {
    return next(new ApiError(403, "คำขอไม่ถูกต้อง (CSRF token ไม่ตรง) กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง"));
  }
  next();
};
