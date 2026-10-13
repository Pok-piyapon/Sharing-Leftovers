const Listing = require("../../models/Listing");
const Reservation = require("../../models/Reservation");

exports.index = async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = 20;
  const filter = { owner: req.user.id };
  if (req.query.status) filter.status = req.query.status;

  const [listings, total] = await Promise.all([
    Listing.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("category", "name icon"),
    Listing.countDocuments(filter)
  ]);

  const listingIds = listings.map((l) => l._id);
  const [pendingCounts, anyReservationListingIds] = await Promise.all([
    Reservation.aggregate([
      { $match: { listing: { $in: listingIds }, status: "pending" } },
      { $group: { _id: "$listing", count: { $sum: 1 } } }
    ]),
    Reservation.find({ listing: { $in: listingIds } }).distinct("listing")
  ]);
  const pendingMap = new Map(pendingCounts.map((p) => [p._id.toString(), p.count]));
  const lockedSet = new Set(anyReservationListingIds.map((id) => id.toString()));
  const listingsWithPending = listings.map((l) => ({
    ...l.toObject(),
    pendingCount: pendingMap.get(l._id.toString()) || 0,
    hasAnyReservation: lockedSet.has(l._id.toString())
  }));

  const qs = new URLSearchParams(req.query);
  qs.delete("page");
  const qsString = qs.toString();

  res.render("pages/users/me-listings", {
    title: "ประกาศของฉัน",
    listings: listingsWithPending,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    basePath: `/users/me/listings?${qsString ? qsString + "&" : ""}page=`,
    status: req.query.status || ""
  });
};
