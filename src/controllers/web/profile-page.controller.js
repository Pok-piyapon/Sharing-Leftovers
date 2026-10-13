exports.me = (req, res) => {
  res.render("pages/users/me", { title: "โปรไฟล์ของฉัน" });
};

exports.passwordForm = (req, res) => {
  res.render("pages/auth/password", { title: "เปลี่ยนรหัสผ่าน" });
};
