import admin from '../config/firebase.config.js';
import User from '../models/user.model.js';

/**
 * Middleware to verify Firebase token and authenticate user
 */
const authenticateUser = async (req, res, next) => {
  try {
    if (!admin) {
      return res.status(500).json({
        success: false,
        message: 'Firebase Admin is not initialized on server.',
      });
    }

    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Authorization denied.'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token with Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Find user by Firebase UID first
    let user = await User.findOne({ firebaseUid: decodedToken.uid });

    if (!user && decodedToken.email) {
      // Fallback: find by same email and relink UID
      user = await User.findOne({ email: decodedToken.email });
      if (user) {
        user.firebaseUid = decodedToken.uid;
        user.name = user.name || decodedToken.name || decodedToken.email.split('@')[0];
        user.phone = user.phone || decodedToken.phone_number || '';
        await user.save();
      }
    }

    if (!user) {
      // Create new user if doesn't exist by UID or email
      user = await User.create({
        firebaseUid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.email.split('@')[0],
        phone: decodedToken.phone_number || '',
      });
    }

    // Attach user to request object
    req.user = user;
    req.firebaseUser = decodedToken;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid token. Authentication failed.',
      error: error.message
    });
  }
};

/**
 * Middleware to check if user is admin
 */
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
};

export { authenticateUser, isAdmin };
