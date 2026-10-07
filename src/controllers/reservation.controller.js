const mongoose = require("mongoose");
const Reservation = require("../models/Reservation");
const Listing = require("../models/Listing");
const ApiError = require("../middlewares/ApiError");

// ขอรับของ (สร้าง reservation)
exports.createReservation = async (req, res) => {
  const { listingId } = req.params;
  const { quantity, message } = req.body;

  const listing = await Listing.findById(listingId);
  if (!listing) throw new ApiError(404, "ไม่พบประกาศนี้");

  if (listing.status !== "available") {
    throw new ApiError(409, `ประกาศนี้ไม่พร้อมรับคำขอ (สถานะ: ${listing.status})`);
  }
  if (listing.owner.toString() === req.user.id) {
    throw new ApiError(400, "ไม่สามารถขอรับของที่ตัวเองลงประกาศได้");
  }
  if (listing.expiresAt && listing.expiresAt < new Date()) {
    throw new ApiError(409, "ประกาศนี้หมดอายุแล้ว");
  }

  const qty = quantity === undefined ? 1 : parseInt(quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    throw new ApiError(400, "quantity ต้องเป็นจำนวนเต็มอย่างน้อย 1");
  }
  if (qty > listing.availableQuantity) {
    throw new ApiError(409, `มีของเหลืออยู่เพียง ${listing.availableQuantity} ชิ้น`);
  }

  const reservation = await Reservation.create({
    listing: listing._id,
    requester: req.user.id,
    quantity: qty,
    message
  });

  res.status(201).json({ success: true, data: { reservation } });
};

// คำขอของฉัน (ในฐานะผู้ขอ)
exports.getMyReservations = async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const filter = { requester: req.user.id };
  if (req.query.status) filter.status = req.query.status;

  const [reservations, total] = await Promise.all([
    Reservation.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: "listing", select: "title images status availableQuantity owner", populate: { path: "owner", select: "name avatarUrl" } }),
    Reservation.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: reservations,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
};

// เจ้าของประกาศดูรายชื่อคนที่ขอรับ
exports.getListingReservations = async (req, res) => {
  const { listingId } = req.params;

  const listing = await Listing.findById(listingId);
  if (!listing) throw new ApiError(404, "ไม่พบประกาศนี้");

  if (listing.owner.toString() !== req.user.id && req.user.role !== "admin") {
    throw new ApiError(403, "เฉพาะเจ้าของประกาศเท่านั้นที่ดูรายการคำขอได้");
  }

  const reservations = await Reservation.find({ listing: listingId })
    .sort({ createdAt: -1 })
    .populate("requester", "name avatarUrl phone");

  res.json({ success: true, data: reservations });
};

// ---------- การเปลี่ยนสถานะ ----------

const restoreQuantity = async (listingId, qty) => {
  const updated = await Listing.findByIdAndUpdate(
    listingId,
    { $inc: { availableQuantity: qty } },
    { new: true }
  );
  if (!updated) return;
  updated.availableQuantity = Math.min(updated.availableQuantity, updated.quantity);
  if (updated.availableQuantity > 0 && updated.status === "reserved") {
    updated.status = "available";
  }
  await updated.save();
};

// เจ้าของอนุมัติ → หัก availableQuantity แบบ atomic ป้องกัน over-approve
exports.approveReservation = async (req, res) => {
  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) throw new ApiError(404, "ไม่พบคำขอนี้");

  const listing = await Listing.findById(reservation.listing);
  if (!listing) throw new ApiError(404, "ไม่พบประกาศของคำขอนี้");

  if (listing.owner.toString() !== req.user.id && req.user.role !== "admin") {
    throw new ApiError(403, "เฉพาะเจ้าของประกาศเท่านั้นที่อนุมัติได้");
  }
  if (reservation.status !== "pending") {
    throw new ApiError(409, `อนุมัติได้เฉพาะคำขอสถานะ pending (ปัจจุบัน: ${reservation.status})`);
  }

  // atomic: หัก quantity ถ้าของเหลือพอ ไม่งั้น throw
  const updated = await Listing.findOneAndUpdate(
    {
      _id: listing._id,
      status: "available",
      availableQuantity: { $gte: reservation.quantity }
    },
    { $inc: { availableQuantity: -reservation.quantity } },
    { new: true }
  );

  if (!updated) {
    throw new ApiError(409, "ของไม่เพียงพอหรือประกาศไม่พร้อมแล้ว");
  }

  if (updated.availableQuantity <= 0) {
    updated.status = "reserved";
    await updated.save();
  }

  reservation.status = "approved";
  reservation.approvedAt = new Date();
  await reservation.save();

  res.json({ success: true, data: { reservation, listing: updated } });
};

exports.rejectReservation = async (req, res) => {
  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) throw new ApiError(404, "ไม่พบคำขอนี้");

  const listing = await Listing.findById(reservation.listing);
  if (listing.owner.toString() !== req.user.id && req.user.role !== "admin") {
    throw new ApiError(403, "เฉพาะเจ้าของประกาศเท่านั้นที่ปฏิเสธได้");
  }
  if (!["pending", "approved"].includes(reservation.status)) {
    throw new ApiError(409, `ปฏิเสธได้เฉพาะคำขอ pending หรือ approved (ปัจจุบัน: ${reservation.status})`);
  }

  // ถ้าเคยอนุมัติไปแล้ว คืน quantity ให้ประกาศ
  if (reservation.status === "approved") {
    await restoreQuantity(reservation.listing, reservation.quantity);
  }

  reservation.status = "rejected";
  reservation.cancelledAt = new Date();
  await reservation.save();

  res.json({ success: true, data: { reservation } });
};

// ผู้ขอยกเลิกคำขอของตัวเอง
exports.cancelReservation = async (req, res) => {
  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) throw new ApiError(404, "ไม่พบคำขอนี้");

  if (reservation.requester.toString() !== req.user.id) {
    throw new ApiError(403, "เฉพาะผู้ขอเท่านั้นที่ยกเลิกได้");
  }
  if (!["pending", "approved"].includes(reservation.status)) {
    throw new ApiError(409, `ยกเลิกได้เฉพาะคำขอ pending หรือ approved (ปัจจุบัน: ${reservation.status})`);
  }

  if (reservation.status === "approved") {
    await restoreQuantity(reservation.listing, reservation.quantity);
  }

  reservation.status = "cancelled";
  reservation.cancelledAt = new Date();
  await reservation.save();

  res.json({ success: true, data: { reservation } });
};

// เจ้าของยืนยันว่ามอบของแล้ว → ปิดรายการ
exports.completeReservation = async (req, res) => {
  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) throw new ApiError(404, "ไม่พบคำขอนี้");

  const listing = await Listing.findById(reservation.listing);
  if (listing.owner.toString() !== req.user.id && req.user.role !== "admin") {
    throw new ApiError(403, "เฉพาะเจ้าของประกาศเท่านั้นที่ยืนยันการส่งมอบได้");
  }
  if (reservation.status !== "approved") {
    throw new ApiError(409, `ยืนยันได้เฉพาะคำขอ approved (ปัจจุบัน: ${reservation.status})`);
  }

  reservation.status = "completed";
  reservation.completedAt = new Date();
  await reservation.save();

  // ถ้าของหมดแล้ว ปิดประกาศเป็น completed
  if (listing.availableQuantity <= 0 && listing.status !== "completed") {
    listing.status = "completed";
    await listing.save();
  }

  res.json({ success: true, data: { reservation, listing } });
};
