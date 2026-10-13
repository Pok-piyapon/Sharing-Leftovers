// Open Redirect protection: returnTo ต้องเป็น relative path ภายในเท่านั้น (ขึ้นต้นด้วย / เดี่ยว ไม่ใช่ // และไม่มี ://)
const isSafeReturnTo = (value) => {
  if (typeof value !== "string" || !value) return false;
  if (!value.startsWith("/") || value.startsWith("//")) return false;
  if (value.includes("://")) return false;
  return true;
};

exports.form = (req, res) => {
  if (res.locals.isAuthenticated) {
    return res.redirect("/");
  }
  const returnTo = isSafeReturnTo(req.query.returnTo) ? req.query.returnTo : "/";
  res.render("pages/auth/index", { title: "เข้าสู่ระบบ / สมัครสมาชิก", returnTo, tab: req.query.tab === "register" ? "register" : "login" });
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie(process.env.SESSION_NAME || "sid");
    res.redirect("/");
  });
};
