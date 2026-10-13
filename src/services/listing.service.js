const Listing = require("../models/Listing");
const Category = require("../models/Category");
const Reservation = require("../models/Reservation");

const SORT_OPTIONS = {
  latest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  popular: { viewCount: -1 },
  expiring: { expiresAt: 1 }
};

// รองรับทั้ง URL ภายนอก (http/https) และไฟล์ที่อัปโหลดเข้าระบบเอง (/assets/uploads/...)
const IMAGE_URL_RE = /^(https?:\/\/|\/assets\/uploads\/)/i;

// ใช้ร่วมกันทั้งจาก API controller (listing.controller.js) และ web controller (controllers/web/*)
// เพื่อไม่ให้ query/business logic ซ้ำกันสองที่
async function searchListings(query, user) {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(parseInt(query.limit) || 20, 100);
  const { category, condition, status, search, lat, lng, radius, sort, province, district, subdistrict } = query;

  const isAdmin = user && user.role === "admin";
  const filter = {};

  // ผู้ใช้ทั่วไป/guest เห็นได้เฉพาะ available เสมอ ไม่ว่าจะส่ง status อะไรมาก็ตาม
  // admin เท่านั้นที่เลือก status เองได้ รวมถึง "all" (ไม่กรอง status เลย) สำหรับหน้า backoffice
  if (!isAdmin) {
    filter.status = "available";
  } else if (status === "all") {
    // ไม่ตั้ง filter.status → เห็นทุกสถานะ
  } else if (status) {
    filter.status = status;
  } else {
    filter.status = "available";
  }

  if (condition) filter.condition = condition;

  if (category) {
    const cat = await Category.findOne({ $or: [{ slug: category.toLowerCase() }] });
    if (!cat) {
      return { listings: [], total: 0, page, limit, totalPages: 0 };
    }
    filter.category = cat._id;
  }

  if (search) filter.$text = { $search: search };

  if (province) filter["pickup.area.province"] = province;
  if (district) filter["pickup.area.district"] = district;
  if (subdistrict) filter["pickup.area.subdistrict"] = subdistrict;

  if (lat !== undefined && lng !== undefined) {
    const radiusMeters = parseInt(radius) || 5000;
    filter["pickup.location"] = {
      $near: {
        $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: radiusMeters
      }
    };
  }

  const hasGeo = lat !== undefined && lng !== undefined;
  const sortOption = hasGeo ? null : SORT_OPTIONS[sort] || SORT_OPTIONS.latest;

  let countFilter = filter;
  if (hasGeo) {
    const radiusMeters = parseInt(radius) || 5000;
    countFilter = {
      ...filter,
      "pickup.location": {
        $geoWithin: { $centerSphere: [[parseFloat(lng), parseFloat(lat)], radiusMeters / 6378100] }
      }
    };
  }

  let dbQuery = Listing.find(filter);
  if (sortOption) dbQuery = dbQuery.sort(sortOption);
  dbQuery = dbQuery
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("category", "name slug icon")
    .populate("owner", "name avatarUrl");

  const [listings, total] = await Promise.all([dbQuery, Listing.countDocuments(countFilter)]);

  return { listings, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// Privacy by Design: mask เบอร์โทร/ที่อยู่ละเอียด/พิกัดจริง ให้เหลือเฉพาะ owner หรือ requester ที่ approved/completed
async function getListingDetail(id, user) {
  const listing = await Listing.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }, { new: true })
    .populate("category", "name slug icon")
    .populate("owner", "name avatarUrl phone");

  if (!listing) return null;

  const isOwner = !!(user && listing.owner && listing.owner._id.toString() === user.id);

  let myReservation = null;
  if (user && !isOwner) {
    myReservation = await Reservation.findOne({ listing: listing._id, requester: user.id }).select("status");
  }
  const isApprovedRequester = !!(myReservation && ["approved", "completed"].includes(myReservation.status));

  const result = listing.toObject();
  if (!isOwner && !isApprovedRequester) {
    if (result.owner) delete result.owner.phone;
    if (result.pickup) {
      delete result.pickup.address;
      delete result.pickup.location;
    }
  }

  result.hasRequested = !!myReservation;
  result.myReservation = myReservation ? { _id: myReservation._id, status: myReservation.status } : null;
  result.isOwner = isOwner;

  if (isOwner) {
    // ให้หน้า /listings/:id ของเจ้าของรู้ทันทีว่าแก้ไขได้ไหม (Strict Edit Lock)
    result.hasAnyReservation = !!(await Reservation.exists({ listing: listing._id }));
  }

  return result;
}

module.exports = { searchListings, getListingDetail, SORT_OPTIONS, IMAGE_URL_RE };
