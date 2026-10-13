const User = require("../models/User");
const Listing = require("../models/Listing");
const Report = require("../models/Report");

async function getStats() {
  const [totalUsers, suspendedUsers, activeListings, pendingReports] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ isActive: false }),
    Listing.countDocuments({ status: "available" }),
    Report.countDocuments({ status: "pending" })
  ]);
  return { totalUsers, suspendedUsers, activeListings, pendingReports };
}

module.exports = { getStats };
