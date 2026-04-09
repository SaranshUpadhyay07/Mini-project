import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import FindMyDevice from "./FindMyDevice";

const API_BASE = ""; // Use relative paths so Vite proxy works on mobile (via ngrok)
const FAMILY_POLL_INTERVAL_MS = 5000;
const STALE_THRESHOLD_MS = 5 * 60 * 1000;

// --- Location publishing thresholds ---
// Only publish a GPS fix when at least one of these conditions is true:
const ACCURACY_THRESHOLD_M = 200; // fix is accurate enough (<=200 m)
const MIN_DISTANCE_M = 5; // device moved at least 5 m since last publish
const MAX_PUBLISH_INTERVAL_MS = 30_000; // 30 s has passed regardless of accuracy/distance

const toTimestampMs = (value) => {
  if (value == null) return null;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return value < 1e12 ? value * 1000 : value;
  }

  if (typeof value === "string") {
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      return numeric < 1e12 ? numeric * 1000 : numeric;
    }
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isNaN(ms) ? null : ms;
  }

  return null;
};

const getMemberLastUpdateMs = (memberLocation) =>
  toTimestampMs(
    memberLocation?.lastLocationUpdate ??
      memberLocation?.updatedAt ??
      memberLocation?.lastUpdated ??
      memberLocation?.timestamp ??
      null,
  );

const computeIsStale = (memberLocation) => {
  const lastUpdateMs = getMemberLastUpdateMs(memberLocation);
  if (lastUpdateMs == null) return true;
  return Date.now() - lastUpdateMs > STALE_THRESHOLD_MS;
};

const FamilyTracker = () => {
  const { currentUser } = useAuth();

  const [family, setFamily] = useState(null);
  const [latestLocations, setLatestLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const [showMap, setShowMap] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const [isCreatingFamily, setIsCreatingFamily] = useState(false);
  const [isJoiningFamily, setIsJoiningFamily] = useState(false);
  const [familyName, setFamilyName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const [locationSharing, setLocationSharing] = useState(false);

  const [showLostMemberDialog, setShowLostMemberDialog] = useState(false);
  const [selectedLostMember, setSelectedLostMember] = useState(null);
  const [showLostMembersView, setShowLostMembersView] = useState(false);

  // watchPosition ID (replaces the old setInterval publisher)
  const watchIdRef = useRef(null);
  const familyPollIntervalRef = useRef(null);

  // Track last-published state so we can apply thresholds
  const lastPublishedCoordsRef = useRef(null); // { lat, lng }
  const lastPublishedAtRef = useRef(null); // timestamp ms

  const memberLocationMap = useMemo(() => {
    const map = new Map();
    latestLocations.forEach((m) => {
      if (m?.userId) map.set(String(m.userId), m);
    });
    return map;
  }, [latestLocations]);

  const isCurrentUserAdmin = useMemo(() => {
    if (!family?.members || !currentUser?.uid) return false;
    const me = family.members.find(
      (m) => m?.userId?.firebaseUid === currentUser.uid,
    );
    return me?.role === "admin";
  }, [family, currentUser?.uid]);

  const clearFamilyPolling = () => {
    if (familyPollIntervalRef.current) {
      clearInterval(familyPollIntervalRef.current);
      familyPollIntervalRef.current = null;
    }
  };

  const clearLocationPublisher = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation?.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      console.log(
        "[FamilyTracker] [clearLocationPublisher] watchPosition cleared",
      );
    }
  };

  const getAuthHeaders = async (withJson = false) => {
    const token = await currentUser.getIdToken();
    return {
      ...(withJson ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchFamily = async () => {
    try {
      setLoading(true);
      setError("");
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/family`, { headers });
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setFamily(null);
          setLatestLocations([]);
          return;
        }
        throw new Error(data?.message || "Failed to fetch family");
      }

      setFamily(data?.data?.family || null);
    } catch (err) {
      setError(err?.message || "Failed to fetch family");
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestFamilyLocations = async ({ silent = false } = {}) => {
    if (!family || !currentUser) return;

    try {
      if (!silent) setPolling(true);
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/family/location/latest`, {
        headers,
      });
      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Failed to fetch latest locations");
      }

      const members = data?.data?.members || [];
      setLatestLocations(members);

      const syncedFromServer =
        toTimestampMs(data?.data?.updatedAt) ??
        toTimestampMs(data?.data?.lastUpdated) ??
        Date.now();
      setLastSyncedAt(new Date(syncedFromServer).toISOString());
    } catch (err) {
      setError(err?.message || "Failed to sync latest locations");
    } finally {
      if (!silent) setPolling(false);
    }
  };

  useEffect(() => {
    fetchFamily();
    return () => {
      clearFamilyPolling();
      clearLocationPublisher();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!family) {
      clearFamilyPolling();
      return;
    }

    clearFamilyPolling();
    fetchLatestFamilyLocations({ silent: true });
    familyPollIntervalRef.current = setInterval(() => {
      fetchLatestFamilyLocations({ silent: true });
    }, FAMILY_POLL_INTERVAL_MS);

    return clearFamilyPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family?._id, currentUser?.uid]);

  useEffect(() => {
    const me = family?.members?.find(
      (m) => m?.userId?.firebaseUid === currentUser?.uid,
    );
    setLocationSharing(Boolean(me?.userId?.isSharingLocation));
  }, [family, currentUser?.uid]);

  // Haversine distance in metres between two {lat, lng} points
  const _haversineMeters = (a, b) => {
    const R = 6_371_000;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const sinHalfLat = Math.sin(dLat / 2);
    const sinHalfLng = Math.sin(dLng / 2);
    const s =
      sinHalfLat * sinHalfLat +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinHalfLng * sinHalfLng;
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  };

  // POST a single fix to the backend
  const _publishToServer = async (latitude, longitude, accuracy) => {
    const headers = await getAuthHeaders(true);
    const response = await fetch(`${API_BASE}/api/family/location/update`, {
      method: "POST",
      headers,
      body: JSON.stringify({ latitude, longitude, accuracy }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.message || "Failed to update location");
    }
  };

  useEffect(() => {
    if (!locationSharing || !family || !currentUser) {
      clearLocationPublisher();
      return;
    }

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    clearLocationPublisher();
    console.log(
      "[FamilyTracker] [startLocationWatcher] starting watchPosition",
    );

    const onPosition = async (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      const now = Date.now();

      const last = lastPublishedCoordsRef.current;
      const lastAt = lastPublishedAtRef.current;

      const accuracyOk = accuracy <= ACCURACY_THRESHOLD_M;
      const movedEnough =
        !last ||
        _haversineMeters(last, { lat: latitude, lng: longitude }) >=
          MIN_DISTANCE_M;
      const timedOut = !lastAt || now - lastAt >= MAX_PUBLISH_INTERVAL_MS;

      console.log(
        `[FamilyTracker] [watchPosition] fix accuracy=${Math.round(accuracy)}m` +
          ` accuracyOk=${accuracyOk} movedEnough=${movedEnough} timedOut=${timedOut}`,
      );

      // Publish only when at least one condition is met
      if (!accuracyOk && !timedOut) return;
      if (!movedEnough && !timedOut) return;

      try {
        console.log(
          `[FamilyTracker] [watchPosition] publishing lat=${latitude} lng=${longitude} accuracy=${Math.round(accuracy)}m`,
        );
        await _publishToServer(latitude, longitude, accuracy);
        lastPublishedCoordsRef.current = { lat: latitude, lng: longitude };
        lastPublishedAtRef.current = now;
        await fetchLatestFamilyLocations({ silent: true });
      } catch (err) {
        setError(err?.message || "Location publishing failed");
        console.error("[FamilyTracker] [watchPosition] publish error:", err);
      }
    };

    const onError = (err) => {
      console.error("[FamilyTracker] [watchPosition] GPS error:", err.message);
      setError(`GPS error (${err.code}): ${err.message}`);
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      onPosition,
      onError,
      {
        enableHighAccuracy: true,
        timeout: 20_000,
        maximumAge: 0,
      },
    );

    console.log(
      `[FamilyTracker] [startLocationWatcher] watchId=${watchIdRef.current}`,
    );

    return clearLocationPublisher;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationSharing, family?._id, currentUser?.uid]);

  const createFamily = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const headers = await getAuthHeaders(true);
      const response = await fetch(`${API_BASE}/api/family/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({ familyName: familyName.trim() }),
      });
      const data = await response.json();

      if (!response.ok)
        throw new Error(data?.message || "Failed to create family");

      setFamily(data?.data?.family || null);
      setIsCreatingFamily(false);
      setFamilyName("");
    } catch (err) {
      setError(err?.message || "Failed to create family");
    }
  };

  const joinFamily = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const headers = await getAuthHeaders(true);
      const response = await fetch(`${API_BASE}/api/family/join`, {
        method: "POST",
        headers,
        body: JSON.stringify({ familyCode: joinCode.trim().toUpperCase() }),
      });
      const data = await response.json();

      if (!response.ok)
        throw new Error(data?.message || "Failed to join family");

      setFamily(data?.data?.family || null);
      setIsJoiningFamily(false);
      setJoinCode("");
    } catch (err) {
      setError(err?.message || "Failed to join family");
    }
  };

  const leaveFamily = async () => {
    try {
      setError("");
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/family/leave`, {
        method: "POST",
        headers,
      });
      const data = await response.json();

      if (!response.ok)
        throw new Error(data?.message || "Failed to leave family");

      clearFamilyPolling();
      clearLocationPublisher();
      setFamily(null);
      setLatestLocations([]);
      setShowMap(false);
      setSelectedMember(null);
      setLocationSharing(false);
    } catch (err) {
      setError(err?.message || "Failed to leave family");
    }
  };

  const toggleLocationSharing = async () => {
    try {
      setError("");
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/family/location/toggle`, {
        method: "POST",
        headers,
      });
      const data = await response.json();

      if (!response.ok)
        throw new Error(data?.message || "Failed to toggle location sharing");

      const enabled = Boolean(data?.data?.isSharingLocation);
      setLocationSharing(enabled);

      if (enabled) {
        // Get a one-shot fix to immediately post a location on enable
        if (navigator.geolocation) {
          try {
            const position = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10_000,
                maximumAge: 0,
              });
            });
            const { latitude, longitude, accuracy } = position.coords;
            await _publishToServer(latitude, longitude, accuracy);
          } catch (geoErr) {
            console.warn(
              "[FamilyTracker] [toggleLocationSharing] initial fix failed:",
              geoErr.message,
            );
          }
        }
        await fetchLatestFamilyLocations({ silent: true });
      } else {
        clearLocationPublisher();
      }

      await fetchFamily();
    } catch (err) {
      setError(err?.message || "Failed to toggle location sharing");
    }
  };

  const updateLocationNow = async () => {
    try {
      setError("");
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported by your browser");
      }
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10_000,
          maximumAge: 0,
        });
      });
      const { latitude, longitude, accuracy } = position.coords;
      console.log(
        `[FamilyTracker] [updateLocationNow] fix lat=${latitude} lng=${longitude} accuracy=${Math.round(accuracy)}m`,
      );
      await _publishToServer(latitude, longitude, accuracy);
      await fetchLatestFamilyLocations({ silent: true });
      await fetchFamily();
    } catch (err) {
      setError(err?.message || "Failed to update location");
    }
  };

  const openMemberMap = (member) => {
    const latest = memberLocationMap.get(String(member?.userId?._id));
    if (!latest?.isSharingLocation) {
      alert(
        `${member?.userId?.name || "This member"} is not sharing location.`,
      );
      return;
    }

    if (!latest?.location) {
      alert(
        `No recent location is available for ${member?.userId?.name || "this member"}.`,
      );
      return;
    }

    const isStale =
      latest?.isStale != null
        ? Boolean(latest.isStale)
        : computeIsStale(latest);

    if (isStale) {
      const lastUpdateMs = getMemberLastUpdateMs(latest);
      const lastSeenLabel = lastUpdateMs
        ? new Date(lastUpdateMs).toLocaleTimeString()
        : "unknown";
      const proceed = window.confirm(
        `${member?.userId?.name || "This member"}'s location was last updated at ${lastSeenLabel} and may be stale.\n\nOpen map anyway?`,
      );
      if (!proceed) return;
    }

    setSelectedMember(member);
    setShowMap(true);
  };

  const reportLostMember = async (userId) => {
    try {
      setError("");
      const headers = await getAuthHeaders(true);
      const response = await fetch(
        `${API_BASE}/api/family/member/lost/report`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ lostUserId: userId }),
        },
      );
      const data = await response.json();

      if (!response.ok)
        throw new Error(data?.message || "Failed to report lost member");

      setShowLostMemberDialog(false);
      setSelectedLostMember(null);
      await fetchFamily();
    } catch (err) {
      setError(err?.message || "Failed to report lost member");
    }
  };

  const resolveLostMember = async (lostMemberId) => {
    try {
      setError("");
      const headers = await getAuthHeaders(true);
      const response = await fetch(
        `${API_BASE}/api/family/member/lost/resolve`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ lostMemberId }),
        },
      );
      const data = await response.json();

      if (!response.ok)
        throw new Error(data?.message || "Failed to resolve lost member");

      await fetchFamily();
    } catch (err) {
      setError(err?.message || "Failed to resolve lost member");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading family tracker...
      </div>
    );
  }

  if (!family) {
    return (
      <div className="max-w-4xl mx-auto p-6 md:pt-12 space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold bg-primary bg-clip-text text-transparent">Family Tracker</h1>
          <p className="text-gray-600 text-lg max-w-xl mx-auto">
            Stay connected with your loved ones. Create a family group or join one using a family code.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="bg-white p-8 rounded-3xl shadow-lg border border-primary-50 space-y-6 hover:shadow-xl transition-shadow">
            <h2 className="text-2xl font-semibold text-primary">Create Family</h2>

            {!isCreatingFamily ? (
              <button
                onClick={() => setIsCreatingFamily(true)}
                className="w-full bg-[#4F46E5] text-white px-4 py-3 rounded-2xl font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                Create New Family
              </button>
            ) : (
              <form onSubmit={createFamily} className="space-y-3">
                <input
                  type="text"
                  placeholder="Family name"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="w-full px-4 py-3 border border-primary-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-primary text-white px-4 py-3 rounded-2xl hover:shadow-md transition-all font-medium"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingFamily(false);
                      setFamilyName("");
                    }}
                    className="flex-1 bg-sand text-primary-dark px-4 py-3 rounded-2xl hover:bg-sand transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className="bg-white p-8 rounded-3xl shadow-lg border border-primary-50 space-y-6 hover:shadow-xl transition-shadow">
            <h2 className="text-2xl font-semibold text-primary">Join Family</h2>

            {!isJoiningFamily ? (
              <button
                onClick={() => setIsJoiningFamily(true)}
                className="w-full border-2 border-primary text-primary px-4 py-3 rounded-2xl font-semibold hover:bg-sand hover:-translate-y-0.5 transition-all"
              >
                Join Existing Family
              </button>
            ) : (
              <form onSubmit={joinFamily} className="space-y-3">
                <input
                  type="text"
                  placeholder="Family code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-primary-200 rounded-2xl uppercase focus:outline-none focus:ring-2 focus:ring-primary"
                  maxLength={6}
                  required
                />
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-[#4F46E5] text-white px-4 py-3 rounded-2xl hover:shadow-md transition-all font-medium"
                  >
                    Join
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsJoiningFamily(false);
                      setJoinCode("");
                    }}
                    className="flex-1 bg-sand text-primary-dark px-4 py-3 rounded-2xl hover:bg-sand transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {showMap && selectedMember ? (
        <FindMyDevice
          member={selectedMember}
          currentUser={currentUser}
          familyId={family.familyId}
          onClose={() => {
            setShowMap(false);
            setSelectedMember(null);
          }}
        />
      ) : (
        <>
          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <section className="bg-white rounded-3xl shadow-lg border border-primary-50 p-6 md:p-8 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">{family.familyName}</h1>
                <p className="text-gray-600">
                  Family code:{" "}
                  <span className="font-mono font-semibold">
                    {family.familyCode}
                  </span>
                </p>
                <p className="text-sm text-gray-500">
                  Family ID: {family.familyId}
                </p>
                <p className="text-sm text-gray-500">
                  Last synced:{" "}
                  {lastSyncedAt
                    ? new Date(lastSyncedAt).toLocaleTimeString()
                    : "—"}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => fetchLatestFamilyLocations()}
                  className="px-4 py-2 bg-primary-50 text-primary border-2 border-primary-200 font-medium rounded-xl hover:bg-primary-100 transition-colors"
                >
                  {polling ? "Refreshing..." : "Refresh Data"}
                </button>
                <button
                  onClick={leaveFamily}
                  className="px-4 py-2 bg-red-100 text-red-700 font-medium rounded-xl hover:bg-red-200 transition-colors"
                >
                  Leave Family
                </button>
              </div>
            </div>

            <div className="border-t pt-4">
              <h2 className="text-lg font-semibold mb-2">
                My Location Sharing
              </h2>
              <p className="text-sm text-gray-600 mb-3">
                When sharing is ON, your location is published automatically
                when GPS accuracy is ≤ 50 m, you move ≥ 5 m, or 30 s elapses.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    locationSharing
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {locationSharing ? "Sharing ON" : "Sharing OFF"}
                </span>

                <button
                  onClick={toggleLocationSharing}
                  className={`px-5 py-2.5 rounded-xl text-white font-medium transition-all ${
                    locationSharing
                      ? "bg-gray-700 hover:bg-gray-800"
                      : "bg-primary hover:shadow-md"
                  }`}
                >
                  {locationSharing ? "Stop Sharing" : "Start Sharing"}
                </button>

                <button
                  onClick={updateLocationNow}
                  className="px-5 py-2.5 bg-primary text-white font-medium rounded-xl hover:shadow-md transition-all"
                >
                  Update My Location Now
                </button>
              </div>
            </div>
          </section>

          {family.lostMembers?.filter((lm) => !lm.isResolved).length > 0 && (
            <section
              className="bg-red-50 border border-red-300 rounded p-4 cursor-pointer hover:bg-red-100"
              onClick={() => setShowLostMembersView(true)}
            >
              <div className="flex justify-between items-center">
                <p className="font-semibold text-red-800">
                  {family.lostMembers.filter((lm) => !lm.isResolved).length}{" "}
                  unresolved lost member report(s)
                </p>
                <span className="text-sm text-red-700">View details</span>
              </div>
            </section>
          )}

          <section className="bg-white rounded-3xl shadow-lg border border-primary-50 p-6 md:p-8">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">
              Family Members ({family.members.length})
            </h2>

            <div className="space-y-3">
              {family.members.map((member) => {
                const isCurrentUser =
                  member?.userId?.firebaseUid === currentUser?.uid;
                const latest = memberLocationMap.get(
                  String(member?.userId?._id),
                );

                const isSharing = Boolean(
                  latest?.isSharingLocation ??
                  member?.userId?.isSharingLocation,
                );
                const hasLocation = Boolean(latest?.location);
                const lastUpdateMs = getMemberLastUpdateMs(latest);
                const isStale =
                  latest?.isStale != null
                    ? Boolean(latest.isStale)
                    : computeIsStale(latest);

                return (
                  <div
                    key={member?.userId?._id}
                    className={`flex items-center justify-between p-4 border rounded-2xl transition-all hover:shadow-sm ${
                      isCurrentUser
                        ? "bg-sand border-primary-200"
                        : "bg-white border-gray-100 hover:border-primary-100"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#4F46E5] text-white font-bold flex items-center justify-center text-lg shadow-md">
                        {member?.userId?.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="font-semibold text-lg text-gray-800">
                          {member?.userId?.name || "Unknown"}
                          {isCurrentUser && (
                            <span className="ml-2 text-primary">(You)</span>
                          )}
                          {member?.role === "admin" && (
                            <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                              Admin
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-600">
                          ID: {member?.memberId || "—"}
                        </p>
                        <p className="text-xs text-gray-600">
                          Sharing: {isSharing ? "On" : "Off"}{" "}
                          {isSharing && hasLocation && (
                            <span
                              className={
                                isStale ? "text-primary" : "text-green-600"
                              }
                            >
                              • {isStale ? "Stale" : "Fresh"}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          Last update:{" "}
                          {lastUpdateMs != null
                            ? new Date(lastUpdateMs).toLocaleTimeString()
                            : "Never"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {!isCurrentUser && (
                        <button
                          onClick={() => openMemberMap(member)}
                          className="px-4 py-2 bg-primary text-[#4F46E5] border-[#4F46E5] font-medium rounded-xl hover:bg-primary-light shadow-sm transition-all"
                        >
                          View Map
                        </button>
                      )}

                      {!isCurrentUser && (
                        <button
                          onClick={() => {
                            setSelectedLostMember(member?.userId?._id);
                            setShowLostMemberDialog(true);
                          }}
                          className="px-4 py-2 bg-red-100 text-red-700 font-medium rounded-xl hover:bg-red-200 transition-colors"
                        >
                          Report Lost
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {showLostMembersView && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-red-700">
                    Lost Member Reports
                  </h3>
                  <button
                    onClick={() => setShowLostMembersView(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  {family.lostMembers
                    ?.filter((lm) => !lm.isResolved)
                    .map((lostMember) => {
                      const member = family.members.find(
                        (m) => m?.userId?._id === lostMember?.userId,
                      );
                      const reporter = family.members.find(
                        (m) => m?.userId?._id === lostMember?.reportedBy,
                      );

                      return (
                        <div
                          key={lostMember?._id}
                          className="bg-red-50 border border-red-300 rounded p-4"
                        >
                          <p className="font-semibold">
                            {member?.userId?.name || "Unknown member"}
                          </p>
                          <p className="text-sm text-gray-700">
                            Reported by: {reporter?.userId?.name || "Unknown"}
                          </p>
                          <p className="text-sm text-gray-700">
                            Reported at:{" "}
                            {new Date(lostMember?.reportedAt).toLocaleString()}
                          </p>

                          {lostMember?.lastKnownLocation?.coordinates
                            ?.length === 2 && (
                            <p className="text-sm text-gray-700">
                              Last known location: Lat{" "}
                              {lostMember.lastKnownLocation.coordinates[1].toFixed(
                                6,
                              )}
                              , Lng{" "}
                              {lostMember.lastKnownLocation.coordinates[0].toFixed(
                                6,
                              )}
                            </p>
                          )}

                          {isCurrentUserAdmin && (
                            <button
                              onClick={() => resolveLostMember(lostMember?._id)}
                              className="mt-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Mark as Found
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>

                {family.lostMembers?.filter((lm) => !lm.isResolved).length ===
                  0 && (
                  <p className="text-center text-gray-500 py-8">
                    No unresolved reports.
                  </p>
                )}
              </div>
            </div>
          )}

          {showLostMemberDialog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h3 className="text-xl font-bold mb-3">Report Lost Member</h3>
                <p className="text-gray-700 mb-4">
                  This creates a lost-member report for your family. Continue?
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => reportLostMember(selectedLostMember)}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  >
                    Confirm Report
                  </button>
                  <button
                    onClick={() => {
                      setShowLostMemberDialog(false);
                      setSelectedLostMember(null);
                    }}
                    className="flex-1 bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FamilyTracker;
