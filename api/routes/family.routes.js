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

const FILE = "api/routes/family.routes.js";

const router = express.Router();

// All routes require authentication
router.use((req, res, next) => {
  console.log(
    `[${FILE}] [authenticateUser] guarding ${req.method} ${req.originalUrl}`,
  );
  return authenticateUser(req, res, next);
});

// Family management
router.post("/create", (req, res, next) => {
  console.log(`[${FILE}] [createFamily] route hit`);
  return createFamily(req, res, next);
});
router.post("/join", (req, res, next) => {
  console.log(`[${FILE}] [joinFamily] route hit`);
  return joinFamily(req, res, next);
});
router.get("/", (req, res, next) => {
  console.log(`[${FILE}] [getFamily] route hit`);
  return getFamily(req, res, next);
});
router.post("/leave", (req, res, next) => {
  console.log(`[${FILE}] [leaveFamily] route hit`);
  return leaveFamily(req, res, next);
});

// Admin routes
router.get("/all", (req, res, next) => {
  console.log(`[${FILE}] [getAllFamilies] route hit`);
  return getAllFamilies(req, res, next);
}); // App admin only
router.post("/trip/start", (req, res, next) => {
  console.log(`[${FILE}] [startTrip] route hit`);
  return startTrip(req, res, next);
}); // Family admin only

// Location tracking
router.post("/location/update", (req, res, next) => {
  console.log(`[${FILE}] [updateMemberLocation] route hit`);
  return updateMemberLocation(req, res, next);
});
router.post("/location/toggle", (req, res, next) => {
  console.log(`[${FILE}] [toggleLocationSharing] route hit`);
  return toggleLocationSharing(req, res, next);
});
router.get("/location/latest", (req, res, next) => {
  console.log(`[${FILE}] [getLatestFamilyLocations] route hit`);
  return getLatestFamilyLocations(req, res, next);
});
router.get("/location/member/:memberUserId", (req, res, next) => {
  console.log(
    `[${FILE}] [getLatestMemberLocation] route hit memberUserId=${req.params?.memberUserId}`,
  );
  return getLatestMemberLocation(req, res, next);
});

// Lost member management
router.post("/member/lost/report", (req, res, next) => {
  console.log(`[${FILE}] [reportLostMember] route hit`);
  return reportLostMember(req, res, next);
});
router.post("/member/lost/resolve", (req, res, next) => {
  console.log(`[${FILE}] [resolveLostMember] route hit`);
  return resolveLostMember(req, res, next);
});

export default router;
