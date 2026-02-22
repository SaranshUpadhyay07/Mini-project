import { useEffect, useRef, useState, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Member Location View
 * - Polling-based tracking only (no socket/realtime transport)
 * - Every visible action maps to supported backend endpoints
 */
const FindMyDevice = ({ member, currentUser, onClose }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const myMarkerRef = useRef(null);
  const directionPluginRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const mountedRef = useRef(false);
  const routeTriggeredRef = useRef(false); // only auto-trigger once
  const hasInitialCenteredRef = useRef(false); // only center map on first marker placement

  const [status, setStatus] = useState("Loading map...");
  const [tracking, setTracking] = useState({
    name: member?.userId?.name || "Member",
    isSharingLocation: Boolean(member?.userId?.isSharingLocation),
    latitude: member?.userId?.currentLocation?.coordinates?.[1] ?? null,
    longitude: member?.userId?.currentLocation?.coordinates?.[0] ?? null,
    accuracy: null,
    lastLocationUpdate: member?.userId?.lastLocationUpdate || null,
    isStale: true,
  });
  const [autoRefreshAt, setAutoRefreshAt] = useState(null);
  const [error, setError] = useState("");

  const [routeInfo, setRouteInfo] = useState(null); // { distance, duration }
  const [routeStatus, setRouteStatus] = useState("idle"); // "idle"|"loading"|"success"|"error"
  const [routeError, setRouteError] = useState("");

  const MAPPLS_KEY = import.meta.env.VITE_MAPPLS_API_KEY;
  const MAP_DIV_ID = "member-location-map";

  const ensureMapplsLoaded = () =>
    new Promise((resolve, reject) => {
      if (window.mappls?.Map) return resolve();

      const existing = document.querySelector(
        'script[src*="sdk.mappls.com/map/sdk/web"]',
      );
      if (existing) {
        let retries = 0;
        const timer = setInterval(() => {
          if (window.mappls?.Map) {
            clearInterval(timer);
            resolve();
          }
          retries += 1;
          if (retries > 50) {
            clearInterval(timer);
            reject(new Error("Map SDK did not initialize"));
          }
        }, 200);
        return;
      }

      const script = document.createElement("script");
      script.src = `https://sdk.mappls.com/map/sdk/web?v=3.0&access_token=${MAPPLS_KEY}`;
      script.async = true;
      script.onload = () => {
        setTimeout(() => {
          if (window.mappls?.Map) resolve();
          else reject(new Error("Map SDK unavailable after load"));
        }, 300);
      };
      script.onerror = () => reject(new Error("Failed to load map SDK"));
      document.head.appendChild(script);
    });

  const ensureDirectionPluginLoaded = () =>
    new Promise((resolve, reject) => {
      if (window.mappls?.direction) return resolve();

      const existing = document.querySelector(
        'script[src*="sdk.mappls.com/map/sdk/plugins"]',
      );
      if (existing) {
        let retries = 0;
        const timer = setInterval(() => {
          if (window.mappls?.direction) {
            clearInterval(timer);
            resolve();
          }
          retries += 1;
          if (retries > 60) {
            clearInterval(timer);
            reject(new Error("Direction plugin did not initialize"));
          }
        }, 200);
        return;
      }

      const script = document.createElement("script");
      script.src = `https://sdk.mappls.com/map/sdk/plugins?v=3.0&libraries=direction&access_token=${MAPPLS_KEY}`;
      script.async = true;
      script.onload = () => {
        setTimeout(() => {
          if (window.mappls?.direction) resolve();
          else reject(new Error("Direction plugin unavailable after load"));
        }, 400);
      };
      script.onerror = () =>
        reject(new Error("Failed to load direction plugin"));
      document.head.appendChild(script);
    });

  // Draw a driving route from current user GPS → member location.
  const drawRoute = useCallback(
    async (memberLat, memberLng) => {
      if (!mapInstanceRef.current || !window.mappls) return;
      if (memberLat == null || memberLng == null) return;

      setRouteStatus("loading");
      setRouteError("");

      try {
        // 1. Obtain current user's GPS position.
        const position = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 30000,
          }),
        );

        if (!mountedRef.current) return;

        const myLat = position.coords.latitude;
        const myLng = position.coords.longitude;
        const myAccuracy = position.coords.accuracy;

        // 2. Place / refresh the "You" marker.
        if (myMarkerRef.current?.remove) {
          try {
            myMarkerRef.current.remove();
          } catch {
            // ignored
          }
        }
        myMarkerRef.current = new window.mappls.Marker({
          map: mapInstanceRef.current,
          position: { lat: myLat, lng: myLng },
          title: "Your Location",
          icon: {
            url: "https://apis.mappls.com/map_v3/2.png",
            width: 35,
            height: 45,
          },
        });

        // 3. Ensure the direction plugin is available.
        await ensureDirectionPluginLoaded();
        if (!mountedRef.current) return;

        // 4. Remove any previously drawn route.
        if (directionPluginRef.current?.remove) {
          try {
            directionPluginRef.current.remove();
          } catch {
            // ignored
          }
          directionPluginRef.current = null;
        }

        // 5. Draw the new route.
        // The Mappls direction SDK may call our callback successfully (route drawn)
        // and then CONTINUE executing synchronously, throwing "null.style" when it
        // tries to update its step-panel UI. We track callbackFired so we can
        // distinguish that harmless post-callback SDK noise from a real failure.
        await new Promise((resolve, reject) => {
          let callbackFired = false;

          // Safety timeout — if the SDK never calls back, give up after 15 s.
          const timeoutId = setTimeout(() => {
            if (!callbackFired) reject(new Error("Route timed out"));
          }, 15000);

          const onRouteData = (data) => {
            callbackFired = true;
            clearTimeout(timeoutId);
            if (!mountedRef.current) return resolve();
            if (!data || data.error) {
              reject(new Error(data?.error || "Route calculation failed"));
              return;
            }
            directionPluginRef.current = data;
            if (data.routes?.[0]) {
              const r = data.routes[0];
              setRouteInfo({
                distance: (r.distance / 1000).toFixed(1),
                duration: Math.round(r.duration / 60),
                accuracy: Math.round(myAccuracy),
                accuracyWeak: myAccuracy > 200,
              });
            }
            setRouteStatus("success");
            setRouteError("");
            resolve();
          };

          try {
            window.mappls.direction(
              {
                map: mapInstanceRef.current,
                divId: "fmd-route-panel",
                start: `${myLat},${myLng}`,
                end: `${memberLat},${memberLng}`,
                fitbounds: true,
                profile: "driving",
                resource: "route_adv",
                steps: false,
                stepPopup: false,
                search: false,
                // Suppress alternative routes so only one path + one label shows.
                alternatives: false,
                alternative: 0,
              },
              onRouteData,
            );
          } catch (sdkErr) {
            clearTimeout(timeoutId);
            if (callbackFired) {
              // Callback already set success — this is a post-render SDK error
              // (e.g. null.style in internal panel code). Safe to ignore.
              console.warn(
                "[FindMyDevice] Post-render SDK error (ignored):",
                sdkErr?.message,
              );
            } else {
              // SDK threw before ever calling back — genuine failure.
              reject(sdkErr);
            }
          }
        });
      } catch (err) {
        if (!mountedRef.current) return;
        console.error("[FindMyDevice] Route error:", err);
        const msg =
          err?.code === 1
            ? "Location permission denied — cannot draw route."
            : err?.message || "Could not calculate route.";
        setRouteStatus("error");
        setRouteError(msg);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const initializeMap = async () => {
    if (!mapContainerRef.current) return;
    await ensureMapplsLoaded();

    mapContainerRef.current.id = MAP_DIV_ID;
    const initialLat = tracking.latitude ?? 20.2961;
    const initialLng = tracking.longitude ?? 85.8245;

    mapInstanceRef.current = new window.mappls.Map(MAP_DIV_ID, {
      center: [initialLat, initialLng],
      zoom: 14,
      zoomControl: true,
      location: false,
    });

    mapInstanceRef.current.on("load", () => {
      setStatus("Map ready");
      placeOrMoveMarker(initialLat, initialLng);
    });
  };

  const placeOrMoveMarker = (lat, lng, isStalePosition = false) => {
    if (!mapInstanceRef.current || !window.mappls) return;
    if (lat == null || lng == null) return;

    if (markerRef.current && typeof markerRef.current.remove === "function") {
      markerRef.current.remove();
      markerRef.current = null;
    }

    const markerOptions = {
      map: mapInstanceRef.current,
      position: { lat, lng },
      title: isStalePosition
        ? `${tracking.name || "Member"} (stale location)`
        : tracking.name || "Member",
    };

    // Use a visually distinct (grey/faded) icon when location is stale
    if (isStalePosition) {
      markerOptions.icon = {
        url: "https://apis.mappls.com/map_v3/3.png",
        width: 30,
        height: 38,
      };
    }

    markerRef.current = new window.mappls.Marker(markerOptions);

    // Only snap the map to the member's position on the very first placement.
    // After that, leave the viewport alone so the user can freely pan/zoom.
    if (!hasInitialCenteredRef.current) {
      hasInitialCenteredRef.current = true;
      mapInstanceRef.current.setCenter({ lat, lng });
    }
  };

  const fetchMemberLatestLocation = async () => {
    try {
      if (!currentUser?.getIdToken || !member?.userId?._id) return;

      const token = await currentUser.getIdToken();
      const res = await fetch(
        `${API_BASE}/api/family/location/member/${member.userId._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(
          data?.message || `Failed to fetch member location (${res.status})`,
        );
      }

      const payload = data.data;
      const lat = payload?.location?.latitude ?? null;
      const lng = payload?.location?.longitude ?? null;

      setTracking({
        name: payload?.name || tracking.name,
        isSharingLocation: Boolean(payload?.isSharingLocation),
        latitude: lat,
        longitude: lng,
        accuracy: payload?.accuracy ?? null,
        lastLocationUpdate: payload?.lastLocationUpdate || null,
        isStale: Boolean(payload?.isStale),
      });

      if (lat != null && lng != null) {
        placeOrMoveMarker(lat, lng, Boolean(payload?.isStale));

        // Auto-draw route on the very first successful location fetch.
        if (!routeTriggeredRef.current) {
          routeTriggeredRef.current = true;
          drawRoute(lat, lng);
        }
      }

      setAutoRefreshAt(new Date().toISOString());
      setStatus(
        payload?.isStale ? "Location may be stale" : "Location updated",
      );
      setError("");
    } catch (err) {
      console.error("Member polling error:", err);
      setStatus("Sync error");
      setError(err?.message || "Could not sync member location");
    }
  };

  const startPolling = () => {
    stopPolling();
    fetchMemberLatestLocation();
    pollIntervalRef.current = setInterval(fetchMemberLatestLocation, 5000);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    const run = async () => {
      try {
        await initializeMap();
        if (!mountedRef.current) return;
        startPolling();
      } catch (err) {
        console.error("Map initialization error:", err);
        setStatus("Map unavailable");
        setError(err?.message || "Could not initialize map");
      }
    };

    run();

    return () => {
      mountedRef.current = false;
      hasInitialCenteredRef.current = false;
      stopPolling();

      if (markerRef.current && typeof markerRef.current.remove === "function") {
        markerRef.current.remove();
      }
      markerRef.current = null;

      if (
        myMarkerRef.current &&
        typeof myMarkerRef.current.remove === "function"
      ) {
        try {
          myMarkerRef.current.remove();
        } catch {
          // ignored
        }
      }
      myMarkerRef.current = null;

      if (directionPluginRef.current?.remove) {
        try {
          directionPluginRef.current.remove();
        } catch {
          // ignored
        }
      }
      directionPluginRef.current = null;

      if (
        mapInstanceRef.current &&
        typeof mapInstanceRef.current.remove === "function"
      ) {
        mapInstanceRef.current.remove();
      }
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatLastSeen = () => {
    if (!tracking.lastLocationUpdate) return "Unknown";
    const date = new Date(tracking.lastLocationUpdate);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleString();
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            Back
          </button>
          <h1 className="text-base sm:text-lg font-semibold">
            Member Location
          </h1>
          <button
            onClick={fetchMemberLatestLocation}
            className="px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stale location warning banner — shown over the map */}
      {tracking.isStale && tracking.isSharingLocation && (
        <div
          className="absolute left-0 right-0 z-20 bg-amber-400 text-amber-900 text-xs font-semibold text-center py-1.5 px-4"
          style={{ top: "64px" }}
        >
          ⚠️ Location is stale — last update: {formatLastSeen()}
        </div>
      )}

      {/* Map */}
      <div ref={mapContainerRef} className="flex-1 mt-16" />

      {/* Hidden container for the Mappls direction route-panel UI.
          The SDK always tries to render its step-panel into a real DOM node.
          Without this it looks for a null element and crashes with
          "Cannot read properties of null (reading 'style')". */}
      <div
        id="fmd-route-panel"
        style={{ display: "none", position: "absolute", zIndex: -1 }}
        aria-hidden="true"
      />

      {/* Bottom info panel */}
      <div className="absolute left-0 right-0 bottom-0 z-20 bg-white border-t border-gray-200">
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-900">
              {tracking.name}
            </p>

            {/* Route action button */}
            <button
              onClick={() => {
                if (tracking.latitude != null && tracking.longitude != null) {
                  drawRoute(tracking.latitude, tracking.longitude);
                }
              }}
              disabled={routeStatus === "loading" || tracking.latitude == null}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {routeStatus === "loading" ? (
                <>
                  <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                  Routing…
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 12h18M13 6l6 6-6 6" />
                  </svg>
                  {routeStatus === "success" ? "Refresh Route" : "Show Route"}
                </>
              )}
            </button>
          </div>

          {/* Route info strip */}
          {routeStatus === "success" && routeInfo && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 rounded-lg bg-orange-50 border border-orange-100 px-3 py-2 text-xs">
                <span className="font-semibold text-orange-700">
                  🚗 {routeInfo.distance} km
                </span>
                <span className="text-gray-400">·</span>
                <span className="font-semibold text-orange-700">
                  ~{routeInfo.duration} min
                </span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500">
                  your GPS ±{routeInfo.accuracy} m
                </span>
              </div>
              {routeInfo.accuracyWeak && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
                  ⚠️ Low GPS accuracy ({routeInfo.accuracy} m) — route start
                  point may be approximate. Move outdoors for a better fix.
                </p>
              )}
            </div>
          )}

          {routeStatus === "error" && routeError && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
              ⚠️ {routeError}
            </p>
          )}

          <div className="flex flex-wrap gap-2 text-xs">
            <span
              className={`px-2 py-1 rounded-full ${
                tracking.isSharingLocation
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {tracking.isSharingLocation
                ? "Sharing enabled"
                : "Sharing disabled"}
            </span>
            <span
              className={`px-2 py-1 rounded-full font-semibold ${
                tracking.isStale
                  ? "bg-amber-400 text-amber-900"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {tracking.isStale ? "⚠️ Stale" : "✓ Fresh"}
            </span>
            <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">
              Auto-refresh: 5s
            </span>
          </div>

          <p className="text-xs text-gray-600">Status: {status}</p>
          <p className="text-xs text-gray-600">
            Last location update: {formatLastSeen()}
          </p>
          {tracking.accuracy != null && (
            <p className="text-xs text-gray-600">
              Accuracy: {Math.round(tracking.accuracy)}m
            </p>
          )}
          {autoRefreshAt && (
            <p className="text-xs text-gray-500">
              Last sync: {new Date(autoRefreshAt).toLocaleTimeString()}
            </p>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FindMyDevice;
