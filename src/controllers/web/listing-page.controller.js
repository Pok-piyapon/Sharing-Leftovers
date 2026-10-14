const listingService = require("../../services/listing.service");
const Category = require("../../models/Category");
const ApiError = require("../../middlewares/ApiError");

// หน้าที่: GET /listings — render หน้ารวมประกาศ พร้อมตัวกรอง/ค้นหา/แบ่งหน้า
exports.index = async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 }).lean();
  const { listings, total, page, totalPages } = await listingService.searchListings(req.query, req.user);

  // basePath สำหรับ pagination ต้องคงตัวกรองเดิมไว้ทุกตัว ยกเว้น page เอง
  const qs = new URLSearchParams(req.query);
  qs.delete("page");
  const qsString = qs.toString();
  const basePath = `/listings?${qsString ? qsString + "&" : ""}page=`;

  res.render("pages/listings/index", {
    title: "ค้นหาสิ่งของ",
    listings,
    categories,
    q: req.query,
    currentPage: page,
    totalPages,
    basePath,
    total
  });
};

// หน้าที่: GET /listings/:id — render หน้ารายละเอียดประกาศ (ข้อมูลถูกปกปิดใน listingService ถ้าไม่ใช่เจ้าของ/ผู้ขอที่อนุมัติแล้ว)
exports.show = async (req, res, next) => {
  const listing = await listingService.getListingDetail(req.params.id, req.user);
  if (!listing) return next(new ApiError(404, "ไม่พบประกาศนี้"));

  res.render("pages/listings/show", {
    title: listing.title,
    listing
  });
};
