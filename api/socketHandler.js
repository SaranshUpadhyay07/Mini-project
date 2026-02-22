import { Server } from "socket.io";
import Redis from "ioredis";

const FILE = "api/socketHandler.js";
const log = (fn, msg) => console.log(`[${FILE}] [${fn}] ${msg}`);
const warn = (fn, msg) => console.warn(`[${FILE}] [${fn}] ${msg}`);
const errorLog = (fn, msg) => console.error(`[${FILE}] [${fn}] ${msg}`);

// Optional Redis (graceful fallback if not available)
let redis = null;
let isRedisAvailable = false;

try {
  log("redisInit", "initializing redis client");
  redis = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: 0, // Database index
    retryStrategy: (times) => {
      if (times > 3) {
        // Stop retrying after 3 attempts
        return null;
      }
      return Math.min(times * 100, 2000); // Reconnect with exponential backoff
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: true,
    connectTimeout: 10000,
    lazyConnect: false, // Connect immediately for production
    // Connection pool settings for production
    maxRetriesPerRequest: 1,
  });

  redis.on("ready", () => {
    isRedisAvailable = true;
    log(
      "redisInit",
      `ready host=${process.env.REDIS_HOST || "localhost"} port=${process.env.REDIS_PORT || 6379}`,
    );
    console.log(
      "✅ Redis connected - location caching enabled (Production Mode)",
    );
  });

  redis.on("error", (err) => {
    isRedisAvailable = false;
    errorLog("redisInit", `error ${err?.message || err}`);
    console.error("❌ Redis error:", err.message);
  });

  redis.on("close", () => {
    isRedisAvailable = false;
    warn("redisInit", "connection closed");
    console.warn("⚠️  Redis connection closed");
  });

  redis.on("reconnecting", () => {
    log("redisInit", "reconnecting");
    console.log("🔄 Redis reconnecting...");
  });

  redis.on("end", () => {
    isRedisAvailable = false;
    redis = null;
    warn("redisInit", "connection ended; caching disabled");
    console.warn(
      "⚠️  Redis connection ended - using Socket.io only (no caching)",
    );
  });
} catch (error) {
  isRedisAvailable = false;
  redis = null;
  errorLog("redisInit", `initialization failed ${error?.message || error}`);
  console.error("❌ Redis initialization error:", error.message);
  console.warn("⚠️  Falling back to Socket.io only (no caching)");
}

export const setupSocket = (server) => {
  log("setupSocket", "entry");
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173", // React Frontend URL
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    log("connection", `client_connected socketId=${socket.id}`);
    console.log("⚡ New client connected:", socket.id);

    // 1. Join a Family Room
    socket.on("join_family", async ({ familyId, userId }) => {
      log("join_family", `enter familyId=${familyId} userId=${userId}`);
      socket.join(familyId);
      console.log(`👤 User ${userId} joined family room: ${familyId}`);

      // Send last known locations from Redis (if available)
      if (isRedisAvailable && redis) {
        log("join_family", "redis_path initial_locations");
        try {
          const keys = await redis.keys(`location:${familyId}:*`);
          log("join_family", `redis_keys count=${keys.length}`);
          if (keys.length > 0) {
            const locations = await redis.mget(keys);
            const parsedLocations = locations
              .filter((l) => l !== null)
              .map((l) => JSON.parse(l));
            socket.emit("initial_locations", parsedLocations);
            log(
              "join_family",
              `initial_locations_sent count=${parsedLocations.length}`,
            );
            console.log(
              `📍 Sent ${parsedLocations.length} cached locations to ${userId}`,
            );
          } else {
            log("join_family", "no_cached_locations");
          }
        } catch (error) {
          errorLog("join_family", `redis_error ${error?.message || error}`);
          console.error("Redis error:", error.message);
        }
      } else {
        log("join_family", "redis_unavailable skipping cache emit");
      }

      log("join_family", "exit");
    });

    // 2. Handle Location Update (From Member)
    socket.on("send_location", async (data) => {
      const {
        familyId,
        userId,
        lat,
        lng,
        heading,
        speed,
        accuracy,
        timestamp,
      } = data;

      log("send_location", `enter familyId=${familyId} userId=${userId}`);
      console.log(`📡 Received location from Firebase UID: ${userId}`);
      console.log(`   Family: ${familyId}, Lat: ${lat}, Lng: ${lng}`);

      try {
        const locationData = {
          userId, // This is Firebase UID
          lat,
          lng,
          heading: heading || 0,
          speed: speed || 0,
          accuracy: accuracy || 0,
          timestamp: timestamp || Date.now(),
        };

        log("send_location", "locationData_built");

        // A. Save to Redis (if available) - Expires in 1 hour
        if (isRedisAvailable && redis) {
          log("send_location", "redis_path setex");
          try {
            await redis.setex(
              `location:${familyId}:${userId}`,
              3600, // 1 hour expiry
              JSON.stringify(locationData),
            );
            log(
              "send_location",
              `redis_saved key=location:${familyId}:${userId}`,
            );
            console.log(`💾 Saved to Redis: location:${familyId}:${userId}`);
          } catch (error) {
            errorLog(
              "send_location",
              `redis_save_error ${error?.message || error}`,
            );
            console.error("Redis save error:", error.message);
          }
        } else {
          log("send_location", "redis_unavailable skipping cache save");
        }

        // B. Broadcast to everyone in the family EXCEPT sender (always works)
        socket.to(familyId).emit("receive_location", locationData);
        log("send_location", `broadcasted familyId=${familyId}`);
        console.log(
          `📡 Broadcasted location from ${userId} to family ${familyId}`,
        );

        log("send_location", "exit");
      } catch (error) {
        errorLog("send_location", `error ${error?.message || error}`);
        console.error("Error processing location update:", error);
      }
    });

    socket.on("disconnect", () => {
      log("disconnect", `client_disconnected socketId=${socket.id}`);
      console.log("❌ Client disconnected:", socket.id);
    });

    socket.on("error", (error) => {
      errorLog("socket_error", `${error?.message || error}`);
      console.error("Socket error:", error);
    });
  });

  log("setupSocket", "exit");
  return io;
};
