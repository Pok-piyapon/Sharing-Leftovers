const Listing = require("../../models/Listing");
const reservationService = require("../../services/reservation.service");
const ApiError = require("../../middlewares/ApiError");

// หน้าที่: GET /listings/:id/reservations — render หน้าจัดการคำขอของประกาศ (เจ้าของจัดการได้, admin ดูได้อย่างเดียว)
exports.index = async (req, res, next) => {
  const listing = await Listing.findById(req.params.id).populate("category", "name icon");
  if (!listing) return next(new ApiError(404, "ไม่พบประกาศนี้"));

  const isOwner = listing.owner.toString() === req.user.id;
  const isAdminViewer = req.user.role === "admin";
  if (!isOwner && !isAdminViewer) {
    return next(new ApiError(403, "เฉพาะเจ้าของประกาศเท่านั้นที่ดูรายการคำขอได้"));
  }

  const reservations = await reservationService.listListingReservations(listing._id);

  const summary = {
    total: listing.quantity,
    remaining: listing.availableQuantity,
    reserved: reservations.filter((r) => r.status === "approved").reduce((sum, r) => sum + r.quantity, 0),
    delivered: reservations.filter((r) => r.status === "completed").reduce((sum, r) => sum + r.quantity, 0)
  };

  res.render("pages/listings/reservations", {
    title: `จัดการคำขอ — ${listing.title}`,
    listing,
    reservations,
    summary,
    canManage: isOwner && !isAdminViewer
  });
};
