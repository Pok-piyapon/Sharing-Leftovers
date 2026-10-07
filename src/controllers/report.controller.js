const Report = require("../models/Report");
const Listing = require("../models/Listing");
const ApiError = require("../middlewares/ApiError");

// ผู้ใช้แจ้งประกาศ (หนึ่งคนแจ้งประกาศเดียวได้ครั้งเดียว จาก unique index)
exports.createReport = async (req, res) => {
  const { listingId } = req.params;
  const { reason, description } = req.body;

  if (!reason) {
    throw new ApiError(400, "กรุณาระบุเหตุผลการแจ้ง (reason)");
  }

  const listing = await Listing.findById(listingId);
  if (!listing) throw new ApiError(404, "ไม่พบประกาศนี้");

  const report = await Report.create({
    reporter: req.user.id,
    listing: listing._id,
    reason,
    description
  });

  res.status(201).json({ success: true, data: { report } });
};

// ---------- Admin ----------

exports.listReports = async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.reason) filter.reason = req.query.reason;

  const [reports, total] = await Promise.all([
    Report.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("listing", "title status owner")
      .populate("reporter", "name email"),
    Report.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: reports,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
};

exports.getReport = async (req, res) => {
  const report = await Report.findById(req.params.id)
    .populate("listing", "title description status owner images")
    .populate("reporter", "name email");
  if (!report) throw new ApiError(404, "ไม่พบ report นี้");

  res.json({ success: true, data: { report } });
};

exports.updateReport = async (req, res) => {
  const { status } = req.body;

  if (!status) {
    throw new ApiError(400, "กรุณาระบุ status");
  }

  const report = await Report.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );
  if (!report) throw new ApiError(404, "ไม่พบ report นี้");

  res.json({ success: true, data: { report } });
};
