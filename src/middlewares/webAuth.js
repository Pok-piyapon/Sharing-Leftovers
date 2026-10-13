const User = require("../models/User");

// เหมือน requireAuth แต่ใช้กับหน้าเว็บ (EJS): ไม่ได้ login/ถูกแบน → redirect ไปหน้า /auth
// พร้อม returnTo แทนการตอบ 401 JSON (ซึ่งเหมาะกับ API เท่านั้น)
const requireWebAuth = async (req, res, next) => {
  try {
    const loginRedirect = () => res.redirect("/auth?returnTo=" + encodeURIComponent(req.originalUrl));

    if (!req.session || !req.session.userId) {
      return loginRedirect();
    }
    const user = await User.findById(req.session.userId);
    if (!user || !user.isActive) {
      return req.session.destroy(() => loginRedirect());
    }
    req.user = { id: user._id.toString(), role: user.role, isActive: user.isActive, name: user.name };
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireWebAuth };
