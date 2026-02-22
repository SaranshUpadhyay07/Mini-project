import express from "express";
import {
  syncUser,
  getProfile,
  updateProfile,
} from "../controllers/auth.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";

const router = express.Router();

const withRouteLog = (file, routeName, handler) => async (req, res, next) => {
  console.log(`[${file}] [${routeName}] enter`);
  try {
    const result = await handler(req, res, next);
    console.log(`[${file}] [${routeName}] exit`);
    return result;
  } catch (err) {
    console.error(`[${file}] [${routeName}] error: ${err?.message || err}`);
    throw err;
  }
};

// Public route - sync user after Firebase authentication
router.post(
  "/sync",
  withRouteLog("api/routes/auth.routes.js", "POST /sync", syncUser),
);

// Protected routes - require authentication
router.get(
  "/profile",
  authenticateUser,
  withRouteLog("api/routes/auth.routes.js", "GET /profile", getProfile),
);
router.put(
  "/profile",
  authenticateUser,
  withRouteLog("api/routes/auth.routes.js", "PUT /profile", updateProfile),
);

export default router;
