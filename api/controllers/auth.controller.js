import User from '../models/user.model.js';

/**
 * Sync user data from Firebase to MongoDB
 * Called after Firebase authentication on frontend
 */
const syncUser = async (req, res) => {
  try {
    const { firebaseUid, email, name, phone } = req.body;

    // Check if user already exists
    let user = await User.findOne({ firebaseUid });

    if (user) {
      // Update existing user
      user.name = name || user.name;
      user.phone = phone || user.phone;
      user.email = email || user.email;
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'User data synced successfully',
        user
      });
    }

    // Create new user
    user = await User.create({
      firebaseUid,
      email,
      name: name || email.split('@')[0],
      phone: phone || ''
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user
    });
  } catch (error) {
    console.error('Sync user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error syncing user data',
      error: error.message
    });
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    let user = null;

    if (req.user?._id) {
      user = await User.findById(req.user._id);
    }

    // Fallback lookup by email to satisfy same-email profile fetch behavior
    if (!user && req.firebaseUser?.email) {
      user = await User.findOne({ email: req.firebaseUser.email });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone },
      { returnDocument: 'after', runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

export { syncUser, getProfile, updateProfile };
