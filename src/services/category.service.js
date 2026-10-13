const Category = require("../models/Category");
const Listing = require("../models/Listing");

async function listWithUsage(filter = {}) {
  const categories = await Category.find(filter).sort({ name: 1 }).lean();
  const counts = await Listing.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]);
  const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));
  return categories.map((c) => ({ ...c, usageCount: countMap.get(c._id.toString()) || 0 }));
}

module.exports = { listWithUsage };
