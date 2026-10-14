const mongoose = require("mongoose");
const Reservation = require("../models/Reservation");
const Listing = require("../models/Listing");
const ApiError = require("../middlewares/ApiError");
const reservationService = require("../services/reservation.service");

// หน้าที่: POST /listings/:listingId/reservations — ยื่นคำขอรับของ (สร้าง reservation) พร้อมตรวจสอบเงื่อนไขทั้งหมด
exports.createReservation = async (req, res) => {
  const { listingId } = req.params;
  const { quantity, message } = req.body;

  if (req.user.role === "admin") {
    throw new ApiError(403, "Admin ไม่มีสิทธิ์ขอรับของ (ป้องกันผลประโยชน์ทับซ้อน)");
  }

  const listing = await Listing.findById(listingId);
  if (!listing) throw new ApiError(404, "ไม่พบประกาศนี้");

  if (listing.owner.toString() === req.user.id) {
    throw new ApiError(400, "ไม่สามารถส่งคำขอรับสิ่งของของตนเองได้");
  }

  // Single Lifetime Reservation: ขอได้ครั้งเดียวต่อประกาศตลอดไป แม้คำขอเดิมจะถูก reject/cancelled ไปแล้ว
  const existing = await Reservation.findOne({ listing: listingId, requester: req.user.id });
  if (existing) {
    throw new ApiError(409, "คุณเคยส่งคำขอรับสิ่งของในประกาศนี้แล้ว ไม่สามารถส่งคำขอซ้ำได้");
  }

  if (listing.status !== "available") {
    throw new ApiError(409, `ประกาศนี้ไม่พร้อมรับคำขอ (สถานะ: ${listing.status})`);
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

// หน้าที่: GET /reservations/my — คำขอทั้งหมดของผู้ใช้ปัจจุบันในฐานะผู้ขอ พร้อมแบ่งหน้า
exports.getMyReservations = async (req, res) => {
  const { reservations, total, page, limit, totalPages } = await reservationService.listMyReservations(req.user.id, req.query);
  res.json({
    success: true,
    data: reservations,
    pagination: { page, limit, total, totalPages }
  });
};

// หน้าที่: GET /listings/:listingId/reservations — เจ้าของประกาศ (หรือ admin) ดูรายชื่อผู้ขอทั้งหมดของประกาศนี้
exports.getListingReservations = async (req, res) => {
  const { listingId } = req.params;

  const listing = await Listing.findById(listingId);
  if (!listing) throw new ApiError(404, "ไม่พบประกาศนี้");

  if (listing.owner.toString() !== req.user.id && req.user.role !== "admin") {
    throw new ApiError(403, "เฉพาะเจ้าของประกาศเท่านั้นที่ดูรายการคำขอได้");
  }

  const reservations = await reservationService.listListingReservations(listingId);

  res.json({ success: true, data: reservations });
};

// ---------- Unread / notification badge (สำหรับผู้ขอ) ----------

// หน้าที่: GET /reservations/unread-count — นับจำนวนคำขอของผู้ใช้ที่ยังไม่ได้อ่านการเปลี่ยนสถานะ (ใช้แสดง Badge)
exports.getUnreadCount = async (req, res) => {
  const unreadCount = await Reservation.countDocuments({ requester: req.user.id, isReadByRequester: false });
  res.json({ success: true, unreadCount });
};

// หน้าที่: PATCH /reservations/:id/read — ทำเครื่องหมายคำขอรายการเดียวว่าอ่านแล้ว (เฉพาะผู้ขอของคำขอนั้น)
exports.markRead = async (req, res) => {
  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) throw new ApiError(404, "ไม่พบคำขอนี้");
  if (reservation.requester.toString() !== req.user.id) {
    throw new ApiError(403, "เฉพาะผู้ขอเท่านั้นที่ทำรายการนี้ได้");
  }
  reservation.isReadByRequester = true;
  await reservation.save();
  res.json({ success: true, data: { reservation } });
};

// หน้าที่: PATCH /reservations/read-all — ทำเครื่องหมายคำขอทั้งหมดของผู้ใช้ว่าอ่านแล้วในครั้งเดียว
exports.markAllRead = async (req, res) => {
  await Reservation.updateMany({ requester: req.user.id, isReadByRequester: false }, { isReadByRequester: true });
  res.json({ success: true });
};

// ---------- การเปลี่ยนสถานะ ----------

// หน้าที่: คืน availableQuantity ให้ประกาศ (ใช้ตอน reject/cancel/cascade) — export ไว้ให้ listing.controller ใช้ซ้ำตอน cascade cancel
const restoreQuantity = async (listingId, qty) => {
  const updated = await Listing.findByIdAndUpdate(
    listingId,
    { $inc: { availableQuantity: qty } },
    { new: true }
  );
  if (!updated) return;
  updated.availableQuantity = Math.min(updated.availableQuantity, updated.quantity);
  // กลับเป็น available ได้เฉพาะตอนที่ยังเป็น reserved อยู่ — cancelled/expired ห้ามฟื้นกลับเด็ดขาด (no-resurrection rule)
  if (updated.availableQuantity > 0 && updated.status === "reserved") {
    updated.status = "available";
  }
  await updated.save();
};
exports.restoreQuantity = restoreQuantity;

// หน้าที่: PATCH /reservations/:id/approve — เจ้าของอนุมัติคำขอ → หัก availableQuantity แบบ atomic ป้องกัน over-approve
exports.approveReservation = async (req, res) => {
  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) throw new ApiError(404, "ไม่พบคำขอนี้");

  const listing = await Listing.findById(reservation.listing);
  if (!listing) throw new ApiError(404, "ไม่พบประกาศของคำขอนี้");

  // Admin Permission Isolation: admin ทำหน้าที่แทนเจ้าของประกาศไม่ได้เด็ดขาด
  if (listing.owner.toString() !== req.user.id) {
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
  reservation.isReadByRequester = false; // เจ้าของเพิ่งเปลี่ยนสถานะ → ผู้ขอยังไม่เห็น
  await reservation.save();

  res.json({ success: true, data: { reservation, listing: updated } });
};

// หน้าที่: PATCH /reservations/:id/reject — เจ้าของปฏิเสธคำขอ คืนจำนวนคงเหลือถ้าเคยอนุมัติไปแล้ว
exports.rejectReservation = async (req, res) => {
  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) throw new ApiError(404, "ไม่พบคำขอนี้");

  const listing = await Listing.findById(reservation.listing);
  if (!listing) throw new ApiError(404, "ไม่พบประกาศของคำขอนี้");

  if (listing.owner.toString() !== req.user.id) {
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
  reservation.isReadByRequester = false;
  await reservation.save();

  res.json({ success: true, data: { reservation } });
};

// หน้าที่: PATCH /reservations/:id/cancel — ผู้ขอยกเลิกคำขอของตัวเอง คืนจำนวนคงเหลือถ้าเคยอนุมัติไปแล้ว
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
  // ผู้ขอยกเลิกเอง ไม่ต้องตั้ง isReadByRequester=false เพราะผู้ขอรู้อยู่แล้วว่าตัวเองทำอะไร
  await reservation.save();

  res.json({ success: true, data: { reservation } });
};

// หน้าที่: PATCH /reservations/:id/complete — เจ้าของยืนยันว่ามอบของแล้ว → ปิดคำขอ และปิดประกาศถ้าส่งมอบครบทุกชิ้น
exports.completeReservation = async (req, res) => {
  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) throw new ApiError(404, "ไม่พบคำขอนี้");

  const listing = await Listing.findById(reservation.listing);
  if (!listing) throw new ApiError(404, "ไม่พบประกาศของคำขอนี้");

  if (listing.owner.toString() !== req.user.id) {
    throw new ApiError(403, "เฉพาะเจ้าของประกาศเท่านั้นที่ยืนยันการส่งมอบได้");
  }
  if (reservation.status !== "approved") {
    throw new ApiError(409, `ยืนยันได้เฉพาะคำขอ approved (ปัจจุบัน: ${reservation.status})`);
  }

  reservation.status = "completed";
  reservation.completedAt = new Date();
  await reservation.save();

  // ปิดประกาศเป็น completed เฉพาะเมื่อยอดที่ส่งมอบสำเร็จรวมกันครบ quantity ทั้งหมดของประกาศ
  // (ไม่ใช่แค่ availableQuantity หมด เพราะของอาจแบ่งส่งหลายคำขอ ต้องส่งครบทุกชิ้นจริงๆ)
  if (!["cancelled", "expired"].includes(listing.status)) {
    const completedTotal = await Reservation.aggregate([
      { $match: { listing: listing._id, status: "completed" } },
      { $group: { _id: null, sum: { $sum: "$quantity" } } }
    ]);
    const sumCompleted = completedTotal[0]?.sum || 0;
    if (sumCompleted === listing.quantity) {
      listing.status = "completed";
      await listing.save();
    }
  }

  res.json({ success: true, data: { reservation, listing } });
};
