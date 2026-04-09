import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import FamilyTracker from "../components/FamilyTracker";
import { NavbarDemo } from "../components/Navbar";
import LanguageSelector from "../components/LanguageSelector";

const API_BASE = ""; // Use relative paths so Vite proxy works on mobile (via ngrok)

const FamilyTrackerPage = () => {
  const { currentUser } = useAuth();
  const [distanceAlerts, setDistanceAlerts] = useState([]);
  const [lostMemberAlerts, setLostMemberAlerts] = useState([]);

  const checkDistanceAlerts = async () => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`${API_BASE}/api/family`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.data.family) {
        const family = data.data.family;

        // Get current user's location
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const currentLat = position.coords.latitude;
            const currentLng = position.coords.longitude;

            // Find admin location
            const admin = family.members.find((m) => m.role === "admin");
            if (!admin || !admin.userId.currentLocation) return;

            const [adminLng, adminLat] =
              admin.userId.currentLocation.coordinates;

            // Calculate distance
            const distance = calculateDistance(
              currentLat,
              currentLng,
              adminLat,
              adminLng,
            );

            // Check if distance exceeds threshold
            if (distance > family.maxDistanceAlert) {
              const alert = {
                id: Date.now(),
                message: `You are ${Math.round(distance)}m away from the family head!`,
                distance,
                timestamp: new Date(),
              };

              setDistanceAlerts((prev) => {
                // Only add if not already shown recently
                const recent = prev.find(
                  (a) => Date.now() - a.timestamp < 300000, // 5 minutes
                );
                if (recent) return prev;

                return [...prev, alert];
              });

              // Show browser notification if permitted
              if (
                "Notification" in window &&
                Notification.permission === "granted"
              ) {
                new Notification("Distance Alert", {
                  body: alert.message,
                  icon: "/icon.png",
                  tag: "distance-alert",
                });
              }
            }
          },
          (error) => {
            console.error("Error getting location for distance check:", error);
          },
        );
      }
    } catch (error) {
      console.error("Error checking distance alerts:", error);
    }
  };

  const checkLostMembers = async () => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`${API_BASE}/api/family`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.data.family) {
        const family = data.data.family;
        const unresolvedLost =
          family.lostMembers?.filter((lm) => !lm.isResolved) || [];

        if (unresolvedLost.length > 0) {
          setLostMemberAlerts(unresolvedLost);

          // Show notification for new lost members
          unresolvedLost.forEach((lostMember) => {
            if (
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              // Find member name
              const member = family.members.find(
                (m) => m.userId._id === lostMember.userId,
              );

              if (member) {
                new Notification("Lost Member Alert", {
                  body: `${member.userId.name} has been reported as lost!`,
                  icon: "/icon.png",
                  tag: `lost-${lostMember._id}`,
                });
              }
            }
          });
        } else {
          setLostMemberAlerts([]);
        }
      }
    } catch (error) {
      console.error("Error checking lost members:", error);
    }
  };

  useEffect(() => {
    // Check for distance alerts every 60 seconds
    const alertInterval = setInterval(async () => {
      await checkDistanceAlerts();
      await checkLostMembers();
    }, 60000);

    // Initial check
    checkDistanceAlerts();
    checkLostMembers();

    return () => clearInterval(alertInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const dismissDistanceAlert = (id) => {
    setDistanceAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="min-h-screen bg-sand/30">
      {/* Navbar */}
      <header className="p-4 md:px-10 flex items-center justify-between gap-4 bg-white sticky top-0 z-40 shadow-sm">
        <NavbarDemo />
        <LanguageSelector />
      </header>

      {/* Distance Alerts */}
      {distanceAlerts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {distanceAlerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-primary text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-4 animate-pulse"
            >
              
              <button
                onClick={() => dismissDistanceAlert(alert.id)}
                className="text-white hover:text-gray-200"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lost Member Alerts */}
      {lostMemberAlerts.length > 0 && (
        <div className="fixed top-20 right-4 z-50 space-y-2">
          {lostMemberAlerts.slice(0, 3).map((alert) => (
            <div
              key={alert._id}
              className="bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg animate-pulse"
            >
              <p className="font-bold">🚨 Lost Member Alert</p>
              <p className="text-sm">
                A family member has been reported as lost!
              </p>
              <p className="text-xs mt-1">
                Reported: {new Date(alert.reportedAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Main Family Tracker */}
      <div className="py-6">
        <FamilyTracker />
      </div>
    </div>
  );
};

export default FamilyTrackerPage;
