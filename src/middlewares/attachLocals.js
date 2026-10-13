const crypto = require("crypto");
const User = require("../models/User");
const Reservation = require("../models/Reservation");

// ทำงานกับทุก request (รวมหน้า public) เพื่อเตรียมตัวแปรที่ EJS view ทุกหน้าต้องใช้:
// currentUser/isAuthenticated (สำหรับ header ตาม role), unreadCount (badge), csrfToken, flash (toast ข้ามหน้า)
module.exports = async (req, res, next) => {
  res.locals.isAuthenticated = false;
  res.locals.currentUser = null;
  res.locals.unreadCount = 0;

  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString("hex");
  }
  res.locals.csrfToken = req.session.csrfToken;

  res.locals.flash = req.session.flash || null;
  delete req.session.flash;

  try {
    if (req.session && req.session.userId) {
      const user = await User.findById(req.session.userId);
      if (user && user.isActive) {
        res.locals.isAuthenticated = true;
        res.locals.currentUser = user.toJSON();
        res.locals.unreadCount = await Reservation.countDocuments({
          requester: user._id,
          isReadByRequester: false
        });
      }
    }
  } catch {
    // lookup ผิดพลาด → ถือเป็น guest ไปเลย ไม่บล็อกหน้า public
  }

  next();
};
