const User = require("../models/User");
const Listing = require("../models/Listing");
const ApiError = require("../middlewares/ApiError");

exports.getMe = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, "ไม่พบผู้ใช้งาน");
  res.json({ success: true, data: { user } });
};

exports.updateMe = async (req, res) => {
  const allowed = ["name", "phone", "avatarUrl", "location", "address"];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "ไม่มีข้อมูลที่อนุญาตให้แก้ไข");
  }

  const user = await User.findByIdAndUpdate(req.user.id, updates, {
    new: true,
    runValidators: true
  });
  if (!user) throw new ApiError(404, "ไม่พบผู้ใช้งาน");

  res.json({ success: true, data: { user } });
};

// Soft delete: ปิดการใช้งานบัญชี ไม่ลบข้อมูลจริง
exports.deleteMe = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { isActive: false },
    { new: true }
  );
  if (!user) throw new ApiError(404, "ไม่พบผู้ใช้งาน");

  req.session.destroy(() => {
    res.clearCookie(process.env.SESSION_NAME || "sid");
    res.json({ success: true, message: "ปิดการใช้งานบัญชีเรียบร้อยแล้ว" });
  });
};

exports.getMyListings = async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  const [listings, total] = await Promise.all([
    Listing.find({ owner: req.user.id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("category", "name slug"),
    Listing.countDocuments({ owner: req.user.id })
  ]);

  res.json({
    success: true,
    data: listings,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
};

// ---------- Admin ----------

exports.listUsers = async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  const filter = {};
  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === "true";
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: users,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
};

exports.getUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "ไม่พบผู้ใช้งาน");
  res.json({ success: true, data: { user } });
};

// รับเฉพาะ isActive + reason เท่านั้น — ไม่อ่าน/ไม่ประมวลผลฟิลด์ role เด็ดขาด (ป้องกัน privilege escalation)
// การกำหนดสิทธิ์ admin ทำได้เฉพาะระดับ database เท่านั้น
exports.updateUserStatus = async (req, res) => {
  const { isActive, reason } = req.body;

  if (typeof isActive !== "boolean") {
    throw new ApiError(400, "ระบุ isActive เป็น true/false");
  }
  if (isActive === false && (!reason || !String(reason).trim())) {
    throw new ApiError(400, "ระบุ reason เมื่อระงับการใช้งานผู้ใช้");
  }

  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "ไม่พบผู้ใช้งาน");

  user.isActive = isActive;
  if (isActive === false) {
    user.banReason = reason;
    user.bannedAt = new Date();
  } else {
    user.banReason = undefined;
    user.bannedAt = undefined;
  }
  await user.save();
  // ไม่ต้องลบ session ออกจาก store โดยตรง: requireAuth/requireWebAuth ตรวจ isActive จาก DB
  // สดใหม่ทุก request อยู่แล้ว ผู้ใช้ที่ถูกแบนจะถูกปฏิเสธทันทีใน request ถัดไปพร้อมข้อความที่ถูกต้อง
  // (ลบ session document ทิ้งตรงๆ จะทำให้ request ถัดไปเห็นเป็น "ยังไม่ได้ login" แทนที่จะเป็น "ถูกระงับ")

  res.json({ success: true, data: { user } });
};
