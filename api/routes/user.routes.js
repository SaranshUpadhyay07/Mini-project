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

export default router;
