import express from "express";
import {
  searchPilgrimLocations,
  getLocationDetails,
  getOdishaPilgrimLocations,
} from "../controllers/places.controller.js";

const router = express.Router();

const withRouteLog = (routeName, handler) => async (req, res, next) => {
  try {
    console.log(`[api/routes/places.routes.js] [${routeName}] enter`);
    await handler(req, res, next);
    console.log(`[api/routes/places.routes.js] [${routeName}] exit`);
  } catch (err) {
    console.error(
      `[api/routes/places.routes.js] [${routeName}] error: ${err?.message || err}`,
    );
    next(err);
  }
};

// Get all pilgrim locations in Odisha (Puri, Bhubaneswar, Konark)
router.get(
  "/odisha-pilgrim-locations",
  withRouteLog("getOdishaPilgrimLocations", getOdishaPilgrimLocations),
);

// Search for pilgrim locations by city
router.get(
  "/search",
  withRouteLog("searchPilgrimLocations", searchPilgrimLocations),
);

// Get specific location details by eLoc
router.get(
  "/details/:eLoc",
  withRouteLog("getLocationDetails", getLocationDetails),
);

export default router;
