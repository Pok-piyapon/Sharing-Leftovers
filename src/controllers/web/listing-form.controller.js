const Category = require("../../models/Category");
const Listing = require("../../models/Listing");
const Reservation = require("../../models/Reservation");
const ApiError = require("../../middlewares/ApiError");

// หน้าที่: GET /listings/new — render ฟอร์มลงประกาศใหม่ (ห้าม admin เข้าหน้านี้)
exports.newForm = async (req, res, next) => {
  if (req.user.role === "admin") {
    return next(new ApiError(403, "Admin ไม่มีสิทธิ์สร้างประกาศ (ป้องกันผลประโยชน์ทับซ้อน)"));
  }
  const categories = await Category.find({ isActive: true }).sort({ name: 1 }).lean();
  res.render("pages/listings/new", { title: "ลงประกาศใหม่", categories });
};

// หน้าที่: GET /listings/:id/edit — render ฟอร์มแก้ไขประกาศ (เฉพาะเจ้าของ) ล็อกฟอร์มถ้ามีคำขอรับเข้ามาแล้ว
exports.editForm = async (req, res, next) => {
  const listing = await Listing.findById(req.params.id).populate("category", "name slug");
  if (!listing) return next(new ApiError(404, "ไม่พบประกาศนี้"));

  if (req.user.role === "admin") {
    return next(new ApiError(403, "Admin ไม่มีสิทธิ์แก้ไขเนื้อหาประกาศ"));
  }
  if (listing.owner.toString() !== req.user.id) {
    return next(new ApiError(403, "คุณไม่มีสิทธิ์แก้ไขประกาศนี้"));
  }

  const hasAnyReservation = !!(await Reservation.exists({ listing: listing._id }));
  const categories = await Category.find({ isActive: true }).sort({ name: 1 }).lean();

  res.render("pages/listings/edit", {
    title: "แก้ไขประกาศ",
    listing,
    categories,
    locked: hasAnyReservation
  });
};
