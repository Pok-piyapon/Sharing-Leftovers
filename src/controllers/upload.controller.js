const ApiError = require("../middlewares/ApiError");

// หน้าที่: POST /uploads — รับไฟล์รูปภาพที่ multer middleware เซฟลงดิสก์แล้ว คืน URL ที่ใช้งานได้กลับไป
exports.uploadImage = (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "กรุณาเลือกไฟล์รูปภาพ");
  }
  res.status(201).json({
    success: true,
    data: { url: `/assets/uploads/${req.file.filename}` }
  });
};
