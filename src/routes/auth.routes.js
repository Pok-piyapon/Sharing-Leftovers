const router = require("express").Router();
const authController = require("../controllers/auth.controller");
const { requireAuth } = require("../middlewares/auth");

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: สมัครสมาชิก
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string, minLength: 8 }
 *               phone: { type: string }
 *     responses:
 *       201: { description: สมัครสำเร็จ (สร้าง session อัตโนมัติ) }
 *       409: { description: อีเมลถูกใช้งานแล้ว }
 */
router.post("/register", authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: เข้าสู่ระบบ (สร้าง session ผ่าน cookie)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: เข้าสู่ระบบสำเร็จ }
 *       401: { description: อีเมลหรือรหัสผ่านไม่ถูกต้อง }
 */
router.post("/login", authController.login);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: ดูข้อมูลตัวเอง
 *     tags: [Auth]
 *     security: [{ sessionCookie: [] }]
 *     responses:
 *       200: { description: OK }
 *       401: { description: ยังไม่ได้เข้าสู่ระบบ }
 */
router.get("/me", requireAuth, authController.me);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: ออกจากระบบ (ทำลาย session)
 *     tags: [Auth]
 *     security: [{ sessionCookie: [] }]
 *     responses:
 *       200: { description: ออกจากระบบสำเร็จ }
 */
router.post("/logout", authController.logout);

/**
 * @swagger
 * /auth/password:
 *   patch:
 *     summary: เปลี่ยนรหัสผ่าน
 *     tags: [Auth]
 *     security: [{ sessionCookie: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string, minLength: 8 }
 *     responses:
 *       200: { description: เปลี่ยนรหัสผ่านสำเร็จ }
 *       401: { description: รหัสผ่านปัจจุบันไม่ถูกต้อง }
 */
router.patch("/password", requireAuth, authController.changePassword);

module.exports = router;
