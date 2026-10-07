const mongoose = require("mongoose");
const Listing = require("../models/Listing");
const Category = require("../models/Category");
const ApiError = require("../middlewares/ApiError");

const SORT_OPTIONS = {
  latest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  popular: { viewCount: -1 },
  expiring: { expiresAt: 1 }
};

exports.getListings = async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const { category, condition, status, search, lat, lng, radius, sort } = req.query;

  const filter = {};

  if (status) {
    filter.status = status;
  } else {
    filter.status = "available";
  }

  if (condition) filter.condition = condition;

  if (category) {
    // รองรับทั้ง slug (เช่น food) และ ObjectId
    const cat = await Category.findOne({
      $or: [{ slug: category.toLowerCase() }]
    });
    if (!cat) {
      return res.json({ success: true, data: [], pagination: { page, limit, total: 0, totalPages: 0 } });
    }
    filter.category = cat._id;
  }

  if (search) {
    filter.$text = { $search: search };
  }

  // ค้นหาตามระยะทาง (lat, lng, radius เป็นเมตร)
  if (lat !== undefined && lng !== undefined) {
    const radiusMeters = parseInt(radius) || 5000;
    filter["pickup.location"] = {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [parseFloat(lng), parseFloat(lat)]
        },
        $maxDistance: radiusMeters
      }
    };
  }

  // $near เรียงตามระยะทางเอง (MongoDB ห้าม sort ซ้ำ)
  const hasGeo = lat !== undefined && lng !== undefined;
  const sortOption = hasGeo ? null : SORT_OPTIONS[sort] || SORT_OPTIONS.latest;

  // count ใช้ $near ไม่ได้ (count ไม่มีการเรียงผลลัพธ์) จึงใช้ $geoWithin แทน
  let countFilter = filter;
  if (hasGeo) {
    const radiusMeters = parseInt(radius) || 5000;
    countFilter = {
      ...filter,
      "pickup.location": {
        $geoWithin: {
          $centerSphere: [[parseFloat(lng), parseFloat(lat)], radiusMeters / 6378100]
        }
      }
    };
  }

  let query = Listing.find(filter);
  if (sortOption) query = query.sort(sortOption);
  query = query.skip((page - 1) * limit).limit(limit).populate("category", "name slug icon").populate("owner", "name avatarUrl");

  const [listings, total] = await Promise.all([query, Listing.countDocuments(countFilter)]);

  res.json({
    success: true,
    data: listings,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
};

exports.getListing = async (req, res) => {
  const listing = await Listing.findByIdAndUpdate(
    req.params.id,
    { $inc: { viewCount: 1 } },
    { new: true }
  )
    .populate("category", "name slug icon")
    .populate("owner", "name avatarUrl phone");

  if (!listing) throw new ApiError(404, "ไม่พบประกาศนี้");

  res.json({ success: true, data: { listing } });
};

exports.createListing = async (req, res) => {
  const { title, description, category, condition, quantity, images, pickup, expiresAt } = req.body;

  if (!title || !category || !condition) {
    throw new ApiError(400, "title, category และ condition เป็นข้อมูลที่จำเป็น");
  }

  // รองรับทั้ง ObjectId และ slug (เช่น "furniture")
  const catQuery = { slug: String(category).toLowerCase() };
  if (mongoose.isValidObjectId(category)) {
    catQuery.$or = [{ _id: category }, { slug: String(category).toLowerCase() }];
  }
  const cat = await Category.findOne(catQuery);
  if (!cat) throw new ApiError(400, "ไม่พบ category ที่ระบุ");

  const qty = quantity === undefined ? 1 : parseInt(quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    throw new ApiError(400, "quantity ต้องเป็นจำนวนเต็มอย่างน้อย 1");
  }

  const listing = await Listing.create({
    owner: req.user.id,
    category: cat._id,
    title,
    description,
    images,
    condition,
    quantity: qty,
    availableQuantity: qty,
    pickup,
    expiresAt
  });

  res.status(201).json({ success: true, data: { listing } });
};

exports.updateListing = async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new ApiError(404, "ไม่พบประกาศนี้");

  const isOwner = listing.owner.toString() === req.user.id;
  if (!isOwner && req.user.role !== "admin") {
    throw new ApiError(403, "คุณไม่มีสิทธิ์แก้ไขประกาศนี้");
  }

  const allowed = ["title", "description", "condition", "images", "pickup", "expiresAt", "quantity"];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      listing[key] = req.body[key];
    }
  }

  // ถ้าแก้ quantity ต้อง sync availableQuantity (หักลบด้วยจำนวนที่อนุมัติไปแล้ว)
  if (req.body.quantity !== undefined) {
    const reservedCount = listing.quantity - listing.availableQuantity;
    if (req.body.quantity < reservedCount) {
      throw new ApiError(400, `มีการจองอนุมัติไปแล้ว ${reservedCount} ชิ้น ตั้ง quantity น้อยกว่านี้ไม่ได้`);
    }
    listing.availableQuantity = req.body.quantity - reservedCount;
  }

  await listing.save();

  res.json({ success: true, data: { listing } });
};

// Soft delete: เปลี่ยนสถานะเป็น cancelled แทนการลบข้อมูลจริง
exports.deleteListing = async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new ApiError(404, "ไม่พบประกาศนี้");

  const isOwner = listing.owner.toString() === req.user.id;
  if (!isOwner && req.user.role !== "admin") {
    throw new ApiError(403, "คุณไม่มีสิทธิ์ลบประกาศนี้");
  }

  listing.status = "cancelled";
  await listing.save();

  res.json({ success: true, message: "ยกเลิกประกาศเรียบร้อยแล้ว", data: { listing } });
};
