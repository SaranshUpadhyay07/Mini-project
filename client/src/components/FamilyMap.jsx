import { useEffect, useRef, useState } from 'react';

const FamilyMap = ({ member, onClose }) => {
  const mapContainerRef = useRef(null);
  const mapInstance = useRef(null);
  const directionInstance = useRef(null);
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [error, setError] = useState('');
  const MAPPLS_KEY = import.meta.env.VITE_MAPPLS_API_KEY;

  useEffect(() => {
    loadMapAndNavigate();

    return () => {
      // Cleanup
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  const loadMapAndNavigate = () => {
    // Check if Mappls SDK is already loaded
    if (window.mappls && window.mappls.Map) {
      console.log('Mappls SDK already loaded');
      loadDirectionPlugin();
    } else {
      // Load Mappls SDK
      const script = document.createElement('script');
      script.src = `https://sdk.mappls.com/map/sdk/web?v=3.0&access_token=${MAPPLS_KEY}`;
      script.async = true;
      script.onload = () => {
        console.log('Mappls SDK loaded');
        loadDirectionPlugin();
      };
      script.onerror = () => {
        setError('Failed to load Mappls SDK');
      };
      document.head.appendChild(script);
    }
  };

  const loadDirectionPlugin = () => {
    // Check if direction plugin is already loaded
    if (window.mappls && window.mappls.direction) {
      console.log('Direction plugin already loaded');
      setTimeout(() => initMap(), 500);
      return;
    }

    // Check if script already exists
    if (document.querySelector('script[src*="sdk.mappls.com/map/sdk/plugins"]')) {
      console.log('Direction plugin script exists, waiting...');
      const checkPlugin = setInterval(() => {
        if (window.mappls && window.mappls.direction) {
          clearInterval(checkPlugin);
          setTimeout(() => initMap(), 500);
        }
      }, 200);
      setTimeout(() => clearInterval(checkPlugin), 10000);
      return;
    }

    // Load direction plugin
    const pluginScript = document.createElement('script');
    pluginScript.src = `https://sdk.mappls.com/map/sdk/plugins?v=3.0&libraries=direction&access_token=${MAPPLS_KEY}`;
    pluginScript.async = true;
    pluginScript.onload = () => {
      console.log('Direction plugin loaded');
      setTimeout(() => initMap(), 500);
    };
    pluginScript.onerror = () => {
      setError('Failed to load Direction plugin');
    };
    document.head.appendChild(pluginScript);
  };

  const initMap = () => {
    if (!window.mappls || !window.mappls.Map) {
      console.error('Mappls SDK not available');
      setError('Map SDK not loaded');
      return;
    }

    if (!mapContainerRef.current) {
      console.error('Map container not available');
      return;
    }

    try {
      // Get member's location
      const memberLocation = member.userId.currentLocation;
      if (!memberLocation || !memberLocation.coordinates) {
        setError('Member location not available');
        return;
      }

      const [memberLng, memberLat] = memberLocation.coordinates;

      // Create map centered on member's location
      const containerId = `family-map-${Math.random().toString(36).substr(2, 9)}`;
      mapContainerRef.current.id = containerId;

      const map = new window.mappls.Map(containerId, {
        center: [memberLng, memberLat],
        zoom: 15,
        zoomControl: true,
        location: true,
      });

      map.on('load', () => {
        console.log('Map loaded successfully');
        mapInstance.current = map;

        // Add marker for member
        new window.mappls.Marker({
          map: map,
          position: [memberLng, memberLat],
          title: member.userId.name,
          icon: createMemberIcon(),
        });

        // Get current position and start navigation
        getCurrentPositionAndNavigate(memberLat, memberLng);
      });
    } catch (error) {
      console.error('Error initializing map:', error);
      setError('Failed to initialize map');
    }
  };

  const createMemberIcon = () => {
    // Create custom icon for member marker
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    
    // Draw circle
    ctx.beginPath();
    ctx.arc(20, 20, 18, 0, 2 * Math.PI);
    ctx.fillStyle = '#3B82F6';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Draw person icon
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(member.userId.name.charAt(0).toUpperCase(), 20, 20);
    
    return canvas.toDataURL();
  };

  const getCurrentPositionAndNavigate = (destLat, destLng) => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentLat = position.coords.latitude;
        const currentLng = position.coords.longitude;
        
        setCurrentPosition({ lat: currentLat, lng: currentLng });

        // Add marker for current position
        new window.mappls.Marker({
          map: mapInstance.current,
          position: [currentLng, currentLat],
          title: 'Your Location',
          icon: createCurrentLocationIcon(),
        });

        // Fit bounds to show both markers
        mapInstance.current.fitBounds([
          [currentLng, currentLat],
          [destLng, destLat],
        ], { padding: 50 });

        // Start navigation
        startNavigation(currentLat, currentLng, destLat, destLng);
      },
      (error) => {
        console.error('Error getting current position:', error);
        setError('Could not get your location');
      },
      { enableHighAccuracy: true }
    );
  };

  const createCurrentLocationIcon = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 24;
    const ctx = canvas.getContext('2d');
    
    // Draw blue dot
    ctx.beginPath();
    ctx.arc(12, 12, 10, 0, 2 * Math.PI);
    ctx.fillStyle = '#4285F4';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    return canvas.toDataURL();
  };

  const startNavigation = (startLat, startLng, endLat, endLng) => {
    if (!window.mappls || !window.mappls.direction) {
      setError('Direction plugin not loaded');
      return;
    }

    try {
      // Initialize direction service
      const directionOptions = {
        map: mapInstance.current,
        start: `${startLng},${startLat}`,
        end: `${endLng},${endLat}`,
        via: null,
        divWidth: '350px',
        isDraggable: false,
        padding: 50,
      };

      directionInstance.current = window.mappls.direction(directionOptions);

      console.log('Navigation started');
    } catch (error) {
      console.error('Error starting navigation:', error);
      setError('Failed to start navigation');
    }
  };

  const startTracking = () => {
    if (!window.mappls || !directionInstance.current) {
      setError('Navigation not initialized');
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    setIsTracking(true);

    // Watch position for live tracking
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        setCurrentPosition({ lat, lng });

        // Update tracking
        if (directionInstance.current && directionInstance.current.tracking) {
          const memberLocation = member.userId.currentLocation.coordinates;
          
          directionInstance.current.tracking({
            map: mapInstance.current,
            location: `${lat},${lng}`,
            label: 'Your Location',
            heading: true,
            reRoute: true,
            fitbounds: true,
            animationSpeed: 5,
          }, (data) => {
            console.log('Tracking update:', data);
          });
        }
      },
      (error) => {
        console.error('Tracking error:', error);
        setError('Error tracking location');
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );

    // Store watchId for cleanup
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  };

  const calculateDistance = () => {
    if (!currentPosition || !member.userId.currentLocation) return null;

    const [memberLng, memberLat] = member.userId.currentLocation.coordinates;
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (currentPosition.lat * Math.PI) / 180;
    const φ2 = (memberLat * Math.PI) / 180;
    const Δφ = ((memberLat - currentPosition.lat) * Math.PI) / 180;
    const Δλ = ((memberLng - currentPosition.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c); // Distance in meters
  };

  const distance = calculateDistance();

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 shadow-lg">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div>
            <h2 className="text-2xl font-bold">Navigate to {member.userId.name}</h2>
            <p className="text-sm opacity-90">Member ID: {member.memberId}</p>
            {distance && (
              <p className="text-sm font-semibold mt-1">📍 Distance: {distance}m</p>
            )}
          </div>
          <div className="flex gap-2">
            {!isTracking ? (
              <button
                onClick={startTracking}
                className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded font-semibold"
              >
                🎯 Start Live Tracking
              </button>
            ) : (
              <span className="bg-green-500 px-4 py-2 rounded font-semibold">
                📍 Tracking Active
              </span>
            )}
            <button
              onClick={onClose}
              className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded font-semibold"
            >
              ✕ Close
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mx-4 mt-4 rounded">
          {error}
        </div>
      )}

      {/* Map Container */}
      <div ref={mapContainerRef} className="flex-1" />

      {/* Info Panel */}
      <div className="bg-gray-100 p-4 border-t border-gray-300">
        <div className="max-w-6xl mx-auto">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Last updated:</span>{' '}
            {member.userId.lastLocationUpdate
              ? new Date(member.userId.lastLocationUpdate).toLocaleString()
              : 'Never'}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            💡 Tip: Enable "Start Live Tracking" for real-time navigation with route updates
          </p>
        </div>
      </div>
    </div>
  );
};

export default FamilyMap;
