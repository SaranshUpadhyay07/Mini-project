import { useEffect, useRef, useState } from "react";

const SOCKET_STALE_MS = 2 * 60 * 1000; // 2 min without an update = stale

/**
 * FamilyMap - Live Tracking
 * Note: Socket-based real-time dependency removed. This component now relies on
 * in-component update mechanisms (no socket subscription).
 */

const FamilyMap = ({ member, onClose }) => {
  // REFS - Persistent, never cause re-renders
  const mapContainerRef = useRef(null);
  const mapInstance = useRef(null);
  const trackingPluginRef = useRef(null);
  const isMapInitialized = useRef(false);
  const unsubscribeRef = useRef(null);
  const lastSocketUpdateRef = useRef(null); // timestamp (ms) of last received socket fix
  const staleCheckRef = useRef(null); // setInterval handle for staleness polling

  // STATE - Only for UI overlays
  const [metrics, setMetrics] = useState({ distance: null, eta: null });
  const [status, setStatus] = useState("Connecting to Live Server...");
  const [isStale, setIsStale] = useState(false);

  const MAPPLS_KEY = import.meta.env.VITE_MAPPLS_API_KEY;
  const MAP_DIV_ID = "mappls-realtime-map";

  // ═══════════════════════════════════════════════════════════════
  // ONE-TIME INITIALIZATION
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      console.log("🎬 Initializing Live Map...");

      try {
        // 1. Load Mappls Scripts
        if (!window.mappls) {
          setStatus("Loading Map SDK...");
          await loadMapplsScript();
          await loadTrackingScript();
        }

        // 2. Initialize Map
        if (!isMapInitialized.current && isMounted) {
          await initializeMap();
        }

        // 3. Start staleness watchdog (no socket subscription)
        startStaleWatch();
      } catch (error) {
        console.error("Initialization error:", error);
        setStatus("Error: " + error.message);
      }
    };

    init();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, []); // EMPTY DEPS = Runs ONCE

  // ═══════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  const loadMapplsScript = () => {
    return new Promise((resolve, reject) => {
      if (window.mappls?.Map) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = `https://sdk.mappls.com/map/sdk/web?v=3.0&access_token=${MAPPLS_KEY}`;
      script.async = true;
      script.onload = () => {
        setTimeout(resolve, 500); // Wait for globals to be ready
      };
      script.onerror = () => reject(new Error("Failed to load Mappls SDK"));
      document.head.appendChild(script);
    });
  };

  const loadTrackingScript = () => {
    return new Promise((resolve, reject) => {
      if (window.mappls?.tracking) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = `https://sdk.mappls.com/map/sdk/plugins?v=3.0&libraries=tracking&access_token=${MAPPLS_KEY}`;
      script.async = true;
      script.onload = () => {
        setTimeout(resolve, 500);
      };
      script.onerror = () =>
        reject(new Error("Failed to load Tracking Plugin"));
      document.head.appendChild(script);
    });
  };

  const cleanup = () => {
    console.log("🧹 Cleaning up Real-time Map...");

    // Unsubscribe from socket events
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Remove tracking plugin (safely)
    if (trackingPluginRef.current) {
      try {
        // Don't call remove() - it has internal bugs
        // Just clear the reference
        trackingPluginRef.current = null;
      } catch (e) {
        console.warn("Tracking cleanup warning:", e);
      }
    }

    // Stop staleness watchdog
    if (staleCheckRef.current) {
      clearInterval(staleCheckRef.current);
      staleCheckRef.current = null;
    }

    // Remove map
    if (mapInstance.current) {
      try {
        if (mapInstance.current.remove) {
          mapInstance.current.remove();
        }
      } catch (e) {
        console.warn("Map cleanup warning:", e);
      }
      mapInstance.current = null;
    }

    isMapInitialized.current = false;
  };

  // ═══════════════════════════════════════════════════════════════
  // STALENESS WATCHDOG — checks every 20 s if socket has gone quiet
  // ═══════════════════════════════════════════════════════════════

  const startStaleWatch = () => {
    if (staleCheckRef.current) clearInterval(staleCheckRef.current);

    staleCheckRef.current = setInterval(() => {
      const last = lastSocketUpdateRef.current;
      if (last == null) return; // no update received yet, leave status as-is

      const diffMs = Date.now() - last;
      if (diffMs > SOCKET_STALE_MS) {
        const mins = Math.floor(diffMs / 60_000);
        const secs = Math.floor((diffMs % 60_000) / 1000);
        const label = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
        setIsStale(true);
        setStatus(`⚠️ No updates for ${label} — location may be stale`);
        console.warn(
          `[FamilyMap] [staleWatch] no socket update for ${label} (member=${member?.userId?.firebaseUid})`,
        );
      } else {
        setIsStale(false);
        setStatus("🟢 Live Tracking Active");
      }
    }, 20_000);
  };

  // ═══════════════════════════════════════════════════════════════
  // MAP INITIALIZATION WITH SOCKET
  // ═══════════════════════════════════════════════════════════════

  const initializeMap = async () => {
    if (!mapContainerRef.current || !window.mappls?.Map) {
      throw new Error("Map prerequisites not met");
    }

    try {
      console.log("🗺️ Initializing map with member data:", member.userId);

      // Get Member's Position (The one we're tracking - MOVING marker)
      const memberCoords = member?.userId?.currentLocation?.coordinates;
      if (!memberCoords || memberCoords.length !== 2) {
        throw new Error(
          `Member location not available. Location data: ${JSON.stringify(member?.userId?.currentLocation)}`,
        );
      }
      const [memberLng, memberLat] = memberCoords;

      console.log(`📍 Member location: Lat=${memberLat}, Lng=${memberLng}`);
      console.log(`👤 Member Firebase UID: ${member.userId.firebaseUid}`);
      console.log(
        `📱 Member is sharing location: ${member.userId.isSharingLocation}`,
      );

      // Get Your Position (Observer - STATIC destination)
      // Get current position from browser instead of props
      let myLat = 20.2961; // Default to Bhubaneswar
      let myLng = 85.8245;

      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0,
            });
          });
          myLat = position.coords.latitude;
          myLng = position.coords.longitude;
          console.log(`📍 Your location: Lat=${myLat}, Lng=${myLng}`);
        } catch (geoError) {
          console.warn(
            "⚠️ Could not get your location, using default:",
            geoError.message,
          );
        }
      }

      console.log("🗺️ Creating map...");
      console.log(`   Member (Moving/Red): [${memberLat}, ${memberLng}]`);
      console.log(`   You (Static/Blue): [${myLat}, ${myLng}]`);

      // Assign ID to div
      mapContainerRef.current.id = MAP_DIV_ID;

      // Create Map Instance
      mapInstance.current = new window.mappls.Map(MAP_DIV_ID, {
        center: [memberLat, memberLng],
        zoom: 14,
        zoomControl: true,
      });

      // Wait for map to load using Promise
      await new Promise((resolve, reject) => {
        mapInstance.current.addListener("load", () => {
          isMapInitialized.current = true;
          console.log("✅ Map loaded successfully");
          setStatus("Initializing tracking...");

          // Initialize Tracking Plugin
          // START = Member (moving source)
          // END = You (static destination)
          const trackingOptions = {
            map: mapInstance.current,
            start: {
              geoposition: `${memberLat},${memberLng}`,
              start_icon: {
                url: "https://apis.mappls.com/map_v3/2.png", // Red marker for member
                width: 40,
                height: 40,
              },
            },
            end: {
              geoposition: `${myLat},${myLng}`,
              end_icon: {
                url: "https://apis.mappls.com/map_v3/1.png", // Blue marker for you
                width: 35,
                height: 35,
              },
            },
            resource: "route_eta",
            profile: "driving",
            fitBounds: true,
            connector: true,
            strokeWidth: 6,
            routeColor: "#6366F1",
            ccpIconWidth: 50,
          };

          window.mappls.tracking(trackingOptions, (data) => {
            if (!data || data.error) {
              console.error("❌ Tracking error:", data?.error);
              setStatus("Error initializing tracking");
              reject(new Error(data?.error || "Tracking failed"));
              return;
            }

            trackingPluginRef.current = data;
            console.log("✅ Tracking plugin initialized");

            // Set initial metrics
            if (data.dis && data.dur) {
              setMetrics({
                distance: (data.dis / 1000).toFixed(2) + " km",
                eta: Math.ceil(data.dur / 60) + " mins",
              });
            }

            setStatus("🟢 Live Tracking Active");
            resolve();
          });
        });
      });
    } catch (error) {
      console.error("Map initialization error:", error);
      throw error;
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // Live update hook (Socket removed)
  // ═══════════════════════════════════════════════════════════════
  // NOTE:
  // This component previously depended on Socket.io events to call Mappls
  // `trackingCall()` in real-time. With sockets removed, there is no active
  // transport providing incremental location updates into this component.

  // ═══════════════════════════════════════════════════════════════
  // RENDER - Modern Overlay UI
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Stale location warning banner */}
      {isStale && (
        <div className="absolute top-0 left-0 right-0 z-20 bg-sand border-b border-primary-200 text-primary-dark text-sm font-medium text-center py-2 px-4 shadow-sm">
          ⚠️ Location data is stale — member may have stopped sharing or lost
          signal
        </div>
      )}

      {/* Header Overlay */}
      <div
        className={`absolute left-0 right-0 z-10 p-4 max-w-7xl mx-auto w-full transition-all duration-300 ${isStale ? "top-8" : "top-0"}`}
      >
        <div
          className={`bg-white/95 backdrop-blur-md shadow-lg rounded-2xl p-4 md:px-6 md:py-4 flex flex-wrap gap-4 justify-between items-center border border-white/40 ${isStale ? "border-2 border-primary-300" : ""}`}
        >
          
          <div>
            <h2 className="font-bold text-xl text-gray-900">{member.userId.name}</h2>
            <div className="text-sm border-t border-gray-100 pt-1.5 mt-1.5 flex flex-wrap gap-4">
              {/* <span
                className={
                  status.includes("Live")
                    ? "text-primary font-semibold flex items-center gap-1.5"
                    : status.includes("⚠️")
                      ? "text-primary font-semibold flex items-center gap-1.5"
                      : "text-gray-500 font-medium"
                }
              >
                {status.includes("Live") && <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>}
                {status}
              </span> */}
              {metrics.distance && (
                <span className="font-medium text-gray-700">📍 {metrics.distance}</span>
              )}
              {metrics.eta && (
                <span className="font-medium text-gray-700">⏱️ {metrics.eta}</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-white border-2 border-primary-100 hover:bg-sand hover:border-primary-200 text-primary-dark px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm hover:shadow"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Map Container - Never re-rendered by React */}
      <div
        ref={mapContainerRef}
        style={{ width: "100%", height: "100vh", position: "relative" }}
      />

      {/* Footer Legend */}
      <div className="absolute bottom-6 left-0 right-0 z-10 p-4 max-w-fit mx-auto w-full">
        <div className="bg-white/95 backdrop-blur-md shadow-xl rounded-2xl border border-primary-50 px-6 py-4 flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8 hover:shadow-2xl transition-shadow">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-6 h-6 bg-red-100 rounded-full">
              <span className="inline-block w-2.5 h-2.5 bg-red-500 rounded-full"></span>
            </span>
            <span className="text-sm font-semibold text-gray-700">
              {member.userId.name} <span className="text-gray-400 font-medium text-xs">(Moving)</span>
            </span>
          </div>
          <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-6 h-6 bg-sand rounded-full">
              <span className="inline-block w-2.5 h-2.5 bg-primary-light rounded-full"></span>
            </span>
            <span className="text-sm font-semibold text-gray-700">You <span className="text-gray-400 font-medium text-xs">(Static)</span></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilyMap;
