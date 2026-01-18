import mongoose from "mongoose";

const attractionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      enum: ["pilgrim", "tourist", "food", "medical", "other"],
      required: true,
    },

    subCategory: {
      type: String,
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

    address: String,
    description: String,

    image: {
      type: String,
    },

    popularityScore: {
      type: Number,
      default: 0,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    source: {
      type: String,
      enum: ["map", "admin"],
      default: "map",
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Geo index
attractionSchema.index({ location: "2dsphere" });

export default mongoose.model("Attraction", attractionSchema);