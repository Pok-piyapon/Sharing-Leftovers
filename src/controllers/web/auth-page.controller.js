// หน้าที่: ตรวจว่าค่า returnTo เป็น relative path ภายในเว็บเราเท่านั้น
// Open Redirect protection: returnTo ต้องเป็น relative path ภายในเท่านั้น (ขึ้นต้นด้วย / เดี่ยว ไม่ใช่ // และไม่มี ://)
const isSafeReturnTo = (value) => {
  if (typeof value !== "string" || !value) return false;
  if (!value.startsWith("/") || value.startsWith("//")) return false;
  if (value.includes("://")) return false;
  return true;
};

// หน้าที่: GET /auth — render ฟอร์มเข้าสู่ระบบ/สมัครสมาชิก (redirect ออกถ้า login อยู่แล้ว)
exports.form = (req, res) => {
  if (res.locals.isAuthenticated) {
    return res.redirect("/");
  }
  const returnTo = isSafeReturnTo(req.query.returnTo) ? req.query.returnTo : "/";
  res.render("pages/auth/index", { title: "เข้าสู่ระบบ / สมัครสมาชิก", returnTo, tab: req.query.tab === "register" ? "register" : "login" });
};

// หน้าที่: POST /auth/logout (ฟอร์มเว็บจริง) — ทำลาย session แล้ว redirect กลับหน้าแรก
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie(process.env.SESSION_NAME || "sid");
    res.redirect("/");
  });
};
