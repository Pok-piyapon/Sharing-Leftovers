const router = require("express").Router();
const categoryController = require("../controllers/category.controller");
const { requireAuth, requireAdmin } = require("../middlewares/auth");

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: ดูรายการ category ทั้งหมด
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *     responses:
 *       200: { description: OK }
 *   post:
 *     summary: สร้าง category (admin)
 *     tags: [Categories]
 *     security: [{ sessionCookie: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, slug]
 *             properties:
 *               name: { type: string, example: อาหาร }
 *               slug: { type: string, example: food }
 *               description: { type: string }
 *               icon: { type: string }
 *     responses:
 *       201: { description: สร้างสำเร็จ }
 *       403: { description: ต้องเป็น admin }
 */
router.get("/", categoryController.listCategories);
router.post("/", requireAuth, requireAdmin, categoryController.createCategory);

router.get("/:id", categoryController.getCategory);
router.patch("/:id", requireAuth, requireAdmin, categoryController.updateCategory);
router.delete("/:id", requireAuth, requireAdmin, categoryController.deleteCategory);

module.exports = router;
