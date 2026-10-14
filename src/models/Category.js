// โมเดล Category: หมวดหมู่ของสิ่งของที่นำมาแบ่งปัน (เช่น อาหาร เสื้อผ้า เฟอร์นิเจอร์)
// isActive ใช้ทำ Soft Delete เมื่อหมวดหมู่นั้นยังมีประกาศอ้างอิงอยู่
const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    description: {
      type: String
    },
    icon: {
      type: String
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Category", categorySchema);
