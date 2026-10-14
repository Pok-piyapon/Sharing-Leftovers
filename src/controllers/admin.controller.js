// Controller สำหรับ route กลุ่ม /api/v1/admin (เฉพาะผู้ดูแลระบบ) — ปัจจุบันมีแค่สรุปตัวเลขภาพรวม
const adminService = require("../services/admin.service");

// หน้าที่: GET /admin/stats — คืนตัวเลขสรุปภาพรวมระบบ (จำนวนผู้ใช้ ประกาศ รายงาน ฯลฯ) สำหรับหน้า Admin Overview
exports.getStats = async (req, res) => {
  const stats = await adminService.getStats();
  res.json({ success: true, data: stats });
};
