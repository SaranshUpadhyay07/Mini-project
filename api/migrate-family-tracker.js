/**
 * Database Migration Script for Family Tracker Feature
 * Run this script once to update existing users and initialize the counter
 * 
 * Usage: node migrate-family-tracker.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Define schemas (minimal versions for migration)
const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema);

const counterSchema = new mongoose.Schema({
  _id: String,
  seq: Number,
});
const Counter = mongoose.model('Counter', counterSchema);

// Migration functions
const migrateUsers = async () => {
  console.log('\n📝 Migrating users...');
  
  // Add new fields to existing users
  const result = await User.updateMany(
    { 
      $or: [
        { memberId: { $exists: false } },
        { currentLocation: { $exists: false } },
        { lastLocationUpdate: { $exists: false } }
      ]
    },
    {
      $set: {
        memberId: null,
        currentLocation: null,
        lastLocationUpdate: null,
      }
    }
  );
  
  console.log(`✅ Updated ${result.modifiedCount} users`);
};

const initializeCounter = async () => {
  console.log('\n📝 Initializing family ID counter...');
  
  const existing = await Counter.findById('familyId');
  
  if (!existing) {
    await Counter.create({
      _id: 'familyId',
      seq: 1000,
    });
    console.log('✅ Counter initialized at 1000');
  } else {
    console.log('ℹ️  Counter already exists, current value:', existing.seq);
  }
};

const createIndexes = async () => {
  console.log('\n📝 Creating indexes...');
  
  // Create geospatial index on LiveLocation
  const LiveLocation = mongoose.model('LiveLocation', new mongoose.Schema({
    location: {
      type: { type: String },
      coordinates: [Number]
    }
  }, { strict: false }));
  
  try {
    await LiveLocation.collection.createIndex({ location: '2dsphere' });
    console.log('✅ Created 2dsphere index on LiveLocation.location');
  } catch (error) {
    console.log('⚠️  Index may already exist:', error.message);
  }
  
  // Create index on User currentLocation
  const UserModel = mongoose.model('User');
  try {
    await UserModel.collection.createIndex({ currentLocation: '2dsphere' });
    console.log('✅ Created 2dsphere index on User.currentLocation');
  } catch (error) {
    console.log('⚠️  Index may already exist:', error.message);
  }
  
  // Create index on Family familyCode
  const Family = mongoose.model('Family', new mongoose.Schema({}, { strict: false }));
  try {
    await Family.collection.createIndex({ familyCode: 1 }, { unique: true });
    console.log('✅ Created unique index on Family.familyCode');
  } catch (error) {
    console.log('⚠️  Index may already exist:', error.message);
  }
  
  // Create index on Family familyId
  try {
    await Family.collection.createIndex({ familyId: 1 }, { unique: true });
    console.log('✅ Created unique index on Family.familyId');
  } catch (error) {
    console.log('⚠️  Index may already exist:', error.message);
  }
};

const verifyMigration = async () => {
  console.log('\n📊 Verifying migration...');
  
  const userCount = await User.countDocuments();
  const usersWithNewFields = await User.countDocuments({
    memberId: { $exists: true },
    currentLocation: { $exists: true },
  });
  
  const counter = await Counter.findById('familyId');
  
  console.log(`
  Total Users: ${userCount}
  Users with new fields: ${usersWithNewFields}
  Family ID Counter: ${counter ? counter.seq : 'NOT FOUND'}
  `);
  
  if (usersWithNewFields === userCount && counter) {
    console.log('✅ Migration completed successfully!');
  } else {
    console.log('⚠️  Migration may be incomplete');
  }
};

// Main migration function
const runMigration = async () => {
  console.log('🚀 Starting Family Tracker Database Migration...\n');
  
  try {
    await connectDB();
    
    await migrateUsers();
    await initializeCounter();
    await createIndexes();
    await verifyMigration();
    
    console.log('\n✅ All migration steps completed!\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run migration
runMigration();
