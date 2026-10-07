const router = require("express").Router();
const reportController = require("../controllers/report.controller");
const { requireAuth, requireAdmin } = require("../middlewares/auth");

/**
 * @swagger
 * /reports:
 *   get:
 *     summary: ดูรายการ report ทั้งหมด (admin)
 *     tags: [Reports]
 *     security: [{ sessionCookie: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, reviewing, resolved, rejected] }
 *       - in: query
 *         name: reason
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: OK }
 *       403: { description: ต้องเป็น admin }
 */
router.get("/", requireAuth, requireAdmin, reportController.listReports);

router.get("/:id", requireAuth, requireAdmin, reportController.getReport);

/**
 * @swagger
 * /reports/{id}:
 *   patch:
 *     summary: อัปเดตสถานะ report (admin)
 *     tags: [Reports]
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
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [pending, reviewing, resolved, rejected] }
 *     responses:
 *       200: { description: OK }
 */
router.patch("/:id", requireAuth, requireAdmin, reportController.updateReport);

module.exports = router;
