import { Server } from 'socket.io';
import Redis from 'ioredis';

// Optional Redis (graceful fallback if not available)
let redis = null;
let isRedisAvailable = false;

try {
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
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

  redis.on('ready', () => {
    isRedisAvailable = true;
    console.log('✅ Redis connected - location caching enabled (Production Mode)');
    console.log(`📦 Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`);
  });

  redis.on('error', (err) => {
    isRedisAvailable = false;
    console.error('❌ Redis error:', err.message);
  });

  redis.on('close', () => {
    isRedisAvailable = false;
    console.warn('⚠️  Redis connection closed');
  });

  redis.on('reconnecting', () => {
    console.log('🔄 Redis reconnecting...');
  });

  redis.on('end', () => {
    isRedisAvailable = false;
    redis = null;
    console.warn('⚠️  Redis connection ended - using Socket.io only (no caching)');
  });
} catch (error) {
  isRedisAvailable = false;
  redis = null;
  console.error('❌ Redis initialization error:', error.message);
  console.warn('⚠️  Falling back to Socket.io only (no caching)');
}

export const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173", // React Frontend URL
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    console.log("⚡ New client connected:", socket.id);

    // 1. Join a Family Room
    socket.on("join_family", async ({ familyId, userId }) => {
      socket.join(familyId);
      console.log(`👤 User ${userId} joined family room: ${familyId}`);
      
      // Send last known locations from Redis (if available)
      if (isRedisAvailable && redis) {
        try {
          const keys = await redis.keys(`location:${familyId}:*`);
          if (keys.length > 0) {
            const locations = await redis.mget(keys);
            const parsedLocations = locations
              .filter(l => l !== null)
              .map(l => JSON.parse(l));
            socket.emit("initial_locations", parsedLocations);
            console.log(`📍 Sent ${parsedLocations.length} cached locations to ${userId}`);
          }
        } catch (error) {
          console.error('Redis error:', error.message);
        }
      }
    });

    // 2. Handle Location Update (From Member)
    socket.on("send_location", async (data) => {
      const { familyId, userId, lat, lng, heading, speed, accuracy, timestamp } = data;

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
          timestamp: timestamp || Date.now()
        };

        // A. Save to Redis (if available) - Expires in 1 hour
        if (isRedisAvailable && redis) {
          try {
            await redis.setex(
              `location:${familyId}:${userId}`, 
              3600, // 1 hour expiry
              JSON.stringify(locationData)
            );
            console.log(`💾 Saved to Redis: location:${familyId}:${userId}`);
          } catch (error) {
            console.error('Redis save error:', error.message);
          }
        }

        // B. Broadcast to everyone in the family EXCEPT sender (always works)
        socket.to(familyId).emit("receive_location", locationData);
        
        console.log(`📡 Broadcasted location from ${userId} to family ${familyId}`);
      } catch (error) {
        console.error('Error processing location update:', error);
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  });

  return io;
};
