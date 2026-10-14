const Category = require("../../models/Category");
const listingService = require("../../services/listing.service");

// หน้าที่: GET / — render หน้าแรก พร้อมหมวดหมู่ 6 อันดับแรกและประกาศล่าสุด 8 รายการ
exports.index = async (req, res) => {
  const [categories, { listings }] = await Promise.all([
    Category.find({ isActive: true }).sort({ name: 1 }).limit(6).lean(),
    listingService.searchListings({ sort: "latest", limit: 8 }, req.user)
  ]);

  res.render("home", { title: "หน้าแรก", categories, recentListings: listings });
};
