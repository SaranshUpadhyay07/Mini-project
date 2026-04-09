import express from "express";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { getProfile, updateProfile } from "../controllers/auth.controller.js";

const router = express.Router();

const withRouteLog =
  (file, routeLabel, handlerName, handler) => async (req, res, next) => {
    console.log(`[${file}] [${handlerName}] route_enter ${routeLabel}`);
    try {
      const result = await handler(req, res, next);
      console.log(`[${file}] [${handlerName}] route_exit ${routeLabel}`);
      return result;
    } catch (err) {
      console.error(
        `[${file}] [${handlerName}] route_error ${routeLabel}: ${err?.message || err}`,
      );
      throw err;
    }
  };

const FILE = "api/routes/user.routes.js";

// Get logged-in user's profile
router.get(
  "/me",
  authenticateUser,
  withRouteLog(FILE, "GET /me", "getProfile", getProfile),
);

// Update profile (optional, later)
router.put(
  "/me",
  authenticateUser,
  withRouteLog(FILE, "PUT /me", "updateProfile", updateProfile),
);

import User from "../models/user.model.js";

// Update current user's location (called automatically by the client)
router.post(
  "/location",
  authenticateUser,
  withRouteLog(FILE, "POST /location", "updateUserLocation", async (req, res) => {
    const { latitude, longitude, accuracy } = req.body;

    if (latitude == null || longitude == null) {
      return res.status(400).json({ success: false, message: "latitude and longitude are required" });
    }

    await User.findByIdAndUpdate(
      req.user._id,
      {
        currentLocation: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        lastLocationUpdate: new Date(),
      },
    );

    return res.json({ success: true });
  }),
);

// Clear current user's location (called on page unload via sendBeacon)
router.post(
  "/location/clear",
  async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ success: false, message: "token required" });
      }

      // Manually verify since sendBeacon can't set Authorization header
      const admin = (await import("../config/firebase.config.js")).default;
      const decoded = await admin.auth().verifyIdToken(token);

      // Clear this user's location
      await User.findOneAndUpdate(
        { firebaseUid: decoded.uid },
        { $unset: { currentLocation: 1 }, lastLocationUpdate: null },
      );

      // Also clean up any stale locations (>5 min) from other users
      const cutoff = new Date(Date.now() - 5 * 60 * 1000);
      await User.updateMany(
        { lastLocationUpdate: { $lt: cutoff, $ne: null } },
        { $unset: { currentLocation: 1 }, lastLocationUpdate: null },
      );

      return res.json({ success: true });
    } catch (e) {
      console.error("[user.routes] location/clear error:", e.message);
      return res.status(401).json({ success: false, message: "invalid token" });
    }
  },
);

// Get all users' locations (for crowd heatmap) — filters stale (>5 min old)
router.get(
  "/locations",
  authenticateUser,
  withRouteLog(FILE, "GET /locations", "getAllUserLocations", async (req, res) => {
    const STALE_MS = 5 * 60 * 1000; // 5 minutes
    const cutoff = new Date(Date.now() - STALE_MS);

    const users = await User.find(
      {
        currentLocation: { $exists: true, $ne: null },
        lastLocationUpdate: { $gte: cutoff },
      },
      { currentLocation: 1, lastLocationUpdate: 1, _id: 0 }
    ).lean();

    const locations = users
      .filter((u) => u.currentLocation?.coordinates?.length === 2)
      .map((u) => ({
        lat: u.currentLocation.coordinates[1],
        lng: u.currentLocation.coordinates[0],
        lastUpdated: u.lastLocationUpdate,
      }));

    return res.json({ success: true, data: locations });
  }),
);

export default router;
