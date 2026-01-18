import mongoose from "mongoose";

const familySchema = new mongoose.Schema(
  {
    familyName: {
      type: String,
      required: true,
    },

    adminUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    members: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["admin", "member"],
          default: "member",
        },
      },
    ],

    activeTripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Family", familySchema);