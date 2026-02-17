import { useEffect, useRef, useState } from 'react';
import { subscribeToLocationUpdates } from '../services/socket';

/**
 * FamilyMap - Real-time Tracking with WebSockets
 * Architecture: Zero re-renders on location updates
 * - Map instance stored in useRef (persistent)
 * - Socket events directly call Mappls trackingCall()
 * - Only UI overlays (distance/ETA) use useState
 */

const FamilyMap = ({ member, currentUser, familyId, onClose }) => {
  // REFS - Persistent, never cause re-renders
  const mapContainerRef = useRef(null);
  const mapInstance = useRef(null);
  const trackingPluginRef = useRef(null);
  const isMapInitialized = useRef(false);
  const unsubscribeRef = useRef(null);

  // STATE - Only for UI overlays
  const [metrics, setMetrics] = useState({ distance: null, eta: null });
  const [status, setStatus] = useState('Connecting to Live Server...');

  const MAPPLS_KEY = import.meta.env.VITE_MAPPLS_API_KEY;
  const MAP_DIV_ID = 'mappls-realtime-map';

  // ═══════════════════════════════════════════════════════════════
  // ONE-TIME INITIALIZATION - Socket-based, no polling
  // ═══════════════════════════════════════════════════════════════
  
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      console.log('🎬 Initializing Real-time Map...');
      
      try {
        // 1. Load Mappls Scripts
        if (!window.mappls) {
          setStatus('Loading Map SDK...');
          await loadMapplsScript();
          await loadTrackingScript();
        }

        // 2. Initialize Map
        if (!isMapInitialized.current && isMounted) {
          await initializeMap();
        }

        // 3. Subscribe to Socket Updates
        setupSocketListener();

      } catch (error) {
        console.error('Initialization error:', error);
        setStatus('Error: ' + error.message);
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
      const script = document.createElement('script');
      script.src = `https://sdk.mappls.com/map/sdk/web?v=3.0&access_token=${MAPPLS_KEY}`;
      script.async = true;
      script.onload = () => {
        setTimeout(resolve, 500); // Wait for globals to be ready
      };
      script.onerror = () => reject(new Error('Failed to load Mappls SDK'));
      document.head.appendChild(script);
    });
  };

  const loadTrackingScript = () => {
    return new Promise((resolve, reject) => {
      if (window.mappls?.tracking) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = `https://sdk.mappls.com/map/sdk/plugins?v=3.0&libraries=tracking&access_token=${MAPPLS_KEY}`;
      script.async = true;
      script.onload = () => {
        setTimeout(resolve, 500);
      };
      script.onerror = () => reject(new Error('Failed to load Tracking Plugin'));
      document.head.appendChild(script);
    });
  };

  const cleanup = () => {
    console.log('🧹 Cleaning up Real-time Map...');

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
        console.warn('Tracking cleanup warning:', e);
      }
    }

    // Remove map
    if (mapInstance.current) {
      try {
        if (mapInstance.current.remove) {
          mapInstance.current.remove();
        }
      } catch (e) {
        console.warn('Map cleanup warning:', e);
      }
      mapInstance.current = null;
    }

    isMapInitialized.current = false;
  };

  // ═══════════════════════════════════════════════════════════════
  // MAP INITIALIZATION WITH SOCKET
  // ═══════════════════════════════════════════════════════════════

  const initializeMap = async () => {
    if (!mapContainerRef.current || !window.mappls?.Map) {
      throw new Error('Map prerequisites not met');
    }

    try {
      console.log('🗺️ Initializing map with member data:', member.userId);
      
      // Get Member's Position (The one we're tracking - MOVING marker)
      const memberCoords = member?.userId?.currentLocation?.coordinates;
      if (!memberCoords || memberCoords.length !== 2) {
        throw new Error(`Member location not available. Location data: ${JSON.stringify(member?.userId?.currentLocation)}`);
      }
      const [memberLng, memberLat] = memberCoords;
      
      console.log(`📍 Member location: Lat=${memberLat}, Lng=${memberLng}`);
      console.log(`👤 Member Firebase UID: ${member.userId.firebaseUid}`);
      console.log(`📱 Member is sharing location: ${member.userId.isSharingLocation}`);

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
              maximumAge: 0
            });
          });
          myLat = position.coords.latitude;
          myLng = position.coords.longitude;
          console.log(`📍 Your location: Lat=${myLat}, Lng=${myLng}`);
        } catch (geoError) {
          console.warn('⚠️ Could not get your location, using default:', geoError.message);
        }
      }

      console.log('🗺️ Creating map...');
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
        mapInstance.current.addListener('load', () => {
          isMapInitialized.current = true;
          console.log('✅ Map loaded successfully');
          setStatus('Initializing tracking...');

          // Initialize Tracking Plugin
          // START = Member (moving source)
          // END = You (static destination)
          const trackingOptions = {
            map: mapInstance.current,
            start: {
              geoposition: `${memberLat},${memberLng}`,
              start_icon: {
                url: 'https://apis.mappls.com/map_v3/2.png', // Red marker for member
                width: 40,
                height: 40,
              },
            },
            end: {
              geoposition: `${myLat},${myLng}`,
              end_icon: {
                url: 'https://apis.mappls.com/map_v3/1.png', // Blue marker for you
                width: 35,
                height: 35,
              },
            },
            resource: 'route_eta',
            profile: 'driving',
            fitBounds: true,
            connector: true,
            strokeWidth: 6,
            routeColor: '#3B82F6',
            ccpIconWidth: 50,
          };

          window.mappls.tracking(trackingOptions, (data) => {
            if (!data || data.error) {
              console.error('❌ Tracking error:', data?.error);
              setStatus('Error initializing tracking');
              reject(new Error(data?.error || 'Tracking failed'));
              return;
            }

            trackingPluginRef.current = data;
            console.log('✅ Tracking plugin initialized');

            // Set initial metrics
            if (data.dis && data.dur) {
              setMetrics({
                distance: (data.dis / 1000).toFixed(2) + ' km',
                eta: Math.ceil(data.dur / 60) + ' mins',
              });
            }

            setStatus('🟢 Live Tracking Active');
            resolve();
          });
        });
      });

    } catch (error) {
      console.error('Map initialization error:', error);
      throw error;
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // 🚀 THE SWIGGY MAGIC 🚀 - Socket → Mappls API
  // ═══════════════════════════════════════════════════════════════

  const setupSocketListener = () => {
    const unsubscribe = subscribeToLocationUpdates((data) => {
      console.log('📍 Received location update:', data);
      console.log('🔍 Comparing with member firebaseUid:', member.userId.firebaseUid);
      
      // Only process updates for the member we're tracking
      // Compare using Firebase UID (not MongoDB _id)
      if (data.userId !== member.userId.firebaseUid) {
        console.log('⏭️ Skipping - different user');
        return;
      }

      console.log('✅ Match! Processing location update');
      handleLiveLocationUpdate(data);
    });

    // Store unsubscribe function for cleanup
    unsubscribeRef.current = unsubscribe;
  };

  const handleLiveLocationUpdate = (data) => {
    if (!trackingPluginRef.current || !trackingPluginRef.current.trackingCall) {
      console.warn('⚠️ Tracking plugin not ready');
      return;
    }

    console.log(`🚀 Real-time update: [${data.lat}, ${data.lng}], Heading: ${data.heading}°, Speed: ${data.speed}m/s`);

    try {
      // Mappls trackingCall() with real-time parameters from documentation
      trackingPluginRef.current.trackingCall({
        location: [data.lng, data.lat],   // [Lng, Lat] format (MANDATORY)
        reRoute: true,                    // Recalculate route if user deviates (OPTIONAL, default true)
        heading: true,                    // Rotate marker based on direction (OPTIONAL, default true)
        mapCenter: true,                  // Keep marker centered on map (OPTIONAL, default false) - For Swiggy-like experience
        polylineRefresh: true,            // Remove covered path (OPTIONAL, default true)
        buffer: 25,                       // 25m buffer before rerouting (OPTIONAL, default 25)
        etaRefresh: true,                 // Update ETA continuously (OPTIONAL, default false)
        delay: 2000,                      // 2 second smooth animation (OPTIONAL, default 5000)
        fitBounds: true,                  // Auto-fit map to show route (OPTIONAL, default true)
        smoothFitBounds: 'med',           // Medium smooth fitbound (OPTIONAL) - every 3 interpolated locations
        fitboundsOptions: {
          padding: 100,                   // Padding around route (OPTIONAL)
        },
        fitCoverDistance: true,           // Include last movement in fitBounds (OPTIONAL, default false)
        latentViz: false,                 // Smooth viz on sudden location jump (OPTIONAL, default false)
        callback: (response) => {
          // Update UI metrics from Mappls response
          if (response && response.dis && response.dur) {
            setMetrics({
              distance: (response.dis / 1000).toFixed(2) + ' km',
              eta: Math.ceil(response.dur / 60) + ' mins',
            });
            console.log(`   📏 ${(response.dis / 1000).toFixed(2)} km | ⏱️ ${Math.ceil(response.dur / 60)} mins`);
          }
        },
      });

      // Optional: Rotate map to match device orientation (First-person view)
      // Uncomment if you want the map to physically rotate with device compass
      /*
      if (data.heading && mapInstance.current && mapInstance.current.setBearing) {
        mapInstance.current.setBearing(data.heading, {
          duration: 2000, // 2 second rotation animation
        });
        console.log(`🧭 Map rotated to heading: ${data.heading}°`);
      }
      */

    } catch (error) {
      console.error('❌ trackingCall error:', error);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER - Modern Overlay UI
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="bg-white/95 backdrop-blur-md shadow-lg rounded-xl p-4 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-lg">{member.userId.name}</h2>
            <div className="text-sm text-gray-600 flex gap-4 mt-1">
              <span className={status.includes('Live') ? 'text-green-600 font-semibold' : 'text-gray-500'}>
                {status}
              </span>
              {metrics.distance && (
                <span className="font-medium">📍 {metrics.distance}</span>
              )}
              {metrics.eta && (
                <span className="font-medium">⏱️ {metrics.eta}</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg font-bold transition"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Map Container - Never re-rendered by React */}
      <div
        ref={mapContainerRef}
        style={{ width: '100%', height: '100vh', position: 'relative' }}
      />

      {/* Footer Legend */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
        <div className="bg-white/95 backdrop-blur-md shadow-lg rounded-xl px-4 py-3 flex justify-center gap-6">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 bg-red-500 rounded-full"></span>
            <span className="text-sm font-medium">{member.userId.name} (Moving)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 bg-blue-500 rounded-full"></span>
            <span className="text-sm font-medium">You (Destination)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilyMap;
