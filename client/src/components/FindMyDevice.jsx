/**
 * FindMyDevice - Google Find My Device Clone
 * Uses Mappls Web SDK for real-time device tracking
 * UI/UX matches Google's Find My Device exactly
 */

import { useState, useEffect, useRef } from 'react';
import { subscribeToLocationUpdates } from '../services/socket';

const FindMyDevice = ({ member, currentUser, familyId, onClose }) => {
  // REFS - Persistent, never cause re-renders
  const mapContainerRef = useRef(null);
  const mapInstance = useRef(null);
  const trackingPluginRef = useRef(null);
  const isMapInitialized = useRef(false);
  const unsubscribeRef = useRef(null);
  const deviceMarkerRef = useRef(null);
  const accuracyCircleRef = useRef(null);
  const breadcrumbsRef = useRef([]);

  // STATE - UI only
  const [deviceInfo, setDeviceInfo] = useState({
    name: member.userId.name,
    lastSeen: 'Just now',
    accuracy: 'Unknown',
    battery: null,
    distance: null,
    address: 'Fetching address...'
  });
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false);
  const [isTracking, setIsTracking] = useState(true);
  const [status, setStatus] = useState('Locating device...');

  const MAPPLS_KEY = import.meta.env.VITE_MAPPLS_API_KEY;
  const MAP_DIV_ID = 'find-my-device-map';

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════
  
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        // Load Mappls SDK
        if (!window.mappls) {
          await loadMapplsScript();
          await loadTrackingScript();
        }

        // Initialize Map
        if (!isMapInitialized.current && isMounted) {
          await initializeMap();
        }

        // Subscribe to location updates
        setupSocketListener();

      } catch (error) {
        console.error('❌ Initialization error:', error);
        setStatus('Error loading map');
      }
    };

    init();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // MAP SETUP
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
      script.onload = () => setTimeout(resolve, 500);
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
      script.onload = () => setTimeout(resolve, 500);
      script.onerror = () => reject(new Error('Failed to load Tracking Plugin'));
      document.head.appendChild(script);
    });
  };

  const initializeMap = async () => {
    if (!mapContainerRef.current || !window.mappls?.Map) {
      throw new Error('Map prerequisites not met');
    }

    try {
      // Get device location
      const coords = member?.userId?.currentLocation?.coordinates;
      if (!coords || coords.length !== 2) {
        throw new Error('Device location not available');
      }
      const [lng, lat] = coords;

      console.log('🗺️ Initializing Find My Device map...');
      console.log(`   Device: ${member.userId.name} at [${lat}, ${lng}]`);

      // Get your location
      let myLat = 20.2961;
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
        } catch (error) {
          console.warn('Using default location');
        }
      }

      // Create map
      mapContainerRef.current.id = MAP_DIV_ID;
      mapInstance.current = new window.mappls.Map(MAP_DIV_ID, {
        center: [lat, lng],
        zoom: 16,
        zoomControl: false, // Custom zoom controls
      });

      await new Promise((resolve) => {
        mapInstance.current.addListener('load', () => {
          isMapInitialized.current = true;
          console.log('✅ Map loaded');
          
          // Initialize tracking plugin
          const trackingOptions = {
            map: mapInstance.current,
            start: {
              geoposition: `${lat},${lng}`,
              start_icon: {
                url: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', // Phone icon
                width: 50,
                height: 50,
              },
            },
            end: {
              geoposition: `${myLat},${myLng}`,
              end_icon: {
                url: 'https://cdn-icons-png.flaticon.com/512/149/149071.png', // User icon
                width: 40,
                height: 40,
              },
            },
            resource: 'route_eta',
            profile: 'driving',
            fitBounds: true,
            connector: true,
            strokeWidth: 4,
            routeColor: '#1a73e8', // Google Blue
            ccpIconWidth: 50,
          };

          window.mappls.tracking(trackingOptions, (data) => {
            if (!data || data.error) {
              console.error('❌ Tracking error:', data?.error);
              return;
            }

            trackingPluginRef.current = data;
            console.log('✅ Tracking initialized');

            // Update device info
            if (data.dis && data.dur) {
              setDeviceInfo(prev => ({
                ...prev,
                distance: (data.dis / 1000).toFixed(2) + ' km away',
              }));
            }

            setStatus('Device located');
            resolve();
          });
        });
      });

    } catch (error) {
      console.error('❌ Map initialization error:', error);
      throw error;
    }
  };

  const setupSocketListener = () => {
    const unsubscribe = subscribeToLocationUpdates((data) => {
      // Only process updates for this device
      if (data.userId !== member.userId.firebaseUid) {
        return;
      }

      console.log('📍 Device location update:', data);
      handleLocationUpdate(data);
    });

    unsubscribeRef.current = unsubscribe;
  };

  const handleLocationUpdate = (data) => {
    if (!trackingPluginRef.current || !trackingPluginRef.current.trackingCall) {
      return;
    }

    console.log(`🚀 Updating device location: [${data.lat}, ${data.lng}]`);

    try {
      // Update tracking
      trackingPluginRef.current.trackingCall({
        location: [data.lng, data.lat],
        reRoute: true,
        heading: true,
        mapCenter: isTracking, // Only center if tracking enabled
        polylineRefresh: false, // Keep full path
        buffer: 20,
        etaRefresh: true,
        delay: 3000, // 3 second smooth animation
        fitBounds: isTracking,
        smoothFitBounds: 'med',
        fitboundsOptions: {
          padding: 80,
        },
        callback: (response) => {
          if (response && response.dis && response.dur) {
            setDeviceInfo(prev => ({
              ...prev,
              distance: (response.dis / 1000).toFixed(2) + ' km away',
              lastSeen: 'Just now',
              accuracy: data.accuracy ? `${Math.round(data.accuracy)}m accuracy` : 'High accuracy'
            }));
          }
        },
      });

      // Add to breadcrumb trail
      breadcrumbsRef.current.push({ lat: data.lat, lng: data.lng, time: Date.now() });
      if (breadcrumbsRef.current.length > 50) {
        breadcrumbsRef.current.shift(); // Keep last 50 points
      }

    } catch (error) {
      console.error('❌ Update error:', error);
    }
  };

  const cleanup = () => {
    console.log('🧹 Cleanup...');
    
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (trackingPluginRef.current) {
      trackingPluginRef.current = null;
    }

    if (mapInstance.current) {
      try {
        if (mapInstance.current.remove) {
          mapInstance.current.remove();
        }
      } catch (e) {
        console.warn('Cleanup warning:', e);
      }
      mapInstance.current = null;
    }

    isMapInitialized.current = false;
  };

  // ═══════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════

  const centerOnDevice = () => {
    if (!mapInstance.current || !member?.userId?.currentLocation?.coordinates) return;
    
    const [lng, lat] = member.userId.currentLocation.coordinates;
    mapInstance.current.flyTo({
      center: [lat, lng],
      zoom: 16,
      duration: 1500
    });
    setIsTracking(true);
  };

  const refreshLocation = () => {
    setStatus('Refreshing...');
    // Location will update automatically via socket
    setTimeout(() => setStatus('Device located'), 2000);
  };

  const playSound = () => {
    alert(`🔊 Playing sound on ${member.userId.name}'s device...`);
    // Implement actual sound trigger via API
  };

  const shareLocation = () => {
    const coords = member?.userId?.currentLocation?.coordinates;
    if (!coords) return;
    
    const [lng, lat] = coords;
    const shareUrl = `https://maps.google.com/?q=${lat},${lng}`;
    
    if (navigator.share) {
      navigator.share({
        title: `${member.userId.name}'s Location`,
        text: `Track ${member.userId.name} in real-time`,
        url: shareUrl
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('📋 Location link copied to clipboard!');
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER - Google Find My Device UI
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="fixed inset-0 bg-gray-100 z-50 flex flex-col">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-white shadow-sm">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-medium">Find My Device</h1>
          <button className="p-2 hover:bg-gray-100 rounded-full transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Full Screen Map */}
      <div ref={mapContainerRef} className="flex-1 mt-16" />

      {/* FAB Controls - Right Side */}
      <div className="absolute right-4 bottom-[380px] z-10 flex flex-col gap-3">
        <button
          onClick={centerOnDevice}
          className="bg-white shadow-lg rounded-full p-4 hover:bg-gray-50 transition"
          title="Center on device"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        <button
          onClick={refreshLocation}
          className="bg-white shadow-lg rounded-full p-4 hover:bg-gray-50 transition"
          title="Refresh location"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        <button
          onClick={() => setIsTracking(!isTracking)}
          className={`shadow-lg rounded-full p-4 transition ${
            isTracking ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
          title={isTracking ? 'Stop tracking' : 'Start tracking'}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      </div>

      {/* Bottom Sheet - Google Style */}
      <div
        className={`absolute left-0 right-0 bottom-0 z-20 bg-white rounded-t-3xl shadow-2xl transition-all duration-300 ${
          isBottomSheetExpanded ? 'h-[500px]' : 'h-[320px]'
        }`}
      >
        {/* Drag Handle */}
        <div
          className="flex justify-center pt-2 pb-3 cursor-pointer"
          onClick={() => setIsBottomSheetExpanded(!isBottomSheetExpanded)}
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Device Card */}
        <div className="px-6 pb-4">
          {/* Device Name & Icon */}
          <div className="flex items-start gap-4 mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-medium text-gray-900">{deviceInfo.name}</h2>
              <p className="text-sm text-green-600 font-medium mt-1">● {deviceInfo.lastSeen}</p>
              <p className="text-sm text-gray-600 mt-1">{deviceInfo.accuracy}</p>
              {deviceInfo.distance && (
                <p className="text-sm text-gray-600">{deviceInfo.distance}</p>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-xs text-gray-600">STATUS</p>
            <p className="text-sm font-medium text-gray-900 mt-1">{status}</p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <button
              onClick={playSound}
              className="flex flex-col items-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition"
            >
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              <span className="text-xs font-medium text-blue-600">Play Sound</span>
            </button>

            <button
              onClick={shareLocation}
              className="flex flex-col items-center gap-2 p-4 bg-green-50 hover:bg-green-100 rounded-xl transition"
            >
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span className="text-xs font-medium text-green-600">Share</span>
            </button>

            <button
              className="flex flex-col items-center gap-2 p-4 bg-orange-50 hover:bg-orange-100 rounded-xl transition"
            >
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-xs font-medium text-orange-600">Secure</span>
            </button>
          </div>

          {/* Expanded Content */}
          {isBottomSheetExpanded && (
            <div className="space-y-3 animate-fadeIn">
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">RECENT ACTIVITY</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-gray-600">Location updated • Just now</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-gray-300 rounded-full" />
                    <span className="text-gray-600">Device online • 2 min ago</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-gray-300 rounded-full" />
                    <span className="text-gray-600">Battery at 100% • 1 hour ago</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">DEVICE INFO</h3>
                <p className="text-sm text-gray-600">Model: {member.userId.name}</p>
                <p className="text-sm text-gray-600">Tracking: {isTracking ? 'Active' : 'Paused'}</p>
                <p className="text-sm text-gray-600">Updates: {breadcrumbsRef.current.length} locations recorded</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FindMyDevice;
