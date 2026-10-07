const bcrypt = require("bcryptjs");
const User = require("../models/User");
const ApiError = require("../middlewares/ApiError");

const setSession = (req, user) => {
  req.session.userId = user._id.toString();
  req.session.role = user.role;
};

exports.register = async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, "name, email และ password เป็นข้อมูลที่จำเป็น");
  }
  if (password.length < 8) {
    throw new ApiError(400, "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร");
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, "อีเมลนี้ถูกใช้งานแล้ว");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, phone });

  setSession(req, user);

  res.status(201).json({ success: true, data: { user } });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "กรุณาระบุ email และ password");
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new ApiError(401, "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  }
  if (!user.isActive) {
    throw new ApiError(403, "บัญชีนี้ถูกระงับการใช้งาน");
  }

  setSession(req, user);

  res.json({ success: true, data: { user } });
};

exports.me = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new ApiError(404, "ไม่พบผู้ใช้งาน");
  }
  res.json({ success: true, data: { user } });
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie(process.env.SESSION_NAME || "sid");
    res.json({ success: true, message: "ออกจากระบบแล้ว" });
  });
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "กรุณาระบุ currentPassword และ newPassword");
  }
  if (newPassword.length < 8) {
    throw new ApiError(400, "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร");
  }

  const user = await User.findById(req.user.id).select("+passwordHash");
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new ApiError(401, "รหัสผ่านปัจจุบันไม่ถูกต้อง");
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();

  // เปลี่ยนรหัสผ่านสำเร็จ → ทำ session ใหม่เพื่อความปลอดภัย
  req.session.regenerate(() => {
    setSession(req, user);
    res.json({ success: true, message: "เปลี่ยนรหัสผ่านสำเร็จ" });
  });
};
