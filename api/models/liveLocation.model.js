import mongoose from "mongoose";

const liveLocationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    familyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Family",
      required: true,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },

    isSharing: {
      type: Boolean,
      default: false, // consent
    },

    accuracy: {
      type: Number,
    },

    lastUpdatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

liveLocationSchema.index({ location: "2dsphere" });
liveLocationSchema.index({ familyId: 1, userId: 1 }, { unique: true });

export default mongoose.model("LiveLocation", liveLocationSchema);
