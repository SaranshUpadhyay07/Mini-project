import User from "../models/user.model.js";

const FILE = "api/controllers/auth.controller.js";

/**
 * Sync user data from Firebase to MongoDB
 * Called after Firebase authentication on frontend
 */
const syncUser = async (req, res) => {
  console.log(`[${FILE}] [syncUser] entry`);
  try {
    const { firebaseUid, email, name, phone } = req.body;
    console.log(
      `[${FILE}] [syncUser] payload received (hasFirebaseUid=${Boolean(firebaseUid)} hasEmail=${Boolean(email)})`,
    );

    // Check if user already exists
    console.log(`[${FILE}] [syncUser] db: findOne by firebaseUid`);
    let user = await User.findOne({ firebaseUid });

    if (user) {
      console.log(`[${FILE}] [syncUser] branch existing_user`);
      // Update existing user
      const updates = {
        name: name || user.name,
        phone: phone || user.phone,
        email: email || user.email,
      };
      console.log(
        `[${FILE}] [syncUser] updating fields (nameChanged=${updates.name !== user.name} phoneChanged=${updates.phone !== user.phone} emailChanged=${updates.email !== user.email})`,
      );

      user.name = updates.name;
      user.phone = updates.phone;
      user.email = updates.email;

      console.log(`[${FILE}] [syncUser] db: save existing user`);
      await user.save();

      console.log(`[${FILE}] [syncUser] exit (200)`);
      return res.status(200).json({
        success: true,
        message: "User data synced successfully",
        user,
      });
    }

    console.log(`[${FILE}] [syncUser] branch new_user_create`);
    // Create new user
    const derivedName =
      name || (typeof email === "string" ? email.split("@")[0] : undefined);

    console.log(`[${FILE}] [syncUser] db: create user`);
    user = await User.create({
      firebaseUid,
      email,
      name: derivedName,
      phone: phone || "",
    });

    console.log(`[${FILE}] [syncUser] exit (201)`);
    res.status(201).json({
      success: true,
      message: "User created successfully",
      user,
    });
  } catch (error) {
    console.error(`[${FILE}] [syncUser] error:`, error);
    res.status(500).json({
      success: false,
      message: "Error syncing user data",
      error: error.message,
    });
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  console.log(`[${FILE}] [getProfile] entry`);
  try {
    let user = null;

    if (req.user?._id) {
      console.log(
        `[${FILE}] [getProfile] db: findById (userIdPresent=${Boolean(req.user?._id)})`,
      );
      user = await User.findById(req.user._id);
      console.log(
        `[${FILE}] [getProfile] branch by_id (found=${Boolean(user)})`,
      );
    }

    // Fallback lookup by email to satisfy same-email profile fetch behavior
    if (!user && req.firebaseUser?.email) {
      console.log(
        `[${FILE}] [getProfile] branch fallback_by_email (emailPresent=${Boolean(req.firebaseUser?.email)})`,
      );
      console.log(`[${FILE}] [getProfile] db: findOne by email`);
      user = await User.findOne({ email: req.firebaseUser.email });
      console.log(
        `[${FILE}] [getProfile] fallback_by_email result (found=${Boolean(user)})`,
      );
    }

    if (!user) {
      console.log(`[${FILE}] [getProfile] exit (404) not_found`);
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    console.log(`[${FILE}] [getProfile] exit (200)`);
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(`[${FILE}] [getProfile] error:`, error);
    res.status(500).json({
      success: false,
      message: "Error fetching profile",
      error: error.message,
    });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  console.log(`[${FILE}] [updateProfile] entry`);
  try {
    const { name, phone } = req.body;
    console.log(
      `[${FILE}] [updateProfile] payload received (hasName=${Boolean(name)} hasPhone=${Boolean(phone)})`,
    );

    console.log(`[${FILE}] [updateProfile] db: findByIdAndUpdate`);
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone },
      { returnDocument: "after", runValidators: true },
    );

    console.log(`[${FILE}] [updateProfile] exit (200)`);
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error(`[${FILE}] [updateProfile] error:`, error);
    res.status(500).json({
      success: false,
      message: "Error updating profile",
      error: error.message,
    });
  }
};

export { syncUser, getProfile, updateProfile };
