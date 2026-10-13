const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String
    },
    images: {
      type: [String],
      default: []
    },
    condition: {
      type: String,
      enum: ["new", "like_new", "good", "fair", "poor"],
      required: true
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1
    },
    availableQuantity: {
      type: Number,
      default: 1,
      min: 0
    },
    status: {
      type: String,
      enum: ["available", "reserved", "completed", "cancelled", "expired"],
      default: "available"
    },
    pickup: {
      method: {
        type: String,
        enum: ["pickup"],
        default: "pickup"
      },
      location: {
        type: {
          type: String,
          enum: ["Point"]
        },
        coordinates: [Number]
      },
      address: String,
      area: {
        province: String,
        district: String,
        subdistrict: String
      },
      pickupStart: Date,
      pickupEnd: Date
    },
    expiresAt: {
      type: Date
    },
    viewCount: {
      type: Number,
      default: 0
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

listingSchema.index({ title: "text", description: "text" });
listingSchema.index({ "pickup.location": "2dsphere" });
listingSchema.index({ category: 1, status: 1, createdAt: -1 });
listingSchema.index({ owner: 1, createdAt: -1 });

// เหมือนกับ User: GeoJSON ต้องมี type + coordinates ครบ ไม่งั้น 2dsphere จะ error
listingSchema.pre("validate", async function () {
  if (this.pickup && this.pickup.location) {
    const loc = this.pickup.location;
    if (!loc.coordinates || loc.coordinates.length !== 2) {
      this.pickup.location = undefined;
    } else {
      loc.type = "Point";
    }
  }
});

module.exports = mongoose.model("Listing", listingSchema);
