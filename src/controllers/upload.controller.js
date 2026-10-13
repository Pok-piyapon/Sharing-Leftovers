const ApiError = require("../middlewares/ApiError");

exports.uploadImage = (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "กรุณาเลือกไฟล์รูปภาพ");
  }
  res.status(201).json({
    success: true,
    data: { url: `/assets/uploads/${req.file.filename}` }
  });
};
