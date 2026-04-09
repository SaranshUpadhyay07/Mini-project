import React, { useEffect, useRef, useState } from "react";
import {
  IconMapPin,
  IconX,
  IconRoute,
  IconCurrentLocation,
  IconSearch,
  IconChevronDown,
  IconChevronUp,
  IconAlertCircle,
  IconCheck,
  IconNavigation,
  IconArrowLeft,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { NavbarDemo } from "../components/Navbar";
import TranslatableText from "../components/TranslatableText";
import LanguageSelector from "../components/LanguageSelector";
import { useDynamicTranslation } from "../hooks/useDynamicTranslation";
import { useAuth } from "../context/AuthContext";

const MapPage = () => {
  const navigate = useNavigate();
  const { translateText, currentLanguage } = useDynamicTranslation();
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [activeView, setActiveView] = useState("search"); // 'search' or 'details'
  const [placeDetailsData, setPlaceDetailsData] = useState(null);
  const [currentUserLocation, setCurrentUserLocation] = useState(null);
  const [currentLocationMarker, setCurrentLocationMarker] = useState(null);
  const currentLocationMarkerRef = useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [searchCity, setSearchCity] = useState("Bhubaneswar");
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(true);
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const nearbyPluginRef = useRef(null);
  const directionPluginRef = useRef(null);
  const selectedMarkerRef = useRef(null);
  const nearbyContainerRef = useRef(null);
  const isInitialized = useRef(false);
  const lastSearchCity = useRef(null);

  const MAPPLS_KEY = import.meta.env.VITE_MAPPLS_API_KEY;
  const { currentUser } = useAuth();

  const API_BASE = ""; // Use relative paths so Vite proxy works on mobile (via ngrok)
  const CROWD_THRESHOLD = Number(import.meta.env.VITE_CROWD_THRESHOLD ?? 5);
  const HEATMAP_POLL_MS = Number(import.meta.env.VITE_HEATMAP_POLL_MS ?? 15000);
  const HEATMAP_CELL_SIZE_M = Number(
    import.meta.env.VITE_HEATMAP_CELL_SIZE_M ?? 200,
  );
  const HEATMAP_RADIUS = Number(import.meta.env.VITE_HEATMAP_RADIUS ?? 25);
  const HEATMAP_MAX_INTENSITY = Number(
    import.meta.env.VITE_HEATMAP_MAX_INTENSITY ?? 10,
  );
  const HEATMAP_MAX_OUT = Number(import.meta.env.VITE_HEATMAP_MAX_OUT ?? 5000);
  const HEATMAP_FIT_BOUNDS =
    String(import.meta.env.VITE_HEATMAP_FIT_BOUNDS ?? "false").toLowerCase() ===
    "true";
  const HEATMAP_GRADIENT = (
    import.meta.env.VITE_HEATMAP_GRADIENT ??
    "rgba(0,255,255,0)|rgba(0,255,255,1)"
  )
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  const heatmapLayerRef = useRef(null);
  const heatmapPollRef = useRef(null);

  // City coordinates for searching
  const cityCoordinates = {
    Bhubaneswar: { lat: 20.2961, lng: 85.8245 },
    Puri: { lat: 19.8135, lng: 85.8312 },
    Konark: { lat: 19.8876, lng: 86.0945 },
  };

  // Show notification helper
  const showNotification = (message, type = "info", duration = 4000) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), duration);
  };

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const loadMapplsSDK = () => {
      if (window.mappls && window.mappls.Map && window.mappls.nearby) {
        console.log("Mappls SDK and plugins already loaded");
        setTimeout(initializeMap, 100);
        return;
      }

      if (window.mappls && window.mappls.Map && !window.mappls.nearby) {
        console.log(
          "Mappls SDK loaded, but nearby plugin missing. Loading plugins...",
        );
        loadPlugins();
        return;
      }

      const existingSDK = document.querySelector(
        'script[src*="sdk.mappls.com/map/sdk/web"]',
      );

      if (existingSDK) {
        console.log("Mappls SDK script exists, waiting for it to load...");
        const checkReady = setInterval(() => {
          if (window.mappls && window.mappls.Map) {
            clearInterval(checkReady);
            if (window.mappls.nearby) {
              setTimeout(initializeMap, 100);
            } else {
              loadPlugins();
            }
          }
        }, 200);
        setTimeout(() => clearInterval(checkReady), 10000);
        return;
      }

      console.log("Loading Mappls SDK fresh...");
      const script = document.createElement("script");
      script.src = `https://sdk.mappls.com/map/sdk/web?v=3.0&access_token=${MAPPLS_KEY}`;
      script.async = true;
      script.onload = () => {
        console.log("Mappls SDK loaded");
        loadPlugins();
      };
      script.onerror = () => {
        console.error("Failed to load Mappls SDK");
        showNotification("Failed to load map. Please refresh.", "error");
      };
      document.head.appendChild(script);
    };

    const loadPlugins = () => {
      if (window.mappls && window.mappls.nearby) {
        console.log("Plugins already available");
        setTimeout(initializeMap, 100);
        return;
      }

      const existingPlugin = document.querySelector(
        'script[src*="sdk.mappls.com/map/sdk/plugins"]',
      );
      if (existingPlugin) {
        console.log("Plugin script exists, waiting...");
        const checkPlugins = setInterval(() => {
          if (window.mappls && window.mappls.nearby) {
            clearInterval(checkPlugins);
            setTimeout(initializeMap, 100);
          }
        }, 200);
        setTimeout(() => clearInterval(checkPlugins), 10000);
        return;
      }

      console.log("Loading Mappls plugins...");
      const pluginScript = document.createElement("script");
      pluginScript.src = `https://sdk.mappls.com/map/sdk/plugins?v=3.0&libraries=direction,nearby,getPinDetails,pinMarker,heatmap&access_token=${MAPPLS_KEY}`;
      pluginScript.async = true;
      pluginScript.onload = () => {
        console.log("Mappls plugins loaded");
        setTimeout(initializeMap, 300);
      };
      document.head.appendChild(pluginScript);
    };

    loadMapplsSDK();

    return () => {
      if (nearbyContainerRef.current) {
        nearbyContainerRef.current.innerHTML = "";
      }
    };
  }, []);

  // Translation observer for Mappls injected content
  useEffect(() => {
    // Only observe if not English and map is ready
    if (!isMapReady) return;

    const targetDiv = document.getElementById("nearby_search_results");
    if (!targetDiv) return;

    const translationCache = new Map();
    let translationTimeout;
    let isTranslating = false;

    const translateMaplsText = async (element) => {
      if (isTranslating) return;
      isTranslating = true;

      // Find clickable elements (a, button) and their text content
      const clickableElements = element.querySelectorAll(
        "a, button, [onclick]",
      );

      for (const el of clickableElements) {
        // Get only direct text content, not nested elements
        const textNodes = Array.from(el.childNodes).filter(
          (node) =>
            node.nodeType === Node.TEXT_NODE &&
            node.textContent.trim().length > 2,
        );

        for (const textNode of textNodes) {
          const originalText = textNode.textContent.trim();

          // Skip if already cached
          if (translationCache.has(originalText)) {
            const translatedText = translationCache.get(originalText);
            // Preserve whitespace structure
            textNode.textContent = textNode.textContent.replace(
              originalText,
              translatedText,
            );
            continue;
          }

          try {
            const translated = await translateText(originalText);
            if (translated && translated !== originalText) {
              translationCache.set(originalText, translated);
              // Preserve whitespace structure
              textNode.textContent = textNode.textContent.replace(
                originalText,
                translated,
              );
            }
          } catch (error) {
            console.warn("Translation failed for:", originalText, error);
          }
        }
      }

      // Also translate non-clickable text (labels, descriptions)
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            // Skip if parent is clickable (already handled)
            if (
              node.parentElement &&
              node.parentElement.closest("a, button, [onclick]")
            ) {
              return NodeFilter.FILTER_SKIP;
            }
            const text = node.textContent.trim();
            return text && text.length > 2 && !/^\d+$/.test(text)
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_SKIP;
          },
        },
        false,
      );

      const nonClickableNodes = [];
      let node;
      while ((node = walker.nextNode())) {
        nonClickableNodes.push(node);
      }

      for (const textNode of nonClickableNodes) {
        const originalText = textNode.textContent.trim();

        if (translationCache.has(originalText)) {
          const translatedText = translationCache.get(originalText);
          textNode.textContent = textNode.textContent.replace(
            originalText,
            translatedText,
          );
          continue;
        }

        try {
          const translated = await translateText(originalText);
          if (translated && translated !== originalText) {
            translationCache.set(originalText, translated);
            textNode.textContent = textNode.textContent.replace(
              originalText,
              translated,
            );
          }
        } catch (error) {
          console.warn("Translation failed for:", originalText, error);
        }
      }

      isTranslating = false;
    };

    const observer = new MutationObserver((mutations) => {
      // Clear previous timeout
      clearTimeout(translationTimeout);

      // Wait longer (1.5s) to ensure Mappls has fully set up event handlers
      translationTimeout = setTimeout(() => {
        const hasNewContent = mutations.some((mutation) =>
          Array.from(mutation.addedNodes).some(
            (node) => node.nodeType === Node.ELEMENT_NODE,
          ),
        );

        if (hasNewContent) {
          console.log("Translating Mappls content after delay...");
          translateMaplsText(targetDiv);
        }
      }, 1500);
    });

    observer.observe(targetDiv, {
      childList: true,
      subtree: true,
    });

    // Translate existing content when language changes
    if (targetDiv.children.length > 0) {
      console.log("Translating existing Mappls content...");
      setTimeout(() => translateMaplsText(targetDiv), 1500);
    }

    return () => {
      observer.disconnect();
      clearTimeout(translationTimeout);
    };
  }, [isMapReady, currentLanguage, translateText]);

  const initializeMap = () => {
    console.log("initializeMap called, checking requirements...");
    console.log("mapContainerRef:", !!mapContainerRef.current);
    console.log("window.mappls:", !!window.mappls);
    console.log("window.mappls.Map:", !!(window.mappls && window.mappls.Map));
    console.log(
      "window.mappls.nearby:",
      !!(window.mappls && window.mappls.nearby),
    );

    if (!mapContainerRef.current) {
      console.error("Map container not ready");
      return;
    }

    if (!window.mappls || !window.mappls.Map) {
      console.error("Mappls SDK not ready");
      return;
    }

    if (mapInstanceRef.current) {
      console.log("Map already exists, searching...");
      setIsMapReady(true);
      if (window.mappls.nearby) {
        searchNearbyTemples("Bhubaneswar");
      }
      return;
    }

    const containerId = "mappls-map-container";
    mapContainerRef.current.id = containerId;

    try {
      console.log("Creating new Mappls Map...");
      const map = new window.mappls.Map(containerId, {
        center: [85.85, 20.15],
        zoom: window.innerWidth < 768 ? 7 : 9,
        zoomControl: true,
        location: true,
      });

      map.on("load", () => {
        console.log("Map load event fired!");
        mapInstanceRef.current = map;
        setIsMapReady(true);

        if (window.mappls && window.mappls.nearby) {
          console.log("Nearby plugin available, starting search...");
          searchNearbyTemples("Bhubaneswar");
        } else {
          console.warn("Nearby plugin not available yet");
        }
      });
    } catch (error) {
      console.error("Error initializing map:", error);
      showNotification("Failed to initialize map", "error");
    }
  };

  // Heatmap helpers (crowd by grid)
  const WM_R = 6378137;
  const clampLat = (lat) => Math.max(Math.min(lat, 85.05112878), -85.05112878);

  const lonLatToMeters = (lng, lat) => {
    const clampedLat = clampLat(lat);
    const x = WM_R * ((lng * Math.PI) / 180);
    const y =
      WM_R * Math.log(Math.tan(Math.PI / 4 + (clampedLat * Math.PI) / 360));
    return { x, y };
  };

  const metersToLonLat = (x, y) => {
    const lng = (x / WM_R) * (180 / Math.PI);
    const lat =
      (2 * Math.atan(Math.exp(y / WM_R)) - Math.PI / 2) * (180 / Math.PI);
    return { lat, lng };
  };

  const removeHeatmapLayer = () => {
    if (!heatmapLayerRef.current) return;

    try {
      if (typeof heatmapLayerRef.current.remove === "function") {
        heatmapLayerRef.current.remove();
      }
    } catch (_) {}

    try {
      if (window.mappls?.removeLayer) {
        window.mappls.removeLayer({
          map: mapInstanceRef.current,
          layer: heatmapLayerRef.current,
        });
      }
    } catch (_) {}

    heatmapLayerRef.current = null;
  };

  const computeCrowdHeatmapPoints = (freshPoints) => {
    const cellCounts = new Map();

    for (const p of freshPoints) {
      const { x, y } = lonLatToMeters(p.lng, p.lat);
      const cx = Math.floor(x / HEATMAP_CELL_SIZE_M);
      const cy = Math.floor(y / HEATMAP_CELL_SIZE_M);
      const key = `${cx}:${cy}`;
      cellCounts.set(key, (cellCounts.get(key) ?? 0) + 1);
    }

    const points = [];

    for (const [key, count] of cellCounts.entries()) {
      if (count < CROWD_THRESHOLD) continue;

      const [cxStr, cyStr] = key.split(":");
      const cx = Number(cxStr);
      const cy = Number(cyStr);

      const centerX = (cx + 0.5) * HEATMAP_CELL_SIZE_M;
      const centerY = (cy + 0.5) * HEATMAP_CELL_SIZE_M;
      const center = metersToLonLat(centerX, centerY);

      const repeats = Math.min(
        50,
        Math.max(1, Math.floor(Math.sqrt(count - CROWD_THRESHOLD + 1) * 6)),
      );

      for (let i = 0; i < repeats; i += 1) {
        points.push({ lat: center.lat, lng: center.lng });
        if (points.length >= HEATMAP_MAX_OUT) return points;
      }
    }

    return points;
  };

  const fetchFreshFamilyPoints = async () => {
    if (!currentUser) return [];

    const token = await currentUser.getIdToken();
    const resp = await fetch(`${API_BASE}/api/users/locations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await resp.json();

    if (!resp.ok || !json?.success) {
      throw new Error(
        json?.message || "Failed to fetch user locations for heatmap",
      );
    }

    const locations = json?.data ?? [];

    return locations
      .filter((loc) => loc.lat != null && loc.lng != null)
      .map((loc) => ({
        lat: loc.lat,
        lng: loc.lng,
      }));
  };

  const upsertHeatmap = (heatmapPoints) => {
    if (!mapInstanceRef.current || !window.mappls?.HeatmapLayer) return;

    removeHeatmapLayer();

    if (!heatmapPoints.length) return;

    heatmapLayerRef.current = window.mappls.HeatmapLayer({
      map: mapInstanceRef.current,
      data: heatmapPoints,
      opacity: 0.5,
      radius: HEATMAP_RADIUS,
      maxIntensity: HEATMAP_MAX_INTENSITY,
      fitbounds: HEATMAP_FIT_BOUNDS,
      gradient: HEATMAP_GRADIENT,
    });
  };

  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !currentUser) return;

    let cancelled = false;

    const tick = async () => {
      try {
        const fresh = await fetchFreshFamilyPoints();
        if (cancelled) return;

        // Amplify each user location into a cluster of nearby points
        // so the heatmap layer renders a visible zone (not just a dot)
        const amplified = [];
        const SPREAD = 0.002; // ~200m spread in degrees
        for (const pt of fresh) {
          amplified.push(pt); // original point
          for (let i = 0; i < 20; i++) {
            amplified.push({
              lat: pt.lat + (Math.random() - 0.5) * SPREAD,
              lng: pt.lng + (Math.random() - 0.5) * SPREAD,
            });
          }
        }

        upsertHeatmap(amplified);
      } catch (e) {
        console.warn("[MapPage] heatmap polling failed:", e);
      }
    };

    tick();
    heatmapPollRef.current = setInterval(tick, HEATMAP_POLL_MS);

    return () => {
      cancelled = true;
      if (heatmapPollRef.current) clearInterval(heatmapPollRef.current);
      heatmapPollRef.current = null;
      removeHeatmapLayer();
    };
  }, [isMapReady, currentUser?.uid]);

  // ─── Marker Management Helpers ───────────────────────────────
  const clearNearbyMarkers = () => {
    // 1. Try the official .remove() on the nearby plugin ref
    if (nearbyPluginRef.current) {
      try {
        if (typeof nearbyPluginRef.current.remove === "function") {
          nearbyPluginRef.current.remove();
        }
      } catch (e) {
        console.warn("nearbyPluginRef.remove() failed:", e);
      }
      nearbyPluginRef.current = null;
    }
    // 2. Brute-force: remove all Mappls-generated marker elements from the map DOM
    //    The nearby plugin injects markers as img elements inside the map container
    if (mapContainerRef.current) {
      const mapEl = mapContainerRef.current;
      // Mappls markers are wrapped in divs with specific classes
      const markerEls = mapEl.querySelectorAll(
        '.leaflet-marker-icon, .leaflet-marker-shadow, .mappls-marker, [class*="marker"]',
      );
      markerEls.forEach((el) => {
        // Don't remove elements we explicitly placed (user location marker etc.)
        if (!el.closest("#user-location-marker-wrapper")) {
          try {
            el.remove();
          } catch (e) {}
        }
      });
    }
    // 3. Clear the Mappls popup overlays too
    const popups = document.querySelectorAll(".leaflet-popup, .mappls-popup");
    popups.forEach((p) => {
      try {
        p.remove();
      } catch (e) {}
    });
  };

  const clearSelectedMarker = () => {
    if (selectedMarkerRef.current) {
      try {
        if (typeof selectedMarkerRef.current.remove === "function") {
          selectedMarkerRef.current.remove();
        }
      } catch (e) {
        console.warn("selectedMarkerRef.remove() failed:", e);
      }
      selectedMarkerRef.current = null;
    }
  };

  const showSelectedTempleMarker = (loc) => {
    clearSelectedMarker();

    if (!mapInstanceRef.current || !window.mappls) return;

    // Use pinMarker plugin if eLoc available and plugin is loaded
    if (loc.eLoc && window.mappls.pinMarker) {
      selectedMarkerRef.current = window.mappls.pinMarker(
        {
          map: mapInstanceRef.current,
          pin: [loc.eLoc],
          popupHtml: [
            `<div style="padding:6px 4px;font-size:13px;font-weight:600">${loc.name}</div>`,
          ],
          icon: {
            url: "https://apis.mappls.com/map_v3/1.png",
            width: 35,
            height: 45,
          },
        },
        (markerData) => {
          console.log("pinMarker placed for:", loc.eLoc, markerData);
        },
      );
    } else {
      // Fallback: plain Marker from lat/lng
      selectedMarkerRef.current = new window.mappls.Marker({
        map: mapInstanceRef.current,
        position: { lat: loc.lat, lng: loc.lng },
        title: loc.name,
      });
    }
  };

  const focusTempleOnMap = (loc) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setCenter({ lat: loc.lat, lng: loc.lng });
    mapInstanceRef.current.setZoom(16);
  };
  // ────────────────────────────────────────────────────────────────

  const searchNearbyTemples = (city) => {
    if (!mapInstanceRef.current || !window.mappls || !window.mappls.nearby) {
      console.error("Map or nearby plugin not ready");
      return;
    }

    const coords = cityCoordinates[city];
    if (!coords) {
      console.error("Unknown city:", city);
      return;
    }

    if (lastSearchCity.current === city) {
      console.log(`Already showing results for ${city}`);
      return;
    }
    lastSearchCity.current = city;

    console.log(`Searching temples near ${city}...`);
    setSearchCity(city);

    // Clean up existing nearby markers
    clearNearbyMarkers();
    if (nearbyContainerRef.current) {
      nearbyContainerRef.current.innerHTML = "";
    }

    const options = {
      divId: "nearby_search_results",
      map: mapInstanceRef.current,
      keywords: "temple",
      refLocation: [coords.lat, coords.lng],
      fitbounds: true,
      geolocation: true,
      click_callback: function (d) {
        if (d) {
          console.log("Clicked location:", d);
          setIsLoading(true);
          showNotification("Loading place details...", "info");

          // Step 1: Remove ALL nearby markers from the map
          clearNearbyMarkers();

          // Step 2: Remove any previous selected marker
          clearSelectedMarker();

          const showTempleDetails = (loc) => {
            setIsLoading(false);
            setSelectedLocation(loc);
            setPlaceDetailsData(loc);
            setActiveView("details");

            // Step 3: Show only the selected temple marker
            showSelectedTempleMarker(loc);

            // Step 4: Zoom/fly to the selected temple
            focusTempleOnMap(loc);
          };

          // Build base location from nearby click data
          const baseLoc = {
            name: d.placeName,
            address: d.placeAddress,
            city: city,
            eLoc: d.eLoc,
            lat: parseFloat(d.latitude),
            lng: parseFloat(d.longitude),
            type: d.type || "Temple",
          };

          // Try to enrich with getPinDetails
          if (window.mappls && window.mappls.getPinDetails) {
            window.mappls.getPinDetails({ pin: d.eLoc }, (data) => {
              if (data && data.data && data.data.length > 0) {
                const details = data.data[0];
                showTempleDetails({
                  ...baseLoc,
                  name: details.poi || details.placeName || baseLoc.name,
                  address:
                    details.address || details.placeAddress || baseLoc.address,
                  eLoc: details.eLoc || baseLoc.eLoc,
                  lat: parseFloat(details.latitude || d.latitude),
                  lng: parseFloat(details.longitude || d.longitude),
                  type: details.type || baseLoc.type,
                  phone: details.phone,
                  email: details.email,
                  website: details.website,
                });
              } else {
                showTempleDetails(baseLoc);
              }
            });
          } else {
            showTempleDetails(baseLoc);
          }
        }
      },
    };

    window.mappls.nearby(options, function (data) {
      console.log("Nearby search callback - results:", data);

      if (data && data.error === "error-auth-failed") {
        console.error("Auth failed - check API key whitelisting and quotas");
        showNotification("Search failed. Please try again.", "error");
        lastSearchCity.current = null;
        return;
      }

      nearbyPluginRef.current = data;
      if (data && data.data && data.data.length > 0) {
        showNotification(
          `Found ${data.data.length} temples near ${city}`,
          "success",
        );
      }
    });
  };

  const showRoute = (destination) => {
    if (!currentUserLocation) {
      showNotification("Please get your location first", "error");
      return;
    }

    if (!mapInstanceRef.current || !window.mappls || !window.mappls.direction) {
      showNotification("Direction service not ready", "error");
      return;
    }

    let startPoint, endPoint;

    if (currentUserLocation.lat && currentUserLocation.lng) {
      startPoint = `${currentUserLocation.lat},${currentUserLocation.lng}`;
    } else {
      showNotification("Invalid current location", "error");
      return;
    }

    if (destination.eLoc) {
      endPoint = destination.eLoc;
      console.log("Using eLoc for routing:", endPoint);
    } else if (destination.lat && destination.lng) {
      endPoint = `${destination.lat},${destination.lng}`;
      console.log("Using lat,lng for routing:", endPoint);
    } else if (destination.latitude && destination.longitude) {
      endPoint = `${destination.latitude},${destination.longitude}`;
      console.log("Using latitude,longitude for routing:", endPoint);
    } else {
      showNotification("Invalid destination", "error");
      return;
    }

    console.log("Routing from:", startPoint, "to:", endPoint);
    setIsLoading(true);
    showNotification("Calculating route...", "info");

    try {
      if (directionPluginRef.current && directionPluginRef.current.remove) {
        try {
          directionPluginRef.current.remove();
        } catch (e) {}
      }

      const directionOptions = {
        map: mapInstanceRef.current,
        start: startPoint,
        end: endPoint,
        fitbounds: true,
        profile: "driving",
        resource: "route_adv",
        steps: true,
        stepPopup: false,
        search: false,
      };

      window.mappls.direction(directionOptions, function (data) {
        setIsLoading(false);

        if (!data || data.error) {
          console.error("Direction failed:", data);
          if (data && data.error === "error-auth-failed") {
            showNotification(
              "Route service unavailable. Try again later.",
              "error",
            );
          } else {
            showNotification("Could not calculate route", "error");
          }
          return;
        }

        console.log("Direction success:", data);
        directionPluginRef.current = data;

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const distance = (route.distance / 1000).toFixed(1);
          const duration = Math.round(route.duration / 60);
          showNotification(
            `${distance} km • ${duration} min drive`,
            "success",
            6000,
          );
        }
      });
    } catch (error) {
      setIsLoading(false);
      console.error("Error showing route:", error);
      showNotification("Route calculation failed. Please try again.", "error");
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      showNotification("Geolocation is not supported by your browser", "error");
      return;
    }

    setIsLoading(true);
    showNotification("Getting your location...", "info");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLoading(false);
        const userLoc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setCurrentUserLocation(userLoc);
        console.log("Current location:", userLoc);

        if (mapInstanceRef.current && window.mappls) {
          // Use ref to always get the latest marker (avoids stale closure)
          if (currentLocationMarkerRef.current) {
            try {
              currentLocationMarkerRef.current.remove();
            } catch (e) {
              console.warn("Could not remove old location marker:", e);
            }
          }

          try {
            const marker = new window.mappls.Marker({
              map: mapInstanceRef.current,
              position: userLoc,
              title: "Your Location",
              html: `<div style="position:relative;width:24px;height:24px;">
                <div style="position:absolute;inset:0;border-radius:50%;background:rgba(66,133,244,0.25);animation:locPulse 2s ease-out infinite;"></div>
                <div style="position:absolute;top:4px;left:4px;width:16px;height:16px;border-radius:50%;background:#4285F4;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>
              </div>
              <style>@keyframes locPulse{0%{transform:scale(1);opacity:1}100%{transform:scale(2.5);opacity:0}}</style>`,
            });

            currentLocationMarkerRef.current = marker;
            setCurrentLocationMarker(marker);
            mapInstanceRef.current.setCenter(userLoc);
            mapInstanceRef.current.setZoom(13);
            showNotification("Location found!", "success");
          } catch (markerError) {
            console.error("Error creating location marker:", markerError);
            showNotification("Location found but could not place marker on map", "error");
          }
        } else {
          showNotification("Map not ready yet. Please try again.", "error");
        }
      },
      (error) => {
        setIsLoading(false);
        console.error("Geolocation error:", error);
        let errorMessage;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please allow location access in your browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location unavailable. If using DevTools mobile view, configure a location in Sensors panel.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please try again.";
            break;
          default:
            errorMessage = "Could not get location. Please enable GPS and try again.";
        }
        showNotification(errorMessage, "error", 6000);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const PlaceDetailsContent = () => {
    if (!placeDetailsData) return null;

    return (
      <div className="animate-slide-down bg-white min-h-full">
        {/* Back Button & Header */}
        <div className="sticky top-0 bg-white z-20 p-4 border-b border-slate-200 flex items-center gap-3 shadow-sm">
          <button
            onClick={() => {
              // Step 1: Remove the selected temple marker
              clearSelectedMarker();

              // Step 2: Remove any active direction route from the map
              if (directionPluginRef.current) {
                try {
                  if (typeof directionPluginRef.current.remove === "function") {
                    directionPluginRef.current.remove();
                  }
                } catch (e) {
                  console.warn("Could not remove direction route:", e);
                }
                directionPluginRef.current = null;
              }

              // Step 3: Reset searchCity tracker so nearby search re-runs
              lastSearchCity.current = null;

              // Step 4: Switch view back to search list
              setActiveView("search");

              // Step 5: Re-run nearby search to restore all markers
              searchNearbyTemples(searchCity);
            }}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0"
          >
            <IconArrowLeft size={20} className="text-slate-700" />
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">
              {placeDetailsData.name}
            </h3>
            <p className="text-xs text-slate-500 truncate">
              {placeDetailsData.city}
            </p>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {/* Main Info */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-200 flex-shrink-0 shadow-sm">
              <span className="text-3xl">🕉️</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800 leading-relaxed">
                {placeDetailsData.address}
              </p>
              {placeDetailsData.eLoc && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-50 text-primary-700 rounded text-xs font-semibold border border-primary-200">
                  <IconMapPin size={14} />
                  eLoc: {placeDetailsData.eLoc}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => showRoute(placeDetailsData)}
              disabled={isLoading || !currentUserLocation}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#4F46E5] text-white rounded-lg font-semibold shadow-sm hover:bg-[#6366F1] transition-colors disabled:opacity-50 text-sm"
            >
              <IconRoute size={18} />
              <TranslatableText
                textKey={
                  currentUserLocation ? "get_directions" : "set_location_first"
                }
              >
                {currentUserLocation ? "Get Directions" : "Set Location"}
              </TranslatableText>
            </button>
          </div>

          <div className="h-px bg-slate-200 w-full" />

          {/* Additional contact info from Mappls API */}
          {(placeDetailsData.phone ||
            placeDetailsData.website ||
            placeDetailsData.email) && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <IconInfoCircle size={18} className="text-primary" />
                Contact Info
              </h4>
              {placeDetailsData.phone && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-base">📞</span>
                  <p className="text-sm font-medium text-slate-800">
                    {placeDetailsData.phone}
                  </p>
                </div>
              )}
              {placeDetailsData.email && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-base">✉️</span>
                  <p className="text-sm font-medium text-slate-800">
                    {placeDetailsData.email}
                  </p>
                </div>
              )}
              {placeDetailsData.website && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-base">🌐</span>
                  <a
                    href={placeDetailsData.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary underline break-all"
                  >
                    {placeDetailsData.website}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden bg-white text-slate-900">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-2 border-b border-slate-200">
        <NavbarDemo />
        <LanguageSelector />
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`absolute top-[76px] sm:top-[84px] left-3 right-3 sm:left-6 sm:right-6 z-50 mx-auto max-w-xl p-3.5 border bg-white shadow-md flex items-center gap-3 animate-slide-down ${
            notification.type === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : notification.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-white border-slate-200 text-slate-800"
          }`}
        >
          {notification.type === "error" && <IconAlertCircle size={22} />}
          {notification.type === "success" && <IconCheck size={22} />}
          {notification.type === "info" && (
            <IconNavigation size={22} className="animate-pulse" />
          )}
          <span className="font-medium text-sm flex-1">
            {notification.message}
          </span>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:mt-4 flex flex-col lg:flex-row relative overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex lg:w-lg ml-16 flex-col z-20">
          <div className="h-full py-4 pl-4">
            <div className="h-full bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-slate-200 bg-white">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-primary-100 text-primary-900 flex items-center justify-center border border-primary-200">
                    <IconMapPin size={26} />
                  </div>
                  <div className="grid grid-cols-4 w-full">
                    <div className="col-span-2">
                      <TranslatableText
                        textKey="map_title"
                        tag="h2"
                        className="text-xl font-semibold text-slate-900"
                      >
                        Explore Odisha
                      </TranslatableText>
                      <TranslatableText
                        textKey="map_subtitle"
                        tag="p"
                        className="text-sm text-slate-500"
                      >
                        Temples and shrines near you
                      </TranslatableText>
                    </div>
                    <button
                      onClick={getCurrentLocation}
                      disabled={isLoading}
                      className="w-full flex col-span-2 rounded-xl items-center justify-center gap-3 px-2 py-3 bg-[#4F46E5] text-white font-semibold shadow-sm hover:bg-[#6366F1] transition-colors disabled:opacity-50"
                    >
                      <IconCurrentLocation
                        size={20}
                        className={isLoading ? "animate-spin" : ""}
                      />
                      <TranslatableText
                        textKey={
                          currentUserLocation
                            ? "location_ready"
                            : "use_my_location"
                        }
                      >
                        {currentUserLocation
                          ? "Location ready"
                          : "Use my location"}
                      </TranslatableText>
                    </button>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="p-5 space-y-4 border-b border-slate-200/60 bg-white">
                <div>
                  <TranslatableText
                    textKey="choose_city"
                    tag="p"
                    className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-[0.2em]"
                  >
                    Choose a city
                  </TranslatableText>
                  <div className="flex items-center gap-2 p-1.5 bg-slate-100 border border-slate-200">
                    {Object.keys(cityCoordinates).map((city) => (
                      <button
                        key={city}
                        onClick={() => searchNearbyTemples(city)}
                        className={`flex-1 px-3 py-2.5 text-sm font-semibold border border-transparent transition-colors ${
                          searchCity === city
                            ? "bg-[#4F46E5] text-white rounded-xl border-slate-200"
                            : "text-slate-600 hover:text-slate-900 hover:bg-white"
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Results */}
              <div className="flex-1 overflow-y-auto bg-white relative">
                <div
                  style={{
                    display: activeView === "search" ? "block" : "none",
                  }}
                >
                  <div className="p-4 bg-white border-b border-slate-200 sticky top-0 z-10">
                    <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <IconSearch size={18} className="text-primary" />
                      <TranslatableText textKey="temples_near">
                        Temples near
                      </TranslatableText>{" "}
                      {searchCity}
                    </p>
                    <TranslatableText
                      textKey="tap_place_list"
                      tag="p"
                      className="mt-1 text-xs text-slate-500"
                    >
                      Tap a place in the list to view details
                    </TranslatableText>
                  </div>

                  {!isMapReady && (
                    <div className="flex flex-col items-center justify-center py-20">
                      <div className="relative w-16 h-16">
                        <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent animate-spin"></div>
                      </div>
                      <TranslatableText
                        textKey="preparing_map"
                        tag="p"
                        className="mt-6 text-slate-600 font-medium"
                      >
                        Preparing map…
                      </TranslatableText>
                    </div>
                  )}

                  {/* Desktop nearby results - only visible on lg+ */}
                  <div className="hidden lg:block p-3">
                    <div
                      className="w-full"
                      id="nearby_search_results"
                      ref={nearbyContainerRef}
                      suppressHydrationWarning
                    />
                  </div>
                </div>

                {activeView === "details" && <PlaceDetailsContent />}
              </div>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative lg:mr-16">
          <div className="absolute inset-0 lg:inset-4 overflow-hidden border border-slate-200 bg-white shadow-sm">
            <div
              ref={mapContainerRef}
              className="w-full h-full absolute inset-0 bg-white"
            />
            <div className="pointer-events-none absolute inset-0 ring-1 ring-black/5" />
          </div>
          {/* Subtle overlay to match warm theme */}
          <div className="pointer-events-none absolute inset-0 lg:inset-4 bg-transparent" />
        </div>

        {/* Mobile Bottom Sheet */}
        <div
          className="lg:hidden fixed inset-x-0 bottom-0 z-40 transition-all duration-300 ease-out"
          style={{
            transform: isBottomSheetOpen
              ? "translateY(0)"
              : "translateY(calc(100% - 72px))",
            maxHeight: "72vh",
          }}
        >
          <div className="bg-white shadow-[0_-10px_25px_rgba(2,6,23,0.12)] flex flex-col h-full border-t border-slate-200">
            {/* Handle */}
            <button
              onClick={() => setIsBottomSheetOpen(!isBottomSheetOpen)}
              className="w-full py-4 flex flex-col items-center gap-2 border-b border-slate-200 active:bg-slate-50"
            >
              <div className="w-12 h-1.5 bg-slate-300"></div>
              <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
                {isBottomSheetOpen ? (
                  <IconChevronDown size={18} />
                ) : (
                  <IconChevronUp size={18} />
                )}
                <TranslatableText
                  textKey={isBottomSheetOpen ? "swipe_down" : "tap_to_browse"}
                >
                  {isBottomSheetOpen ? "Swipe down" : "Tap to browse"}
                </TranslatableText>
              </div>
            </button>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Controls */}
              <div className="p-4 space-y-4 border-b border-slate-200/70 bg-white">
                <button
                  onClick={getCurrentLocation}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 px-5 py-4 bg-[#4F46E5] text-white font-semibold shadow-sm active:bg-[#6366F1] transition-colors disabled:opacity-50"
                >
                  <IconCurrentLocation
                    size={20}
                    className={isLoading ? "animate-spin" : ""}
                  />
                  <TranslatableText
                    textKey={
                      currentUserLocation ? "location_ready" : "use_my_location"
                    }
                  >
                    {currentUserLocation ? "Location ready" : "Use my location"}
                  </TranslatableText>
                </button>

                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-[0.2em]">
                    Choose a city
                  </p>
                  <div className="flex items-center gap-2 p-1.5 bg-slate-100 border border-slate-200">
                    {Object.keys(cityCoordinates).map((city) => (
                      <button
                        key={city}
                        onClick={() => searchNearbyTemples(city)}
                        className={`flex-1 px-3 py-2.5 text-sm font-semibold border border-transparent transition-colors ${
                          searchCity === city
                            ? "bg-white text-slate-900 border-slate-200"
                            : "text-slate-600 active:bg-white"
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Results - Mobile */}
              <div className="flex-1 overflow-y-auto relative bg-white">
                <div
                  style={{
                    display: activeView === "search" ? "block" : "none",
                  }}
                >
                  <div className="p-3 bg-white border-b border-slate-200 sticky top-0 z-10">
                    <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <IconSearch size={18} className="text-primary" />
                      <TranslatableText textKey="near_city">
                        Near
                      </TranslatableText>{" "}
                      {searchCity}
                    </p>
                    <TranslatableText
                      textKey="tap_result"
                      tag="p"
                      className="mt-1 text-xs text-slate-500"
                    >
                      Tap a result to open details
                    </TranslatableText>
                  </div>

                  {!isMapReady && (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="relative w-14 h-14">
                        <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent animate-spin"></div>
                      </div>
                      <TranslatableText
                        textKey="loading"
                        tag="p"
                        className="mt-4 text-slate-600 text-sm font-medium"
                      >
                        Loading…
                      </TranslatableText>
                    </div>
                  )}

                  {/* Mobile shows the same nearby results - Mappls injects here on mobile */}
                  <div className="p-3 lg:hidden">
                    <div id="nearby_search_results" suppressHydrationWarning />
                  </div>
                </div>

                {activeView === "details" && <PlaceDetailsContent />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal is completely removed in favor of embedded PlaceDetailsContent */}

      {/* CSS Animations */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-down {
          animation: slideDown 0.3s ease-out;
        }
        .safe-area-top {
          padding-top: max(12px, env(safe-area-inset-top));
        }

        /* Make Mappls injected UI match our design */
        #nearby_search_results {
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Noto Sans", "Liberation Sans", sans-serif;
          color: #0f172a;
        }
        #nearby_search_results input,
        #nearby_search_results select {
          width: 100%;
          border-radius: 0px;
          border: 1px solid rgba(148, 163, 184, 0.45);
          padding: 10px 12px;
          outline: none;
          background: rgba(255,255,255,0.9);
        }
        #nearby_search_results button {
          border-radius: 0px;
          border: 1px solid rgba(148, 163, 184, 0.45);
          padding: 10px 12px;
          background: rgba(255,255,255,0.9);
          transition: background 0.15s ease, transform 0.15s ease;
        }
        #nearby_search_results button:hover {
          background: rgba(241,245,249,0.95);
        }
        #nearby_search_results a {
          color: #0f172a;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default MapPage;
