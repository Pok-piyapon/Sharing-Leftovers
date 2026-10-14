const adminService = require("../../services/admin.service");
const listingService = require("../../services/listing.service");
const categoryService = require("../../services/category.service");
const Report = require("../../models/Report");
const User = require("../../models/User");

// หน้าที่: GET /admin — render หน้าภาพรวมระบบของผู้ดูแล (สถิติรวม + รายงานที่รอตรวจสอบ 5 รายการล่าสุด)
exports.index = async (req, res) => {
  const stats = await adminService.getStats();
  const recentReports = await Report.find({ status: "pending" })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("listing", "title")
    .populate("reporter", "name");

  res.render("pages/admin/index", { title: "ภาพรวมระบบ (Admin)", stats, recentReports });
};

// หน้าที่: GET /admin/listings — render หน้าจัดการประกาศทั้งหมดของ admin (default แสดงทุกสถานะ)
exports.listings = async (req, res) => {
  const query = { ...req.query, status: req.query.status || "all" };
  const { listings, total, page, totalPages } = await listingService.searchListings(query, req.user);

  const qs = new URLSearchParams(req.query);
  qs.delete("page");
  const qsString = qs.toString();

  res.render("pages/admin/listings", {
    title: "จัดการประกาศทั้งหมด (Admin)",
    listings,
    currentPage: page,
    totalPages,
    basePath: `/admin/listings?${qsString ? qsString + "&" : ""}page=`,
    total,
    q: req.query
  });
};

// หน้าที่: GET /admin/reports — render หน้ารายการรายงานปัญหาทั้งหมด พร้อมแบ่งหน้าและกรองตามสถานะ
exports.reports = async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = 20;
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const [reports, total] = await Promise.all([
    Report.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: "listing", select: "title status owner", populate: { path: "owner", select: "name" } })
      .populate("reporter", "name email"),
    Report.countDocuments(filter)
  ]);

  res.render("pages/admin/reports", {
    title: "รายงานปัญหา (Admin)",
    reports,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    status: req.query.status || ""
  });
};

// หน้าที่: GET /admin/users — render หน้าจัดการผู้ใช้ทั้งหมด พร้อมแบ่งหน้าและกรองตามสถานะการใช้งาน
exports.users = async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = 20;
  const filter = {};
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === "true";

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter)
  ]);

  res.render("pages/admin/users", {
    title: "จัดการผู้ใช้ (Admin)",
    users,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    isActiveFilter: req.query.isActive === undefined ? "" : req.query.isActive
  });
};

// หน้าที่: GET /admin/categories — render หน้าจัดการหมวดหมู่ พร้อมจำนวนประกาศที่ใช้แต่ละหมวด
exports.categories = async (req, res) => {
  const categories = await categoryService.listWithUsage({});
  res.render("pages/admin/categories", { title: "จัดการหมวดหมู่ (Admin)", categories });
};
