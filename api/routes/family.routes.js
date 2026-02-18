import express from "express";
import {
  createFamily,
  joinFamily,
  getFamily,
  getAllFamilies,
  updateMemberLocation,
  toggleLocationSharing,
  startTrip,
  reportLostMember,
  resolveLostMember,
  leaveFamily,
  getLatestFamilyLocations,
  getLatestMemberLocation,
} from "../controllers/family.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

// Family management
router.post("/create", createFamily);
router.post("/join", joinFamily);
router.get("/", getFamily);
router.post("/leave", leaveFamily);

// Admin routes
router.get("/all", getAllFamilies); // App admin only
router.post("/trip/start", startTrip); // Family admin only

// Location tracking
router.post("/location/update", updateMemberLocation);
router.post("/location/toggle", toggleLocationSharing);
router.get("/location/latest", getLatestFamilyLocations);
router.get("/location/member/:memberUserId", getLatestMemberLocation);

// Lost member management
router.post("/member/lost/report", reportLostMember);
router.post("/member/lost/resolve", resolveLostMember);

export default router;
