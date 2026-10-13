const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const ApiError = require("./ApiError");

const UPLOAD_DIR = path.join(__dirname, "../../frontend/public/uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// อนุญาตเฉพาะไฟล์รูปภาพ ตัดสินใจจาก mimetype จริง ไม่ใช้นามสกุลไฟล์ที่ผู้ใช้ส่งมา (ป้องกันการปลอมนามสกุล)
const ALLOWED_MIME_TO_EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif"
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = ALLOWED_MIME_TO_EXT[file.mimetype] || "";
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TO_EXT[file.mimetype]) {
    return cb(new ApiError(400, "รองรับเฉพาะไฟล์รูปภาพ JPEG, PNG, WEBP หรือ GIF เท่านั้น"));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB ต่อไฟล์
});

module.exports = { upload, UPLOAD_DIR };
