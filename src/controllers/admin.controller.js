const adminService = require("../services/admin.service");

exports.getStats = async (req, res) => {
  const stats = await adminService.getStats();
  res.json({ success: true, data: stats });
};
