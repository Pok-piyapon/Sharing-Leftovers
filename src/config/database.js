const mongoose = require("mongoose");

// หน้าที่: เชื่อมต่อ MongoDB Atlas ด้วย connection string จาก .env (เรียกครั้งเดียวตอนเริ่มเซิร์ฟเวอร์)
const connectDatabase = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not defined in .env");
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(uri);

  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
};

// หน้าที่: ตัดการเชื่อมต่อ MongoDB (ใช้ตอนปิดเซิร์ฟเวอร์หรือใน test teardown)
const disconnectDatabase = async () => {
  await mongoose.disconnect();
};

module.exports = { connectDatabase, disconnectDatabase };
