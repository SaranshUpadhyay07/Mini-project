import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";

const API_BASE = ""; // Use relative paths so Vite proxy works on mobile (via ngrok)
const INTERVAL_MS = 5000; // 5 seconds

/**
 * Global hook that sends the user's geolocation to the backend
 * every 5 seconds while they are logged in.
 *
 * Usage: call once in App.jsx (or a layout component).
 */
export function useLocationTracker() {
  const { currentUser } = useAuth();
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);
  const latestPositionRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return;

    // Start watching position (low-power continuous updates)
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          latestPositionRef.current = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
        },
        (err) => {
          console.warn("[LocationTracker] watchPosition error:", err.message);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
      );
    }

    // Send latest position to backend every INTERVAL_MS
    const sendLocation = async () => {
      const pos = latestPositionRef.current;
      if (!pos) return;

      try {
        const token = await currentUser.getIdToken();
        await fetch(`${API_BASE}/api/users/location`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(pos),
        });
      } catch (e) {
        console.warn("[LocationTracker] failed to send location:", e.message);
      }
    };

    // Send immediately, then every 5 seconds
    sendLocation();
    intervalRef.current = setInterval(sendLocation, INTERVAL_MS);

    // Clear location when user leaves the page
    const clearLocationOnUnload = () => {
      // Use sendBeacon for reliable delivery during page unload
      const token = currentUser.accessToken;
      if (token) {
        navigator.sendBeacon(
          `${API_BASE}/api/users/location/clear`,
          new Blob(
            [JSON.stringify({ token })],
            { type: "application/json" },
          ),
        );
      }
    };

    window.addEventListener("beforeunload", clearLocationOnUnload);

    return () => {
      window.removeEventListener("beforeunload", clearLocationOnUnload);
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [currentUser]);
}
