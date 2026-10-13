const router = require("express").Router();
const adminController = require("../controllers/admin.controller");
const { requireAuth, requireAdmin } = require("../middlewares/auth");

/**
 * @swagger
 * /admin/stats:
 *   get:
 *     summary: สรุปตัวเลขภาพรวมสำหรับหน้า admin overview
 *     tags: [Admin]
 *     security: [{ sessionCookie: [] }]
 *     responses:
 *       200: { description: OK }
 *       403: { description: ต้องเป็น admin }
 */
router.get("/stats", requireAuth, requireAdmin, adminController.getStats);

module.exports = router;
