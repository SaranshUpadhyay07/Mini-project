import express from 'express';
import { syncUser, getProfile, updateProfile } from '../controllers/auth.controller.js';
import { authenticateUser } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public route - sync user after Firebase authentication
router.post('/sync', syncUser);

// Protected routes - require authentication
router.get('/profile', authenticateUser, getProfile);
router.put('/profile', authenticateUser, updateProfile);

export default router;
