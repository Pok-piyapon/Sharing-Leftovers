// Seed category เริ่มต้น: รันด้วยคำสั่ง `npm run seed`
require("dotenv").config();

const mongoose = require("mongoose");
const Category = require("./models/Category");
const { connectDatabase, disconnectDatabase } = require("./config/database");

const CATEGORIES = [
  { name: "อาหาร", slug: "food", description: "อาหารสด อาหารแห้ง ของว่าง", icon: "🍜" },
  { name: "เสื้อผ้า", slug: "clothing", description: "เสื้อผ้า รองเท้า เครื่องประดับ", icon: "👕" },
  { name: "เฟอร์นิเจอร์", slug: "furniture", description: "โต๊ะ เก้าอี้ ชั้นวาง ตู้", icon: "🪑" },
  { name: "เครื่องใช้ไฟฟ้า", slug: "electronics", description: "เครื่องใช้ไฟฟ้าและอิเล็กทรอนิกส์", icon: "🔌" },
  { name: "หนังสือ", slug: "books", description: "หนังสือ สมุด อุปกรณ์การเรียน", icon: "📚" },
  { name: "ของใช้ในบ้าน", slug: "household", description: "ของใช้ทั่วไปในบ้าน", icon: "🏠" },
  { name: "อื่น ๆ", slug: "others", description: "ของที่ไม่เข้าหมวดหมู่อื่น", icon: "📦" }
];

// หน้าที่: เชื่อมต่อฐานข้อมูลแล้ว upsert หมวดหมู่เริ่มต้นทั้ง 7 รายการ (ไม่ลบ/ไม่ซ้ำถ้ารันซ้ำ)
const seed = async () => {
  await connectDatabase();

  for (const cat of CATEGORIES) {
    await Category.updateOne({ slug: cat.slug }, { $set: cat }, { upsert: true });
  }
  console.log(`Seeded ${CATEGORIES.length} categories`);

  await disconnectDatabase();
};

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
