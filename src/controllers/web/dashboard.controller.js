const Listing = require("../../models/Listing");
const Reservation = require("../../models/Reservation");
const reservationService = require("../../services/reservation.service");

// หน้าที่: GET /dashboard — สรุปภาพรวมของผู้ใช้ (จำนวนประกาศเปิดอยู่ คำขอที่รอพิจารณา ประกาศ/คำขอล่าสุด)
exports.index = async (req, res) => {
  const myListingIds = await Listing.find({ owner: req.user.id }).distinct("_id");

  const [openListingsCount, pendingReceivedCount, recentListings, myReservationsResult] = await Promise.all([
    Listing.countDocuments({ owner: req.user.id, status: { $in: ["available", "reserved"] } }),
    Reservation.countDocuments({ listing: { $in: myListingIds }, status: "pending" }),
    Listing.find({ owner: req.user.id }).sort({ createdAt: -1 }).limit(5).populate("category", "name icon"),
    reservationService.listMyReservations(req.user.id, { limit: 5 })
  ]);

  res.render("pages/dashboard/index", {
    title: "พื้นที่ของฉัน",
    openListingsCount,
    pendingReceivedCount,
    recentListings,
    recentReservations: myReservationsResult.reservations
  });
};
