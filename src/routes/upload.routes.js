const router = require("express").Router();
const uploadController = require("../controllers/upload.controller");
const { upload } = require("../middlewares/upload");
const { requireAuth } = require("../middlewares/auth");

/**
 * @swagger
 * /uploads:
 *   post:
 *     summary: อัปโหลดไฟล์รูปภาพ (ได้ URL กลับมาใช้ในฟิลด์ images ของประกาศ)
 *     tags: [Uploads]
 *     security: [{ sessionCookie: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image: { type: string, format: binary }
 *     responses:
 *       201: { description: อัปโหลดสำเร็จ }
 *       400: { description: ไฟล์ไม่ถูกต้องหรือใหญ่เกิน 5MB }
 *       401: { description: ยังไม่ได้เข้าสู่ระบบ }
 */
router.post("/", requireAuth, upload.single("image"), uploadController.uploadImage);

module.exports = router;
