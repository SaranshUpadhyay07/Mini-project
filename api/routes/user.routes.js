import express from 'express';
import { authenticateUser } from '../middlewares/auth.middleware.js';
import { getProfile, updateProfile } from '../controllers/auth.controller.js';

const router = express.Router();

// Get logged-in user's profile
router.get('/me', authenticateUser, getProfile);

// Update profile (optional, later)
router.put('/me', authenticateUser, updateProfile);

export default router;
