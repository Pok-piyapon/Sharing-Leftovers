// หน้าที่: GET /help/how-it-works — render หน้าอธิบายวิธีใช้งานระบบ (เนื้อหาคงที่ ไม่ดึงข้อมูลจาก DB)
exports.howItWorks = (req, res) => {
  res.render("pages/help/how-it-works", { title: "วิธีใช้งาน" });
};
