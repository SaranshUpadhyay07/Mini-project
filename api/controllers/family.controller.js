import Family from "../models/family.model.js";
import User from "../models/user.model.js";
import LiveLocation from "../models/liveLocation.model.js";
import Trip from "../models/trip.model.js";

const FILE = "api/controllers/family.controller.js";
const log = (fn, message) => console.log(`[${FILE}] [${fn}] ${message}`);
const errorLog = (fn, message) => console.error(`[${FILE}] [${fn}] ${message}`);

const LOCATION_STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// Create a new family
export const createFamily = async (req, res) => {
  const FN = "createFamily";
  log(FN, "entry");
  try {
    const { familyName } = req.body;
    const userId = req.user._id;

    // Check if user is already in a family
    if (req.user.familyId) {
      log(FN, "branch already_in_family=true");
      return res.status(400).json({
        success: false,
        message:
          "You are already part of a family. Leave your current family first.",
      });
    }

    log(FN, "db create Family");
    const family = new Family({
      familyName,
      adminUserId: userId,
      members: [
        {
          userId,
          role: "admin",
          memberId: null, // Will be set after familyId is generated
        },
      ],
    });

    await family.save();
    log(FN, "db save Family ok");

    // Assign memberId to admin
    family.members[0].memberId = family.assignMemberId(1);
    log(FN, `memberId assigned adminMemberId=${family.members[0].memberId}`);
    await family.save();
    log(FN, "db save Family (memberId) ok");

    // Update user
    req.user.familyId = family._id;
    req.user.memberId = family.members[0].memberId;
    log(
      FN,
      `user updated familyId=${family._id} memberId=${req.user.memberId}`,
    );
    await req.user.save();
    log(FN, "db save User ok");

    res.status(201).json({
      success: true,
      message: "Family created successfully",
      data: {
        family,
        familyCode: family.familyCode,
      },
    });
    log(FN, "exit success");
  } catch (error) {
    errorLog(FN, `error: ${error?.message || error}`);
    console.error("Create family error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create family",
      error: error.message,
    });
  }
};

// Join family using family code
export const joinFamily = async (req, res) => {
  const FN = "joinFamily";
  log(FN, "entry");
  try {
    const { familyCode } = req.body;
    const userId = req.user._id;

    // Check if user is already in a family
    if (req.user.familyId) {
      log(FN, "branch already_in_family=true");
      return res.status(400).json({
        success: false,
        message:
          "You are already part of a family. Leave your current family first.",
      });
    }

    log(FN, "db find Family by familyCode");
    const family = await Family.findOne({ familyCode });

    if (!family) {
      log(FN, "branch family_not_found=true");
      return res.status(404).json({
        success: false,
        message: "Invalid family code",
      });
    }

    // Check if user is already a member
    const existingMember = family.members.find(
      (m) => m.userId.toString() === userId.toString(),
    );

    if (existingMember) {
      log(FN, "branch existing_member=true");
      return res.status(400).json({
        success: false,
        message: "You are already a member of this family",
      });
    }

    // Add member
    const memberIndex = family.members.length + 1;
    const memberId = family.assignMemberId(memberIndex);
    log(FN, `memberId assigned memberId=${memberId}`);

    family.members.push({
      userId,
      role: "member",
      memberId,
    });

    log(FN, "db save Family (add member)");
    await family.save();

    // Update user
    req.user.familyId = family._id;
    req.user.memberId = memberId;
    log(FN, `user updated familyId=${family._id} memberId=${memberId}`);
    await req.user.save();

    res.status(200).json({
      success: true,
      message: "Successfully joined family",
      data: { family },
    });
    log(FN, "exit success");
  } catch (error) {
    errorLog(FN, `error: ${error?.message || error}`);
    console.error("Join family error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to join family",
      error: error.message,
    });
  }
};

// Get family details with members
export const getFamily = async (req, res) => {
  const FN = "getFamily";
  log(FN, "entry");
  try {
    const userId = req.user._id;
    log(FN, `request userId=${userId}`);

    if (!req.user.familyId) {
      log(FN, "branch no_family=true");
      return res.status(404).json({
        success: false,
        message: "You are not part of any family",
      });
    }

    log(FN, "db findById Family + populate");
    const family = await Family.findById(req.user.familyId)
      .populate(
        "members.userId",
        "firebaseUid name email phone isSharingLocation currentLocation lastLocationUpdate",
      )
      .populate("adminUserId", "firebaseUid name email")
      .populate("activeTripId");

    if (!family) {
      log(FN, "branch family_not_found=true");
      return res.status(404).json({
        success: false,
        message: "Family not found",
      });
    }

    res.status(200).json({
      success: true,
      data: { family },
    });
    log(FN, "exit success");
  } catch (error) {
    errorLog(FN, `error: ${error?.message || error}`);
    console.error("Get family error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get family details",
      error: error.message,
    });
  }
};

// Get all families (admin only)
export const getAllFamilies = async (req, res) => {
  const FN = "getAllFamilies";
  log(FN, "entry");
  try {
    // Check if user is app admin
    if (req.user.role !== "admin") {
      log(FN, `branch access_denied role=${req.user.role}`);
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
      });
    }

    log(FN, "db find Families + populate + select");
    const families = await Family.find()
      .populate("adminUserId", "firebaseUid name email")
      .populate(
        "members.userId",
        "firebaseUid name currentLocation lastLocationUpdate isSharingLocation",
      )
      .select("-familyCode"); // Don't expose family codes to admin

    // Calculate member counts and prepare data for map view
    log(FN, `compute familiesData count=${families.length}`);
    const familiesData = families.map((family) => ({
      _id: family._id,
      familyId: family.familyId,
      familyName: family.familyName,
      admin: family.adminUserId,
      memberCount: family.members.length,
      activeTripId: family.activeTripId,
      members: family.members,
      adminLocation: family.members.find(
        (m) => m.userId._id.toString() === family.adminUserId._id.toString(),
      )?.userId?.currentLocation,
    }));

    res.status(200).json({
      success: true,
      data: { families: familiesData },
    });
    log(FN, "exit success");
  } catch (error) {
    errorLog(FN, `error: ${error?.message || error}`);
    console.error("Get all families error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get families",
      error: error.message,
    });
  }
};

// Update member location
export const updateMemberLocation = async (req, res) => {
  const FN = "updateMemberLocation";
  log(FN, "entry");
  try {
    const { latitude, longitude, accuracy } = req.body;
    const userId = req.user._id;

    if (!req.user.familyId) {
      log(FN, "branch no_family=true");
      return res.status(400).json({
        success: false,
        message: "You are not part of any family",
      });
    }

    const latNum = Number(latitude);
    const lngNum = Number(longitude);

    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      log(FN, "branch invalid_coords=true (not finite)");
      return res.status(400).json({
        success: false,
        message: "Valid latitude and longitude are required",
      });
    }

    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      log(FN, "branch invalid_coords=true (out of range)");
      return res.status(400).json({
        success: false,
        message: "Latitude/longitude out of range",
      });
    }

    const now = new Date();
    log(FN, `coords parsed lat=${latNum} lng=${lngNum}`);

    // Update user's current location (authoritative)
    req.user.currentLocation = {
      type: "Point",
      coordinates: [lngNum, latNum],
    };
    req.user.lastLocationUpdate = now;
    log(FN, "db save User location");
    await req.user.save();

    // Update or create live location (authoritative)
    log(FN, "db upsert LiveLocation");
    const liveDoc = await LiveLocation.findOneAndUpdate(
      { userId, familyId: req.user.familyId },
      {
        location: {
          type: "Point",
          coordinates: [lngNum, latNum],
        },
        accuracy: Number.isFinite(Number(accuracy))
          ? Number(accuracy)
          : undefined,
        lastUpdatedAt: now,
        isSharing: Boolean(req.user.isSharingLocation),
      },
      { upsert: true, returnDocument: "after" },
    );

    // Check for distance alerts
    log(FN, "db find Family for distance alerts");
    const family = await Family.findById(req.user.familyId).populate(
      "members.userId",
      "currentLocation name",
    );

    const alerts = [];
    if (family && family.activeTripId) {
      log(FN, "branch activeTrip=true");
      // Calculate distance from admin/family head
      const admin = family.members.find((m) => m.role === "admin");
      if (admin && admin.userId.currentLocation) {
        const distance = calculateDistance(
          req.user.currentLocation.coordinates,
          admin.userId.currentLocation.coordinates,
        );

        if (distance > family.maxDistanceAlert) {
          log(
            FN,
            `branch distance_alert=true distance=${Math.round(distance)}`,
          );
          alerts.push({
            type: "distance",
            message: `You are ${Math.round(distance)}m away from the family head`,
            distance,
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      message: "Location updated successfully",
      data: {
        location: { latitude: latNum, longitude: lngNum },
        accuracy: liveDoc?.accuracy ?? null,
        lastLocationUpdate: now.toISOString(),
        liveLocationUpdatedAt: liveDoc?.lastUpdatedAt
          ? new Date(liveDoc.lastUpdatedAt).toISOString()
          : null,
        isSharingLocation: Boolean(req.user.isSharingLocation),
        alerts,
      },
    });
    log(FN, "exit success");
  } catch (error) {
    errorLog(FN, `error: ${error?.message || error}`);
    console.error("Update location error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update location",
      error: error.message,
    });
  }
};

// Toggle location sharing
export const toggleLocationSharing = async (req, res) => {
  const FN = "toggleLocationSharing";
  log(FN, "entry");
  try {
    if (!req.user.familyId) {
      log(FN, "branch no_family=true");
      return res.status(400).json({
        success: false,
        message: "You are not part of any family",
      });
    }

    req.user.isSharingLocation = !req.user.isSharingLocation;
    log(FN, `user isSharingLocation=${req.user.isSharingLocation}`);
    await req.user.save();

    // Keep LiveLocation in sync with consent immediately (even if no new coords yet)
    log(FN, "db upsert LiveLocation consent");
    const liveDoc = await LiveLocation.findOneAndUpdate(
      { userId: req.user._id, familyId: req.user.familyId },
      {
        isSharing: Boolean(req.user.isSharingLocation),
        lastUpdatedAt: new Date(),
      },
      { upsert: true, returnDocument: "after" },
    );

    res.status(200).json({
      success: true,
      message: `Location sharing ${req.user.isSharingLocation ? "enabled" : "disabled"}`,
      data: {
        isSharingLocation: Boolean(req.user.isSharingLocation),
        liveLocationUpdatedAt: liveDoc?.lastUpdatedAt
          ? new Date(liveDoc.lastUpdatedAt).toISOString()
          : null,
      },
    });
    log(FN, "exit success");
  } catch (error) {
    errorLog(FN, `error: ${error?.message || error}`);
    console.error("Toggle location sharing error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle location sharing",
      error: error.message,
    });
  }
};

// Get latest locations for all family members (polling-friendly)
export const getLatestFamilyLocations = async (req, res) => {
  const FN = "getLatestFamilyLocations";
  log(FN, "entry");
  try {
    if (!req.user.familyId) {
      log(FN, "branch no_family=true");
      return res.status(400).json({
        success: false,
        message: "You are not part of any family",
      });
    }

    log(FN, "db findById Family + populate members");
    const family = await Family.findById(req.user.familyId)
      .populate(
        "members.userId",
        "name firebaseUid isSharingLocation currentLocation lastLocationUpdate",
      )
      .populate("adminUserId", "_id");

    if (!family) {
      log(FN, "branch family_not_found=true");
      return res.status(404).json({
        success: false,
        message: "Family not found",
      });
    }

    log(FN, "db find LiveLocation by familyId");
    const liveLocations = await LiveLocation.find({
      familyId: req.user.familyId,
    }).select("userId location accuracy lastUpdatedAt isSharing");

    const liveLocationMap = new Map(
      liveLocations.map((doc) => [doc.userId.toString(), doc]),
    );

    const now = Date.now();

    const members = family.members.map((member) => {
      const populatedUser = member.userId;
      const userId = populatedUser?._id?.toString();
      const liveDoc = userId ? liveLocationMap.get(userId) : null;

      const userCoords = populatedUser?.currentLocation?.coordinates;
      const liveCoords = liveDoc?.location?.coordinates;

      const coordinates =
        Array.isArray(liveCoords) && liveCoords.length === 2
          ? liveCoords
          : Array.isArray(userCoords) && userCoords.length === 2
            ? userCoords
            : null;

      const userLastUpdatedAt = populatedUser?.lastLocationUpdate || null;
      const liveLastUpdatedAt = liveDoc?.lastUpdatedAt || null;

      const userTs = userLastUpdatedAt
        ? new Date(userLastUpdatedAt).getTime()
        : null;
      const liveTs = liveLastUpdatedAt
        ? new Date(liveLastUpdatedAt).getTime()
        : null;

      // Choose the newest timestamp so old LiveLocation docs can't override fresh User updates
      const lastUpdatedTs =
        userTs == null && liveTs == null
          ? null
          : userTs == null
            ? liveTs
            : liveTs == null
              ? userTs
              : Math.max(userTs, liveTs);

      const lastUpdatedAt =
        lastUpdatedTs != null ? new Date(lastUpdatedTs) : null;

      const isStale =
        !lastUpdatedTs || now - lastUpdatedTs > LOCATION_STALE_THRESHOLD_MS;

      return {
        userId: populatedUser?._id || null,
        firebaseUid: populatedUser?.firebaseUid || null,
        name: populatedUser?.name || "Unknown",
        memberId: member.memberId,
        role: member.role,
        isSharingLocation: Boolean(populatedUser?.isSharingLocation),
        location:
          coordinates && coordinates.length === 2
            ? {
                latitude: coordinates[1],
                longitude: coordinates[0],
              }
            : null,
        accuracy: liveDoc?.accuracy ?? null,
        lastLocationUpdate: lastUpdatedAt,
        isStale,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        familyId: family._id,
        familyCode: family.familyCode,
        updatedAt: new Date().toISOString(),
        members,
      },
    });
    log(FN, `exit success members=${members.length}`);
  } catch (error) {
    errorLog(FN, `error: ${error?.message || error}`);
    console.error("Get latest family locations error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch latest family locations",
      error: error.message,
    });
  }
};

// Get latest location for a single member in the same family
export const getLatestMemberLocation = async (req, res) => {
  const FN = "getLatestMemberLocation";
  log(FN, "entry");
  try {
    const { memberUserId } = req.params;

    if (!req.user.familyId) {
      log(FN, "branch no_family=true");
      return res.status(400).json({
        success: false,
        message: "You are not part of any family",
      });
    }

    if (!memberUserId) {
      log(FN, "branch missing_memberUserId=true");
      return res.status(400).json({
        success: false,
        message: "memberUserId is required",
      });
    }

    log(FN, `db findById Family members for memberUserId=${memberUserId}`);
    const family = await Family.findById(req.user.familyId).populate(
      "members.userId",
      "name firebaseUid isSharingLocation currentLocation lastLocationUpdate",
    );

    if (!family) {
      log(FN, "branch family_not_found=true");
      return res.status(404).json({
        success: false,
        message: "Family not found",
      });
    }

    const familyMember = family.members.find(
      (m) => m.userId?._id?.toString() === memberUserId,
    );

    if (!familyMember) {
      log(FN, "branch member_not_in_family=true");
      return res.status(404).json({
        success: false,
        message: "Member not found in your family",
      });
    }

    log(FN, "db findOne LiveLocation for member");
    const liveDoc = await LiveLocation.findOne({
      familyId: req.user.familyId,
      userId: memberUserId,
    }).select("location accuracy lastUpdatedAt isSharing");

    const userCoords = familyMember.userId?.currentLocation?.coordinates;
    const liveCoords = liveDoc?.location?.coordinates;

    const coordinates =
      Array.isArray(liveCoords) && liveCoords.length === 2
        ? liveCoords
        : Array.isArray(userCoords) && userCoords.length === 2
          ? userCoords
          : null;

    const userLastUpdatedAt = familyMember.userId?.lastLocationUpdate || null;
    const liveLastUpdatedAt = liveDoc?.lastUpdatedAt || null;

    const userTs = userLastUpdatedAt
      ? new Date(userLastUpdatedAt).getTime()
      : null;
    const liveTs = liveLastUpdatedAt
      ? new Date(liveLastUpdatedAt).getTime()
      : null;

    // Choose the newest timestamp so old LiveLocation docs can't override fresh User updates
    const lastUpdatedTs =
      userTs == null && liveTs == null
        ? null
        : userTs == null
          ? liveTs
          : liveTs == null
            ? userTs
            : Math.max(userTs, liveTs);

    const lastUpdatedAt =
      lastUpdatedTs != null ? new Date(lastUpdatedTs) : null;

    const isStale =
      !lastUpdatedTs ||
      Date.now() - lastUpdatedTs > LOCATION_STALE_THRESHOLD_MS;

    res.status(200).json({
      success: true,
      data: {
        userId: familyMember.userId?._id || null,
        firebaseUid: familyMember.userId?.firebaseUid || null,
        name: familyMember.userId?.name || "Unknown",
        memberId: familyMember.memberId,
        role: familyMember.role,
        isSharingLocation: Boolean(familyMember.userId?.isSharingLocation),
        location:
          coordinates && coordinates.length === 2
            ? {
                latitude: coordinates[1],
                longitude: coordinates[0],
              }
            : null,
        accuracy: liveDoc?.accuracy ?? null,
        lastLocationUpdate: lastUpdatedAt,
        isStale,
      },
    });
    log(FN, `exit success isStale=${isStale}`);
  } catch (error) {
    errorLog(FN, `error: ${error?.message || error}`);
    console.error("Get latest member location error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch latest member location",
      error: error.message,
    });
  }
};

// Start trip (admin only)
export const startTrip = async (req, res) => {
  const FN = "startTrip";
  log(FN, "entry");
  try {
    const { title, location, startDate, endDate } = req.body;

    if (!req.user.familyId) {
      log(FN, "branch no_family=true");
      return res.status(400).json({
        success: false,
        message: "You are not part of any family",
      });
    }

    log(FN, "db findById Family");
    const family = await Family.findById(req.user.familyId);

    if (!family) {
      log(FN, "branch family_not_found=true");
      return res.status(404).json({
        success: false,
        message: "Family not found",
      });
    }

    // Check if user is admin
    if (family.adminUserId.toString() !== req.user._id.toString()) {
      log(FN, "branch not_family_admin=true");
      return res.status(403).json({
        success: false,
        message: "Only family admin can start a trip",
      });
    }

    log(FN, "db create Trip + save");
    const trip = new Trip({
      familyId: family._id,
      createdBy: req.user._id,
      title,
      location,
      startDate,
      endDate,
      status: "ongoing",
    });

    await trip.save();

    family.activeTripId = trip._id;
    log(FN, `family activeTripId set tripId=${trip._id}`);
    await family.save();

    res.status(201).json({
      success: true,
      message: "Trip started successfully",
      data: { trip },
    });
    log(FN, "exit success");
  } catch (error) {
    errorLog(FN, `error: ${error?.message || error}`);
    console.error("Start trip error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start trip",
      error: error.message,
    });
  }
};

// Report lost member
export const reportLostMember = async (req, res) => {
  const FN = "reportLostMember";
  log(FN, "entry");
  try {
    const { lostUserId } = req.body;

    if (!req.user.familyId) {
      log(FN, "branch no_family=true");
      return res.status(400).json({
        success: false,
        message: "You are not part of any family",
      });
    }

    log(FN, "db findById Family");
    const family = await Family.findById(req.user.familyId);

    if (!family) {
      log(FN, "branch family_not_found=true");
      return res.status(404).json({
        success: false,
        message: "Family not found",
      });
    }

    // Check if lost user is a member
    const member = family.members.find(
      (m) => m.userId.toString() === lostUserId,
    );

    if (!member) {
      log(FN, "branch user_not_member=true");
      return res.status(400).json({
        success: false,
        message: "User is not a member of this family",
      });
    }

    // Get last known location
    log(FN, "db findById User (lost user)");
    const lostUser = await User.findById(lostUserId);

    family.lostMembers.push({
      userId: lostUserId,
      reportedBy: req.user._id,
      lastKnownLocation: lostUser.currentLocation,
    });
    log(FN, "family lostMembers push");

    await family.save();
    log(FN, "db save Family ok");

    res.status(200).json({
      success: true,
      message: "Lost member reported successfully",
      data: { family },
    });
    log(FN, "exit success");
  } catch (error) {
    errorLog(FN, `error: ${error?.message || error}`);
    console.error("Report lost member error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to report lost member",
      error: error.message,
    });
  }
};

// Resolve lost member
export const resolveLostMember = async (req, res) => {
  const FN = "resolveLostMember";
  log(FN, "entry");
  try {
    const { lostMemberId } = req.body;

    if (!req.user.familyId) {
      log(FN, "branch no_family=true");
      return res.status(400).json({
        success: false,
        message: "You are not part of any family",
      });
    }

    log(FN, "db findById Family");
    const family = await Family.findById(req.user.familyId);

    const lostMember = family.lostMembers.id(lostMemberId);
    if (lostMember) {
      log(FN, "branch lostMember_found=true");
      lostMember.isResolved = true;
      lostMember.resolvedAt = new Date();
      await family.save();
      log(FN, "db save Family ok");
    } else {
      log(FN, "branch lostMember_found=false");
    }

    res.status(200).json({
      success: true,
      message: "Lost member status updated",
    });
    log(FN, "exit success");
  } catch (error) {
    errorLog(FN, `error: ${error?.message || error}`);
    console.error("Resolve lost member error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resolve lost member status",
      error: error.message,
    });
  }
};

// Leave family
export const leaveFamily = async (req, res) => {
  const FN = "leaveFamily";
  log(FN, "entry");
  try {
    if (!req.user.familyId) {
      log(FN, "branch no_family=true");
      return res.status(400).json({
        success: false,
        message: "You are not part of any family",
      });
    }

    log(FN, "db findById Family");
    const family = await Family.findById(req.user.familyId);

    // Can't leave if you're admin
    if (family.adminUserId.toString() === req.user._id.toString()) {
      log(FN, "branch admin_cannot_leave=true");
      return res.status(400).json({
        success: false,
        message:
          "Admin cannot leave family. Transfer admin rights or delete family.",
      });
    }

    // Remove member
    log(FN, "update family.members remove current user");
    family.members = family.members.filter(
      (m) => m.userId.toString() !== req.user._id.toString(),
    );
    await family.save();
    log(FN, "db save Family ok");

    // Update user
    req.user.familyId = null;
    req.user.memberId = null;
    log(FN, "user cleared familyId/memberId");
    await req.user.save();

    res.status(200).json({
      success: true,
      message: "Successfully left family",
    });
    log(FN, "exit success");
  } catch (error) {
    errorLog(FN, `error: ${error?.message || error}`);
    console.error("Leave family error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to leave family",
      error: error.message,
    });
  }
};

// Helper: Calculate distance between two coordinates (Haversine formula)
function calculateDistance(coords1, coords2) {
  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;

  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}
