import mongoose from "mongoose";

const connectDB = async () => {
  console.log("[api/config/db.config.js] [connectDB] entry");

  try {
    const hasMongoUri = Boolean(process.env.MONGO_URI);
    console.log(
      `[api/config/db.config.js] [connectDB] connecting (hasMONGO_URI=${hasMongoUri})`,
    );

    await mongoose.connect(process.env.MONGO_URI, {
      tls: true,
    });

    console.log("[api/config/db.config.js] [connectDB] connected");
    console.log("[api/config/db.config.js] [connectDB] exit");
  } catch (error) {
    console.error(
      "[api/config/db.config.js] [connectDB] error:",
      error?.message || error,
    );
    process.exit(1);
  }
};

export default connectDB;
