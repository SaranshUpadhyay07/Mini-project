import mongoose from "mongoose";

// Counter schema for auto-incrementing familyId
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 1000 }
});

const Counter = mongoose.model("Counter", counterSchema);

const familySchema = new mongoose.Schema(
  {
    familyId: {
      type: Number,
      unique: true,
    },

    familyCode: {
      type: String,
      unique: true,
      // Not required here since it's generated in pre-save hook
    },

    familyName: {
      type: String,
      required: true,
    },

    adminUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    isChild: {
      type: Boolean,
      default: false,
    },

    members: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        memberId: {
          type: String, // Format: familyId.memberIndex (e.g., 1000.1, 1000.2)
        },
        role: {
          type: String,
          enum: ["admin", "member"],
          default: "member",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    activeTripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
    },

    lostMembers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        reportedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        reportedAt: {
          type: Date,
          default: Date.now,
        },
        lastKnownLocation: {
          type: {
            type: String,
            enum: ["Point"],
          },
          coordinates: [Number], // [lng, lat]
        },
        isResolved: {
          type: Boolean,
          default: false,
        },
        resolvedAt: Date,
      },
    ],

    maxDistanceAlert: {
      type: Number,
      default: 500, // meters - alert if member is more than 500m away
    },
  },
  { timestamps: true }
);

// Generate unique family code
familySchema.statics.generateFamilyCode = function() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Auto-increment familyId before saving
familySchema.pre("save", async function() {
  // Only generate for new families
  if (this.isNew) {
    // Generate familyId if not present
    if (!this.familyId) {
      const counter = await Counter.findByIdAndUpdate(
        { _id: "familyId" },
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true }
      );
      this.familyId = counter.seq;
    }
    
    // Generate unique family code if not present
    if (!this.familyCode) {
      let code = this.constructor.generateFamilyCode();
      let exists = await this.constructor.findOne({ familyCode: code });
      
      // Keep generating until we get a unique code
      while (exists) {
        code = this.constructor.generateFamilyCode();
        exists = await this.constructor.findOne({ familyCode: code });
      }
      
      this.familyCode = code;
    }
  }
});

// Assign memberId when member is added
familySchema.methods.assignMemberId = function(memberIndex) {
  return `${this.familyId}.${memberIndex}`;
};

export default mongoose.model("Family", familySchema);