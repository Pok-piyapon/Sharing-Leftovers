const Category = require("../models/Category");
const Listing = require("../models/Listing");
const ApiError = require("../middlewares/ApiError");

exports.listCategories = async (req, res) => {
  const filter = {};
  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === "true";
  }

  const categories = await Category.find(filter).sort({ name: 1 });
  res.json({ success: true, data: categories });
};

exports.getCategory = async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, "ไม่พบ category นี้");
  res.json({ success: true, data: { category } });
};

exports.createCategory = async (req, res) => {
  const { name, slug, description, icon } = req.body;

  if (!name || !slug) {
    throw new ApiError(400, "name และ slug เป็นข้อมูลที่จำเป็น");
  }

  const category = await Category.create({ name, slug, description, icon });
  res.status(201).json({ success: true, data: { category } });
};

exports.updateCategory = async (req, res) => {
  const allowed = ["name", "slug", "description", "icon", "isActive"];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "ไม่มีข้อมูลที่จะแก้ไข");
  }

  const category = await Category.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true
  });
  if (!category) throw new ApiError(404, "ไม่พบ category นี้");

  res.json({ success: true, data: { category } });
};

// ถ้ามี listing ผูกอยู่ จะ soft delete (isActive=false) แทนการลบจริง
exports.deleteCategory = async (req, res) => {
  const inUse = await Listing.exists({ category: req.params.id });

  if (inUse) {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!category) throw new ApiError(404, "ไม่พบ category นี้");
    return res.json({
      success: true,
      message: "มี listing ใช้ category นี้อยู่ จึงปิดการใช้งาน (isActive=false) แทนการลบ",
      data: { category }
    });
  }

  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) throw new ApiError(404, "ไม่พบ category นี้");

  res.json({ success: true, message: "ลบ category เรียบร้อยแล้ว" });
};
