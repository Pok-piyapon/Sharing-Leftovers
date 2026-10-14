const mongoose = require("mongoose");
const Listing = require("../models/Listing");
const Category = require("../models/Category");
const Reservation = require("../models/Reservation");
const ApiError = require("../middlewares/ApiError");
const { restoreQuantity } = require("./reservation.controller");
const listingService = require("../services/listing.service");

const IMAGE_URL_RE = listingService.IMAGE_URL_RE;

// หน้าที่: GET /listings — ค้นหา/แบ่งหน้ารายการประกาศ (หมวดหมู่ คำค้น ระยะทาง สถานะ) ผ่าน listingService
exports.getListings = async (req, res) => {
  const { listings, total, page, limit, totalPages } = await listingService.searchListings(req.query, req.user);
  res.json({
    success: true,
    data: listings,
    pagination: { page, limit, total, totalPages }
  });
};

// หน้าที่: GET /listings/:id — ดูรายละเอียดประกาศเดียว (ข้อมูลติดต่อ/ที่อยู่ละเอียดถูกปกปิดใน listingService ถ้าไม่ใช่เจ้าของ/ผู้ขอที่อนุมัติแล้ว)
exports.getListing = async (req, res) => {
  const listing = await listingService.getListingDetail(req.params.id, req.user);
  if (!listing) throw new ApiError(404, "ไม่พบประกาศนี้");
  res.json({ success: true, data: { listing } });
};

// หน้าที่: POST /listings — ตรวจสอบข้อมูลครบถ้วนแล้วสร้างประกาศใหม่ (ห้าม admin สร้างเพื่อกันผลประโยชน์ทับซ้อน)
exports.createListing = async (req, res) => {
  if (req.user.role === "admin") {
    throw new ApiError(403, "Admin ไม่มีสิทธิ์สร้างประกาศ (ป้องกันผลประโยชน์ทับซ้อน)");
  }

  const { title, description, category, condition, quantity, images, pickup, expiresAt } = req.body;

  if (!title || !category || !condition) {
    throw new ApiError(400, "title, category และ condition เป็นข้อมูลที่จำเป็น");
  }
  if (!description || !String(description).trim()) {
    throw new ApiError(400, "description เป็นข้อมูลที่จำเป็น");
  }
  if (!Array.isArray(images) || images.length < 1 || images.length > 5) {
    throw new ApiError(400, "images ต้องเป็น array ของ URL รูปภาพ 1-5 รูป");
  }
  if (!images.every((url) => typeof url === "string" && IMAGE_URL_RE.test(url))) {
    throw new ApiError(400, "images ต้องเป็น URL ที่ขึ้นต้นด้วย http:// หรือ https:// เท่านั้น");
  }
  const area = pickup && pickup.area;
  if (!pickup || !area || !area.province || !area.district || !area.subdistrict) {
    throw new ApiError(400, "pickup.area (province, district, subdistrict) เป็นข้อมูลที่จำเป็น");
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
    pickup: { ...pickup, method: "pickup" }, // ล็อกให้เป็น pickup เท่านั้นเสมอ ไม่รองรับ delivery
    expiresAt
  });

  res.status(201).json({ success: true, data: { listing } });
};

// หน้าที่: PATCH /listings/:id — แก้ไขประกาศ (เฉพาะเจ้าของ และเฉพาะตอนยังไม่มีคำขอรับเข้ามาเลย)
exports.updateListing = async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new ApiError(404, "ไม่พบประกาศนี้");

  // Admin Permission Isolation: admin แก้เนื้อหาประกาศของผู้อื่นไม่ได้เด็ดขาด (ทำได้แค่ยกเลิก)
  if (req.user.role === "admin") {
    throw new ApiError(403, "Admin ไม่มีสิทธิ์แก้ไขเนื้อหาประกาศ");
  }

  const isOwner = listing.owner.toString() === req.user.id;
  if (!isOwner) {
    throw new ApiError(403, "คุณไม่มีสิทธิ์แก้ไขประกาศนี้");
  }

  // Strict Edit Lock: มีคำขอเกิดขึ้นแล้ว (ไม่ว่าสถานะใด) ห้ามแก้ไขอีกต่อไป
  const hasAnyReservation = await Reservation.exists({ listing: listing._id });
  if (hasAnyReservation) {
    throw new ApiError(409, "ไม่สามารถแก้ไขประกาศได้เนื่องจากมีคำขอเกิดขึ้นในประกาศนี้แล้ว");
  }

  const allowed = ["title", "description", "condition", "images", "pickup", "expiresAt", "quantity"];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      listing[key] = key === "pickup" ? { ...req.body.pickup, method: "pickup" } : req.body[key];
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

// หน้าที่: DELETE /listings/:id — ยกเลิกประกาศ (เจ้าของหรือ admin)
// Soft delete: เปลี่ยนสถานะเป็น cancelled แทนการลบข้อมูลจริง + cascade cancel คำขอที่ค้างอยู่
exports.deleteListing = async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new ApiError(404, "ไม่พบประกาศนี้");

  const isOwner = listing.owner.toString() === req.user.id;
  if (!isOwner && req.user.role !== "admin") {
    throw new ApiError(403, "คุณไม่มีสิทธิ์ลบประกาศนี้");
  }

  const reservations = await Reservation.find({ listing: listing._id });
  for (const r of reservations) {
    if (r.status === "pending") {
      r.status = "cancelled";
      r.cancelledAt = new Date();
      r.isReadByRequester = false;
      await r.save();
    } else if (r.status === "approved") {
      r.status = "cancelled";
      r.cancelledAt = new Date();
      r.isReadByRequester = false;
      await r.save();
      await restoreQuantity(listing._id, r.quantity);
    }
    // completed: ของถูกส่งมอบไปแล้ว ถือเป็นประวัติที่ไม่แตะต้อง
  }

  // No-resurrection rule: ยกเลิกแล้วคือจบ ไม่มีทางกลับเป็น available อีก
  // ใช้ findByIdAndUpdate (ไม่ใช่ listing.save() ตัวแปรเดิม) เพราะ restoreQuantity ข้างบน
  // อาจแก้ availableQuantity ของ listing นี้ไปแล้วผ่าน query แยก ตัวแปร listing ในมือตอนนี้เก่าไม่ทัน
  const finalListing = await Listing.findByIdAndUpdate(listing._id, { status: "cancelled" }, { new: true });

  res.json({ success: true, message: "ยกเลิกประกาศเรียบร้อยแล้ว", data: { listing: finalListing } });
};
