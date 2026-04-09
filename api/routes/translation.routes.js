import express from 'express';
import { translateText } from '../controllers/translation.controller.js';

const router = express.Router();

// POST /api/translate - Translate text using Sarvam AI
router.post('/', translateText);

export default router;
