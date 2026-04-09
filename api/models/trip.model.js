import mongoose from "mongoose";

const itinerarySchema = new mongoose.Schema(
  {
    day: Number,
    date: Date,

    activities: [
      {
        placeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Attraction",
        },
        timeSlot: String,
        notes: String,
      },
    ],
  },
  { _id: false }
);

const tripSchema = new mongoose.Schema(
  {
    familyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Family",
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    title: {
      type: String,
      required: true,
    },

    location: {
      type: String,
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["planned", "ongoing", "completed"],
      default: "planned",
    },

    itinerary: [itinerarySchema],
  },
  { timestamps: true }
);

export default mongoose.model("Trip", tripSchema);