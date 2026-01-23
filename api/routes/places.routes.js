import express from 'express';
import { 
  searchPilgrimLocations, 
  getLocationDetails,
  getOdishaPilgrimLocations 
} from '../controllers/places.controller.js';

const router = express.Router();

// Get all pilgrim locations in Odisha (Puri, Bhubaneswar, Konark)
router.get('/odisha-pilgrim-locations', getOdishaPilgrimLocations);

// Search for pilgrim locations by city
router.get('/search', searchPilgrimLocations);

// Get specific location details by eLoc
router.get('/details/:eLoc', getLocationDetails);

export default router;
