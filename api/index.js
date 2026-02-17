import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import connectDB from './config/db.config.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import placesRoutes from './routes/places.routes.js';
import familyRoutes from './routes/family.routes.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// --------------------
// Middleware
// --------------------
app.use(
  cors({
    origin: 'http://localhost:5173', // frontend
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --------------------
// Base Routes
// --------------------
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Patha Gamini API',
    version: '1.0.0',
    status: 'Server is running',
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

// --------------------
// API Routes
// --------------------
app.use('/api/auth', authRoutes);     // signup / signin / sync
app.use('/api/users', userRoutes);    // profile (me, update)
app.use('/api/places', placesRoutes); // map / places APIs
app.use('/api/family', familyRoutes); // family tracking & management

// --------------------
// 404 Handler
// --------------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// --------------------
// Global Error Handler
// --------------------
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// --------------------
// Start Server
// --------------------
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}`);
});

export default app;
