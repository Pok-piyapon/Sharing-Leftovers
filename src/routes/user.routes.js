const router = require("express").Router();
const userController = require("../controllers/user.controller");
const { requireAuth, requireAdmin } = require("../middlewares/auth");

// ---------- ตัวเอง ----------

router.get("/me", requireAuth, userController.getMe);
router.patch("/me", requireAuth, userController.updateMe);
router.delete("/me", requireAuth, userController.deleteMe);

/**
 * @swagger
 * /users/me/listings:
 *   get:
 *     summary: ประกาศทั้งหมดที่ฉันลง
 *     tags: [Users]
 *     security: [{ sessionCookie: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: OK }
 */
router.get("/me/listings", requireAuth, userController.getMyListings);

// ---------- Admin ----------

/**
 * @swagger
 * /users:
 *   get:
 *     summary: ดูรายการผู้ใช้ทั้งหมด (admin)
 *     tags: [Users]
 *     security: [{ sessionCookie: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *     responses:
 *       200: { description: OK }
 *       403: { description: ต้องเป็น admin }
 */
router.get("/", requireAuth, requireAdmin, userController.listUsers);

router.get("/:id", requireAuth, requireAdmin, userController.getUser);

/**
 * @swagger
 * /users/{id}/status:
 *   patch:
 *     summary: เปิด/ปิดการใช้งานผู้ใช้ (admin) — ห้ามเปลี่ยน role ผ่าน endpoint นี้
 *     tags: [Users]
 *     security: [{ sessionCookie: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isActive]
 *             properties:
 *               isActive: { type: boolean }
 *               reason: { type: string, description: "จำเป็นเมื่อ isActive=false" }
 *     responses:
 *       200: { description: OK }
 *       400: { description: ไม่ระบุ isActive หรือไม่ระบุ reason ตอนแบน }
 */
router.patch("/:id/status", requireAuth, requireAdmin, userController.updateUserStatus);

module.exports = router;
