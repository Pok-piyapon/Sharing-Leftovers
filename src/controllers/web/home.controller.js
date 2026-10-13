const Category = require("../../models/Category");
const listingService = require("../../services/listing.service");

exports.index = async (req, res) => {
  const [categories, { listings }] = await Promise.all([
    Category.find({ isActive: true }).sort({ name: 1 }).limit(6).lean(),
    listingService.searchListings({ sort: "latest", limit: 8 }, req.user)
  ]);

  res.render("home", { title: "หน้าแรก", categories, recentListings: listings });
};
