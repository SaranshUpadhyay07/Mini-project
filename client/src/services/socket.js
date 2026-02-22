import io from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
let socket;

/**
 * Initialize socket connection and join family room
 * @param {string} familyId - Family ID to join
 * @param {string} userId - Current user's ID
 */
export const initiateSocket = (familyId, userId) => {
  // Prevent multiple connections
  if (socket && socket.connected) {
    console.log("⚡ Socket already connected, reusing existing connection");
    // Just rejoin the family room if needed
    if (familyId) {
      socket.emit("join_family", { familyId, userId });
    }
    return;
  }

  // Clean up any existing disconnected socket
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  console.log("🔌 Initiating new socket connection...");

  socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnection: true,
    forceNew: false, // Reuse connection if possible
    autoConnect: true,
  });

  socket.on("connect", () => {
    console.log("✅ Socket connected:", socket.id);
    if (familyId) {
      socket.emit("join_family", { familyId, userId });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("❌ Socket disconnected:", reason);
    // Only log, don't auto-reconnect aggressively
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Socket connection error:", error.message);
  });

  socket.on("reconnect", (attemptNumber) => {
    console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
    // Rejoin family room after reconnection
    if (familyId) {
      socket.emit("join_family", { familyId, userId });
    }
  });
};

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket) {
    console.log("🔌 Disconnecting socket...");
    socket.removeAllListeners(); // Clean up all listeners
    socket.disconnect();
    socket = null;
    console.log("✅ Socket disconnected successfully");
  }
};

/**
 * Subscribe to live location updates from other family members
 * @param {function} callback - Function to call when location is received
 * @returns {function} Unsubscribe function
 */
export const subscribeToLocationUpdates = (callback) => {
  if (!socket) {
    console.warn("⚠️  Socket not initialized");
    return () => {};
  }

  // Remove any existing listeners to prevent duplicates
  socket.off("receive_location");

  socket.on("receive_location", (data) => {
    console.log("📍 Socket Location Received:", data);
    callback(data);
  });

  // Return unsubscribe function
  return () => {
    if (socket) {
      socket.off("receive_location");
    }
  };
};

/**
 * Subscribe to initial cached locations when joining
 * @param {function} callback - Function to call with cached locations array
 * @returns {function} Unsubscribe function
 */
export const subscribeToInitialLocations = (callback) => {
  if (!socket) {
    console.warn("⚠️  Socket not initialized");
    return () => {};
  }

  // Remove any existing listeners to prevent duplicates
  socket.off("initial_locations");

  socket.on("initial_locations", (locations) => {
    console.log("💾 Cached locations received:", locations);
    callback(locations);
  });

  // Return unsubscribe function
  return () => {
    if (socket) {
      socket.off("initial_locations");
    }
  };
};

/**
 * Send your current location to family members
 * @param {Object} data - Location data with familyId, userId, lat, lng, heading, speed
 */
export const sendLocationUpdate = (data) => {
  if (!socket || !socket.connected) {
    console.warn("Socket not connected, cannot send location");
    return;
  }

  socket.emit("send_location", {
    ...data,
    timestamp: Date.now(),
  });

  console.log("📡 Location sent:", data);
};

/**
 * Check if socket is connected
 * @returns {boolean}
 */
export const isSocketConnected = () => {
  return socket && socket.connected;
};
