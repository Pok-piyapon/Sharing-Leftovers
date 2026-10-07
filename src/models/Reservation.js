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
    cancelledAt: Date
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
