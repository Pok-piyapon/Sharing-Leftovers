// โมเดล Report: การรายงานประกาศไม่เหมาะสมของผู้ใช้ 1 ครั้ง ต่อประกาศ 1 รายการ
// ดัชนีคู่ (listing, reporter) ป้องกันผู้ใช้คนเดียวรายงานประกาศเดียวกันซ้ำ
const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true
    },
    reason: {
      type: String,
      enum: ["spam", "inappropriate", "fraud", "illegal", "wrong_information", "other"],
      required: true
    },
    description: {
      type: String
    },
    status: {
      type: String,
      enum: ["pending", "reviewing", "resolved", "rejected"],
      default: "pending"
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

reportSchema.index({ listing: 1, reporter: 1 }, { unique: true });
reportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Report", reportSchema);
