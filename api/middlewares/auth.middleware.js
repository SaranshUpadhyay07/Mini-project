import admin from "../config/firebase.config.js";
import User from "../models/user.model.js";

const FILE = "api/middlewares/auth.middleware.js";

/**
 * Middleware to verify Firebase token and authenticate user
 */
const authenticateUser = async (req, res, next) => {
  const FN = "authenticateUser";
  console.log(`[${FILE}] [${FN}] enter ${req.method} ${req.originalUrl}`);

  try {
    if (!admin) {
      console.error(`[${FILE}] [${FN}] Firebase Admin not initialized`);
      return res.status(500).json({
        success: false,
        message: "Firebase Admin is not initialized on server.",
      });
    }

    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    console.log(
      `[${FILE}] [${FN}] authHeader_present=${Boolean(authHeader)} bearer=${Boolean(
        authHeader && authHeader.startsWith("Bearer "),
      )}`,
    );

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn(`[${FILE}] [${FN}] missing/invalid Authorization header`);
      return res.status(401).json({
        success: false,
        message: "No token provided. Authorization denied.",
      });
    }

    const token = authHeader.split(" ")[1];
    console.log(`[${FILE}] [${FN}] token_extracted=${Boolean(token)}`);

    // Verify token with Firebase Admin
    console.log(`[${FILE}] [${FN}] verifying Firebase ID token`);
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log(
      `[${FILE}] [${FN}] token_verified uid_present=${Boolean(
        decodedToken?.uid,
      )} email_present=${Boolean(decodedToken?.email)}`,
    );

    // Find user by Firebase UID first
    console.log(`[${FILE}] [${FN}] db_findOne User by firebaseUid`);
    let user = await User.findOne({ firebaseUid: decodedToken.uid });

    if (!user && decodedToken.email) {
      console.log(`[${FILE}] [${FN}] db_findOne User by email (fallback)`);
      // Fallback: find by same email and relink UID
      user = await User.findOne({ email: decodedToken.email });
      if (user) {
        console.log(`[${FILE}] [${FN}] relinking firebaseUid to existing user`);
        user.firebaseUid = decodedToken.uid;
        user.name =
          user.name || decodedToken.name || decodedToken.email.split("@")[0];
        user.phone = user.phone || decodedToken.phone_number || "";
        console.log(`[${FILE}] [${FN}] db_save relinked user`);
        await user.save();
      }
    }

    if (!user) {
      console.log(`[${FILE}] [${FN}] db_create User (new)`);
      // Create new user if doesn't exist by UID or email
      user = await User.create({
        firebaseUid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.email.split("@")[0],
        phone: decodedToken.phone_number || "",
      });
    }

    // Attach user to request object
    req.user = user;
    req.firebaseUser = decodedToken;

    console.log(
      `[${FILE}] [${FN}] authenticated userId=${user?._id?.toString?.() || "unknown"}`,
    );
    console.log(`[${FILE}] [${FN}] exit`);
    next();
  } catch (error) {
    console.error(`[${FILE}] [authenticateUser] error:`, error);
    return res.status(401).json({
      success: false,
      message: "Invalid token. Authentication failed.",
      error: error.message,
    });
  }
};

/**
 * Middleware to check if user is admin
 */
const isAdmin = (req, res, next) => {
  const FN = "isAdmin";
  console.log(
    `[${FILE}] [${FN}] enter user_present=${Boolean(req.user)} role=${req.user?.role || "none"}`,
  );

  if (req.user && req.user.role === "admin") {
    console.log(`[${FILE}] [${FN}] allowed`);
    console.log(`[${FILE}] [${FN}] exit`);
    next();
  } else {
    console.warn(`[${FILE}] [${FN}] denied`);
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required.",
    });
  }
};

export { authenticateUser, isAdmin };
