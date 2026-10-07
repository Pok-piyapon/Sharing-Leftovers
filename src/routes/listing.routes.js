const router = require("express").Router();
const listingController = require("../controllers/listing.controller");
const reservationController = require("../controllers/reservation.controller");
const reportController = require("../controllers/report.controller");
const { requireAuth, requireAdmin } = require("../middlewares/auth");

/**
 * @swagger
 * /listings:
 *   get:
 *     summary: ดูรายการของเหลือใช้
 *     tags: [Listings]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: slug ของ category เช่น food, furniture
 *       - in: query
 *         name: condition
 *         schema: { type: string, enum: [new, like_new, good, fair, poor] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [available, reserved, completed, cancelled, expired] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: lat
 *         schema: { type: number }
 *       - in: query
 *         name: lng
 *         schema: { type: number }
 *       - in: query
 *         name: radius
 *         schema: { type: integer, default: 5000 }
 *         description: รัศมีค้นหาเป็นเมตร
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [latest, oldest, popular, expiring], default: latest }
 *     responses:
 *       200: { description: OK }
 *   post:
 *     summary: สร้างประกาศ
 *     tags: [Listings]
 *     security: [{ sessionCookie: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, category, condition]
 *             properties:
 *               title: { type: string, example: โต๊ะทำงาน }
 *               description: { type: string }
 *               category: { type: string, description: ObjectId หรือ slug }
 *               condition: { type: string, enum: [new, like_new, good, fair, poor] }
 *               quantity: { type: integer, default: 1 }
 *               images: { type: array, items: { type: string } }
 *               pickup:
 *                 type: object
 *                 properties:
 *                   method: { type: string, enum: [pickup, delivery] }
 *                   address: { type: string }
 *                   location:
 *                     type: object
 *                     properties:
 *                       type: { type: string, example: Point }
 *                       coordinates: { type: array, items: { type: number }, example: [102.8236, 16.4322] }
 *                   pickupStart: { type: string, format: date-time }
 *                   pickupEnd: { type: string, format: date-time }
 *               expiresAt: { type: string, format: date-time }
 *     responses:
 *       201: { description: สร้างสำเร็จ }
 *       401: { description: ยังไม่ได้เข้าสู่ระบบ }
 */
router.get("/", listingController.getListings);
router.post("/", requireAuth, listingController.createListing);

/**
 * @swagger
 * /listings/{id}:
 *   get:
 *     summary: ดูประกาศเดียว (เพิ่ม viewCount)
 *     tags: [Listings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: ไม่พบประกาศ }
 *   patch:
 *     summary: แก้ไขประกาศ (เฉพาะ owner หรือ admin)
 *     tags: [Listings]
 *     security: [{ sessionCookie: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       403: { description: ไม่มีสิทธิ์ }
 *   delete:
 *     summary: "ยกเลิกประกาศ (soft delete → status cancelled)"
 *     tags: [Listings]
 *     security: [{ sessionCookie: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: ยกเลิกสำเร็จ }
 */
router.get("/:id", listingController.getListing);
router.patch("/:id", requireAuth, listingController.updateListing);
router.delete("/:id", requireAuth, listingController.deleteListing);

/**
 * @swagger
 * /listings/{listingId}/reservations:
 *   post:
 *     summary: ขอรับของ (สร้าง reservation)
 *     tags: [Reservations]
 *     security: [{ sessionCookie: [] }]
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity: { type: integer, default: 1 }
 *               message: { type: string, example: สนใจขอรับครับ สามารถไปรับวันเสาร์ได้ }
 *     responses:
 *       201: { description: สร้างคำขอสำเร็จ }
 *       409: { description: ประกาศไม่พร้อมหรือของไม่พอ }
 *   get:
 *     summary: เจ้าของประกาศดูรายชื่อคนที่ขอรับ
 *     tags: [Reservations]
 *     security: [{ sessionCookie: [] }]
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       403: { description: ไม่ใช่เจ้าของประกาศ }
 */
router
  .route("/:listingId/reservations")
  .post(requireAuth, reservationController.createReservation)
  .get(requireAuth, reservationController.getListingReservations);

/**
 * @swagger
 * /listings/{listingId}/reports:
 *   post:
 *     summary: แจ้งประกาศ
 *     tags: [Reports]
 *     security: [{ sessionCookie: [] }]
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason: { type: string, enum: [spam, inappropriate, fraud, illegal, wrong_information, other] }
 *               description: { type: string }
 *     responses:
 *       201: { description: แจ้งสำเร็จ }
 */
router.post("/:listingId/reports", requireAuth, reportController.createReport);

module.exports = router;
