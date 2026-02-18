import { useEffect, useRef, useState } from "react";

/**
 * Member Location View
 * - Polling-based tracking only (no socket/realtime transport)
 * - Every visible action maps to supported backend endpoints
 */
const FindMyDevice = ({ member, currentUser, onClose }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const mountedRef = useRef(false);

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

  const placeOrMoveMarker = (lat, lng) => {
    if (!mapInstanceRef.current || !window.mappls) return;
    if (lat == null || lng == null) return;

    if (markerRef.current && typeof markerRef.current.remove === "function") {
      markerRef.current.remove();
      markerRef.current = null;
    }

    markerRef.current = new window.mappls.Marker({
      map: mapInstanceRef.current,
      position: { lat, lng },
      title: tracking.name || "Member",
    });

    mapInstanceRef.current.setCenter({ lat, lng });
  };

  const fetchMemberLatestLocation = async () => {
    try {
      if (!currentUser?.getIdToken || !member?.userId?._id) return;

      const token = await currentUser.getIdToken();
      const res = await fetch(
        `http://localhost:5000/api/family/location/member/${member.userId._id}`,
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
        placeOrMoveMarker(lat, lng);
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
      stopPolling();

      if (markerRef.current && typeof markerRef.current.remove === "function") {
        markerRef.current.remove();
      }
      markerRef.current = null;

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
            Refresh Now
          </button>
        </div>
      </div>

      {/* Map */}
      <div ref={mapContainerRef} className="flex-1 mt-16" />

      {/* Bottom info panel */}
      <div className="absolute left-0 right-0 bottom-0 z-20 bg-white border-t border-gray-200">
        <div className="p-4 space-y-2">
          <p className="text-sm font-semibold text-gray-900">{tracking.name}</p>

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
              className={`px-2 py-1 rounded-full ${
                tracking.isStale
                  ? "bg-amber-100 text-amber-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {tracking.isStale ? "Stale" : "Fresh"}
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
