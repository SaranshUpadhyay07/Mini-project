import mongoose from 'mongoose';

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

    currentLocation: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: [Number], // [lng, lat]
    },

    lastLocationUpdate: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);