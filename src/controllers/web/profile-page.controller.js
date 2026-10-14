// หน้าที่: GET /users/me — render หน้าแก้ไขโปรไฟล์ของฉัน
exports.me = (req, res) => {
  res.render("pages/users/me", { title: "โปรไฟล์ของฉัน" });
};

// หน้าที่: GET /auth/password — render ฟอร์มเปลี่ยนรหัสผ่าน
exports.passwordForm = (req, res) => {
  res.render("pages/auth/password", { title: "เปลี่ยนรหัสผ่าน" });
};
