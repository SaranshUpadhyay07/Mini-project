/**
 * Database Migration Script for Family Tracker Feature
 * Run this script once to update existing users and initialize the counter
 *
 * Usage: node migrate-family-tracker.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const LOG_FILE = "api/migrate-family-tracker.js";
const log = (fn, message) => console.log(`[${LOG_FILE}] [${fn}] ${message}`);
const errorLog = (fn, message) =>
  console.error(`[${LOG_FILE}] [${fn}] ${message}`);

// Connect to MongoDB
const connectDB = async () => {
  const FN = "connectDB";
  log(FN, "enter");
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    log(FN, `connecting (uriPresent=${Boolean(uri)})`);
    await mongoose.connect(uri);
    log(FN, "db connected");
    console.log("✅ MongoDB Connected");
    log(FN, "exit");
  } catch (error) {
    errorLog(FN, `error: ${error?.message || error}`);
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Define schemas (minimal versions for migration)
const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model("User", userSchema);

const counterSchema = new mongoose.Schema({
  _id: String,
  seq: Number,
});
const Counter = mongoose.model("Counter", counterSchema);

// Migration functions
const migrateUsers = async () => {
  const FN = "migrateUsers";
  log(FN, "enter");
  console.log("\n📝 Migrating users...");

  // Add new fields to existing users
  log(FN, "updating users missing new fields");
  const result = await User.updateMany(
    {
      $or: [
        { memberId: { $exists: false } },
        { currentLocation: { $exists: false } },
        { lastLocationUpdate: { $exists: false } },
      ],
    },
    {
      $set: {
        memberId: null,
        currentLocation: null,
        lastLocationUpdate: null,
      },
    },
  );

  log(
    FN,
    `update complete (modifiedCount=${result?.modifiedCount ?? "unknown"})`,
  );
  console.log(`✅ Updated ${result.modifiedCount} users`);
  log(FN, "exit");
};

const initializeCounter = async () => {
  const FN = "initializeCounter";
  log(FN, "enter");
  console.log("\n📝 Initializing family ID counter...");

  log(FN, "checking existing counter");
  const existing = await Counter.findById("familyId");

  if (!existing) {
    log(FN, "counter not found; creating");
    await Counter.create({
      _id: "familyId",
      seq: 1000,
    });
    console.log("✅ Counter initialized at 1000");
    log(FN, "created counter (seq=1000)");
  } else {
    log(FN, `counter exists (seq=${existing.seq})`);
    console.log("ℹ️  Counter already exists, current value:", existing.seq);
  }
  log(FN, "exit");
};

const createIndexes = async () => {
  const FN = "createIndexes";
  log(FN, "enter");
  console.log("\n📝 Creating indexes...");

  // Create geospatial index on LiveLocation
  const LiveLocation = mongoose.model(
    "LiveLocation",
    new mongoose.Schema(
      {
        location: {
          type: { type: String },
          coordinates: [Number],
        },
      },
      { strict: false },
    ),
  );

  try {
    log(FN, "creating index LiveLocation.location (2dsphere)");
    await LiveLocation.collection.createIndex({ location: "2dsphere" });
    console.log("✅ Created 2dsphere index on LiveLocation.location");
  } catch (error) {
    log(
      FN,
      `index LiveLocation.location skipped/failed: ${error?.message || error}`,
    );
    console.log("⚠️  Index may already exist:", error.message);
  }

  // Create index on User currentLocation
  const UserModel = mongoose.model("User");
  try {
    log(FN, "creating index User.currentLocation (2dsphere)");
    await UserModel.collection.createIndex({ currentLocation: "2dsphere" });
    console.log("✅ Created 2dsphere index on User.currentLocation");
  } catch (error) {
    log(
      FN,
      `index User.currentLocation skipped/failed: ${error?.message || error}`,
    );
    console.log("⚠️  Index may already exist:", error.message);
  }

  // Create index on Family familyCode
  const Family = mongoose.model(
    "Family",
    new mongoose.Schema({}, { strict: false }),
  );
  try {
    log(FN, "creating index Family.familyCode (unique)");
    await Family.collection.createIndex({ familyCode: 1 }, { unique: true });
    console.log("✅ Created unique index on Family.familyCode");
  } catch (error) {
    log(
      FN,
      `index Family.familyCode skipped/failed: ${error?.message || error}`,
    );
    console.log("⚠️  Index may already exist:", error.message);
  }

  // Create index on Family familyId
  try {
    log(FN, "creating index Family.familyId (unique)");
    await Family.collection.createIndex({ familyId: 1 }, { unique: true });
    console.log("✅ Created unique index on Family.familyId");
  } catch (error) {
    log(FN, `index Family.familyId skipped/failed: ${error?.message || error}`);
    console.log("⚠️  Index may already exist:", error.message);
  }
  log(FN, "exit");
};

const verifyMigration = async () => {
  const FN = "verifyMigration";
  log(FN, "enter");
  console.log("\n📊 Verifying migration...");

  log(FN, "counting users");
  const userCount = await User.countDocuments();
  log(FN, "counting users with new fields");
  const usersWithNewFields = await User.countDocuments({
    memberId: { $exists: true },
    currentLocation: { $exists: true },
  });

  log(FN, "reading counter");
  const counter = await Counter.findById("familyId");

  console.log(`
  Total Users: ${userCount}
  Users with new fields: ${usersWithNewFields}
  Family ID Counter: ${counter ? counter.seq : "NOT FOUND"}
  `);

  if (usersWithNewFields === userCount && counter) {
    log(FN, "verification passed");
    console.log("✅ Migration completed successfully!");
  } else {
    log(FN, "verification indicates incomplete migration");
    console.log("⚠️  Migration may be incomplete");
  }
  log(FN, "exit");
};

// Main migration function
const runMigration = async () => {
  const FN = "runMigration";
  log(FN, "enter");
  console.log("🚀 Starting Family Tracker Database Migration...\n");

  try {
    log(FN, "step connectDB start");
    await connectDB();
    log(FN, "step connectDB done");

    log(FN, "step migrateUsers start");
    await migrateUsers();
    log(FN, "step migrateUsers done");

    log(FN, "step initializeCounter start");
    await initializeCounter();
    log(FN, "step initializeCounter done");

    log(FN, "step createIndexes start");
    await createIndexes();
    log(FN, "step createIndexes done");

    log(FN, "step verifyMigration start");
    await verifyMigration();
    log(FN, "step verifyMigration done");

    console.log("\n✅ All migration steps completed!\n");
    log(FN, "exit success");
  } catch (error) {
    errorLog(FN, `error: ${error?.message || error}`);
    console.error("\n❌ Migration failed:", error);
  } finally {
    log(FN, "closing db connection");
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
    log(FN, "exit (process exit 0)");
    process.exit(0);
  }
};

// Run migration
runMigration();
