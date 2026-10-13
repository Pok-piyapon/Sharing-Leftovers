const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      trim: true
    },
    avatarUrl: {
      type: String
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },
    location: {
      type: {
        type: String,
        enum: ["Point"]
      },
      coordinates: {
        type: [Number],
        default: undefined
      }
    },
    address: {
      province: String,
      district: String,
      subdistrict: String
    },
    isActive: {
      type: Boolean,
      default: true
    },
    banReason: {
      type: String
    },
    bannedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      }
    }
  }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ location: "2dsphere" });

// 2dsphere ไม่ยอมรับ GeoJSON ที่ไม่มี coordinates — ตัด location ทิ้งถ้าไม่ได้กรอก
userSchema.pre("validate", async function () {
  if (this.location && (!this.location.coordinates || this.location.coordinates.length !== 2)) {
    this.location = undefined;
  }
});

module.exports = mongoose.model("User", userSchema);
