import mongoose from "mongoose";

const geoPointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true,
      validate: {
        validator: (value) =>
          Array.isArray(value) &&
          value.length === 2 &&
          value.every((n) => typeof n === "number" && Number.isFinite(n)),
        message:
          "currentLocation.coordinates must be an array of two finite numbers: [lng, lat]",
      },
    },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
    },

    name: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    familyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Family",
    },

    memberId: {
      type: String, // Format: familyId.memberIndex (e.g., 1000.1, 1000.2)
    },

    trips: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Trip",
      },
    ],

    isSharingLocation: {
      type: Boolean,
      default: false,
    },

    /**
     * GeoJSON Point for 2dsphere queries.
     *
     * IMPORTANT:
     * - This field MUST be either:
     *   1) missing / undefined / null
     *   2) a fully valid GeoJSON Point with both `type` and `coordinates`
     *
     * If a document contains `{ currentLocation: { type: "Point" } }` (no coordinates),
     * MongoDB will throw when maintaining/extracting geo keys for a 2dsphere index.
     */
    currentLocation: {
      type: geoPointSchema,
      default: undefined, // omit entirely unless explicitly set
    },

    lastLocationUpdate: {
      type: Date,
    },
  },
  { timestamps: true },
);

// Ensure we don't accidentally persist an invalid shape like { type: "Point" }.
userSchema.pre("validate", function normalizeCurrentLocation() {
  const loc = this.currentLocation;

  if (loc == null) {
    this.currentLocation = undefined;
    return;
  }

  const hasType = typeof loc?.type === "string" && loc.type.length > 0;
  const hasCoords =
    Array.isArray(loc?.coordinates) && loc.coordinates.length > 0;

  // If either part is missing, drop the whole field (safer for 2dsphere index).
  if (!hasType || !hasCoords) {
    this.currentLocation = undefined;
  }
});

export default mongoose.model("User", userSchema);
