const router = require("express").Router();
const reservationController = require("../controllers/reservation.controller");
const { requireAuth } = require("../middlewares/auth");

/**
 * @swagger
 * /reservations/my:
 *   get:
 *     summary: คำขอรับของทั้งหมดของฉัน (ในฐานะผู้ขอ)
 *     tags: [Reservations]
 *     security: [{ sessionCookie: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, approved, rejected, cancelled, completed] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: OK }
 */
router.get("/my", requireAuth, reservationController.getMyReservations);

/**
 * @swagger
 * /reservations/unread-count:
 *   get:
 *     summary: จำนวนคำขอที่ยังไม่อ่าน (สำหรับ badge แจ้งเตือนของผู้ขอ)
 *     tags: [Reservations]
 *     security: [{ sessionCookie: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.get("/unread-count", requireAuth, reservationController.getUnreadCount);

/**
 * @swagger
 * /reservations/read-all:
 *   patch:
 *     summary: ทำเครื่องหมายอ่านแล้วทั้งหมด (เปิดหน้า /reservations/my)
 *     tags: [Reservations]
 *     security: [{ sessionCookie: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.patch("/read-all", requireAuth, reservationController.markAllRead);

/**
 * @swagger
 * /reservations/{id}/read:
 *   patch:
 *     summary: ทำเครื่องหมายอ่านแล้วทีละรายการ
 *     tags: [Reservations]
 *     security: [{ sessionCookie: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.patch("/:id/read", requireAuth, reservationController.markRead);

/**
 * @swagger
 * /reservations/{id}/approve:
 *   patch:
 *     summary: เจ้าของประกาศอนุมัติคำขอ (หัก availableQuantity)
 *     tags: [Reservations]
 *     security: [{ sessionCookie: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: อนุมัติสำเร็จ }
 *       409: { description: ของไม่พอหรือสถานะไม่ถูกต้อง }
 */
router.patch("/:id/approve", requireAuth, reservationController.approveReservation);

/**
 * @swagger
 * /reservations/{id}/reject:
 *   patch:
 *     summary: เจ้าของประกาศปฏิเสธคำขอ (คืน quantity ถ้าเคยอนุมัติ)
 *     tags: [Reservations]
 *     security: [{ sessionCookie: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.patch("/:id/reject", requireAuth, reservationController.rejectReservation);

/**
 * @swagger
 * /reservations/{id}/cancel:
 *   patch:
 *     summary: ผู้ขอยกเลิกคำขอ (คืน quantity ถ้าเคยอนุมัติ)
 *     tags: [Reservations]
 *     security: [{ sessionCookie: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.patch("/:id/cancel", requireAuth, reservationController.cancelReservation);

/**
 * @swagger
 * /reservations/{id}/complete:
 *   patch:
 *     summary: เจ้าของยืนยันว่ามอบของแล้ว (ปิดรายการ)
 *     tags: [Reservations]
 *     security: [{ sessionCookie: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.patch("/:id/complete", requireAuth, reservationController.completeReservation);

module.exports = router;
