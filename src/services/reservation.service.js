const Reservation = require("../models/Reservation");

// หน้าที่: ดึงคำขอรับของทั้งหมดของผู้ใช้คนหนึ่ง (ในฐานะผู้ขอ) พร้อมแบ่งหน้าและกรองตามสถานะ
// ใช้ร่วมกันทั้งจาก API controller (reservation.controller.js) และ web controller (controllers/web/*)
async function listMyReservations(userId, query) {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(parseInt(query.limit) || 20, 100);
  const filter = { requester: userId };
  if (query.status) filter.status = query.status;

  const [reservations, total] = await Promise.all([
    Reservation.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: "listing",
        select: "title images status availableQuantity quantity owner pickup",
        populate: { path: "owner", select: "name avatarUrl phone" }
      }),
    Reservation.countDocuments(filter)
  ]);

  return { reservations, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// หน้าที่: ดึงรายชื่อผู้ขอรับของทั้งหมดของประกาศหนึ่งรายการ (ใช้โดยเจ้าของประกาศ/admin)
async function listListingReservations(listingId) {
  return Reservation.find({ listing: listingId })
    .sort({ createdAt: -1 })
    .populate("requester", "name avatarUrl phone");
}

module.exports = { listMyReservations, listListingReservations };
