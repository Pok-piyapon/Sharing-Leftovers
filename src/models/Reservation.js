// โมเดล Reservation: คำขอรับของ 1 รายการ ผูกกับ Listing และผู้ขอ (requester) หนึ่งคน
// ดัชนีคู่ (listing, requester) ด้านล่างบังคับว่าขอซ้ำกับประกาศเดียวกันไม่ได้ (Single Lifetime Reservation)
const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1
    },
    message: {
      type: String
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled", "completed"],
      default: "pending"
    },
    approvedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    // true = ผู้ขอเห็นสถานะล่าสุดแล้ว; เริ่มต้น true เพราะ "เหตุการณ์ใหม่" ที่ requester ต้องถูกแจ้งคือ
    // ตอนเจ้าของเปลี่ยนสถานะ (approve/reject) ไม่ใช่ตอนสร้างคำขอ (ซึ่ง requester รู้อยู่แล้วว่าตัวเองทำ)
    isReadByRequester: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

reservationSchema.index({ listing: 1, requester: 1 }, { unique: true });
reservationSchema.index({ requester: 1, status: 1 });
reservationSchema.index({ listing: 1, status: 1 });

module.exports = mongoose.model("Reservation", reservationSchema);
