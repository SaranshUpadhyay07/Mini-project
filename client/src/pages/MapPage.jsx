import { useEffect, useRef, useState } from 'react';
import { NavbarDemo } from '../components/Navbar';
import { IconMapPin, IconRoute, IconCurrentLocation } from '@tabler/icons-react';

// Pilgrim locations in Odisha
const pilgrimLocations = [
  { name: 'Jagannath Temple, Puri', lat: 19.8135, lng: 85.8312, type: 'Temple' },
  { name: 'Konark Sun Temple', lat: 19.8876, lng: 86.0945, type: 'Temple' },
  { name: 'Lingaraj Temple, Bhubaneswar', lat: 20.2379, lng: 85.8338, type: 'Temple' },
  { name: 'Chilika Lake', lat: 19.7197, lng: 85.3579, type: 'Lake' },
  { name: 'Dhauli Shanti Stupa', lat: 20.1896, lng: 85.8503, type: 'Stupa' },
  { name: 'Mukteswara Temple, Bhubaneswar', lat: 20.2431, lng: 85.8349, type: 'Temple' },
  { name: 'Rajarani Temple, Bhubaneswar', lat: 20.2464, lng: 85.8510, type: 'Temple' },
  { name: 'Udayagiri Caves', lat: 20.2644, lng: 85.7850, type: 'Caves' },
  { name: 'Raghurajpur Crafts Village', lat: 19.8889, lng: 85.8667, type: 'Village' },
  { name: 'Bindusagar Lake, Bhubaneswar', lat: 20.2399, lng: 85.8341, type: 'Lake' },
];

const MapPage = () => {
  const mapInstance = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Get the actual Mappls key from environment
  const MAPPLS_KEY = import.meta.env.VITE_MAPPLS_API_KEY;

  useEffect(() => {
    // Validate API key exists
    if (!MAPPLS_KEY || MAPPLS_KEY === '<Static Key>') {
      setError('Invalid Mappls API key. Please check your .env file.');
      setLoading(false);
      return;
    }

    // Load Mappls Web SDK
    const script = document.createElement('script');
    script.src = `https://sdk.mappls.com/map/sdk/web?v=3.0&access_token=${MAPPLS_KEY}`;
    script.async = true;
    
    script.onload = () => {
      console.log('Mappls SDK loaded successfully');
      setScriptLoaded(true);
      // Wait for DOM to be ready
      setTimeout(() => {
        initializeMap();
      }, 100);
    };

    script.onerror = () => {
      setError('Failed to load Mappls SDK. Please check your API key and internet connection.');
      setLoading(false);
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      if (mapInstance.current) {
        mapInstance.current.remove();
      }
    };
  }, [MAPPLS_KEY]);

  const initializeMap = () => {
    try {
      // Check if Mappls SDK is available
      if (!window.mappls) {
        console.error('Mappls SDK not loaded');
        setError('Mappls SDK not available');
        setLoading(false);
        return;
      }

      // Check if container exists
      const container = document.getElementById('mappls-map');
      if (!container) {
        console.error('Map container not found');
        setError('Map container not ready');
        setLoading(false);
        return;
      }

      console.log('Initializing Mappls map...');

      // Initialize map - Center on Odisha (Bhubaneswar)
      mapInstance.current = new window.mappls.Map('mappls-map', {
        center: { lat: 20.2961, lng: 85.8245 },
        zoom: 8,
        zoomControl: true,
        location: true,
      });

      // Wait for map to load, then add markers
      mapInstance.current.on('load', () => {
        console.log('Map loaded successfully');
        addMarkers();
        setLoading(false);
      });

    } catch (err) {
      console.error('Map initialization error:', err);
      setError(`Failed to initialize map: ${err.message}`);
      setLoading(false);
    }
  };

  const addMarkers = () => {
    if (!window.mappls || !mapInstance.current) {
      console.error('Cannot add markers: SDK or map not ready');
      return;
    }

    try {
      pilgrimLocations.forEach((location) => {
        // Use Mappls Marker API (NOT Mapbox style)
        const marker = new window.mappls.Marker({
          map: mapInstance.current,
          position: { lat: location.lat, lng: location.lng },
          title: location.name,
        });

        // Add click listener if supported
        if (marker.addListener) {
          marker.addListener('click', () => {
            setSelectedLocation(location);
            mapInstance.current.setCenter({ lat: location.lat, lng: location.lng });
            mapInstance.current.setZoom(12);
          });
        }
      });

      console.log(`Added ${pilgrimLocations.length} markers to map`);
    } catch (err) {
      console.error('Error adding markers:', err);
    }
  };

  const centerOnLocation = (location) => {
    if (mapInstance.current) {
      mapInstance.current.setCenter({ lat: location.lat, lng: location.lng });
      mapInstance.current.setZoom(14);
      setSelectedLocation(location);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (mapInstance.current) {
            mapInstance.current.setCenter({ lat: latitude, lng: longitude });
            mapInstance.current.setZoom(12);
            
            // Add marker for current location using Mappls API
            new window.mappls.Marker({
              map: mapInstance.current,
              position: { lat: latitude, lng: longitude },
              title: 'Your Location',
            });
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your current location');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavbarDemo />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Explore Odisha Pilgrim Sites
          </h1>
          <p className="text-gray-600">
            Discover sacred temples, historical sites, and cultural landmarks across Odisha
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar with location list */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-4 max-h-[600px] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Locations</h2>
                <button
                  onClick={getCurrentLocation}
                  className="p-2 bg-[#f4622d] text-white rounded-lg hover:bg-[#fa4909] transition-colors"
                  title="My Location"
                >
                  <IconCurrentLocation size={20} />
                </button>
              </div>
              
              <div className="space-y-3">
                {pilgrimLocations.map((location, index) => (
                  <div
                    key={index}
                    onClick={() => centerOnLocation(location)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedLocation?.name === location.name
                        ? 'bg-[#f4622d] text-white'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-800'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <IconMapPin
                        size={20}
                        className={`flex-shrink-0 mt-1 ${
                          selectedLocation?.name === location.name
                            ? 'text-white'
                            : 'text-[#f4622d]'
                        }`}
                      />
                      <div>
                        <h3 className="font-semibold text-sm">{location.name}</h3>
                        <p
                          className={`text-xs ${
                            selectedLocation?.name === location.name
                              ? 'text-white/80'
                              : 'text-gray-500'
                          }`}
                        >
                          {location.type}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Map Container */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              {loading && (
                <div className="h-[600px] flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f4622d] mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading map...</p>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="h-[600px] flex items-center justify-center">
                  <div className="text-center text-red-600">
                    <p className="text-xl font-semibold mb-2">Error</p>
                    <p>{error}</p>
                    <p className="text-sm mt-2 text-gray-600">
                      Please check your Mappls API key in the .env file
                    </p>
                  </div>
                </div>
              )}
              
              {/* CRITICAL: Container must have position: relative for Mappls */}
              <div
                id="mappls-map"
                style={{ 
                  width: '100%', 
                  height: '600px', 
                  position: 'relative',
                  display: loading || error ? 'none' : 'block'
                }}
              />
              
              {selectedLocation && !loading && !error && (
                <div className="p-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        {selectedLocation.name}
                      </h3>
                      <p className="text-sm text-gray-600">{selectedLocation.type}</p>
                    </div>
                    <button
                      onClick={() => {
                        if (mapInstance.current) {
                          mapInstance.current.setCenter({ lat: selectedLocation.lat, lng: selectedLocation.lng });
                          mapInstance.current.setZoom(16);
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-[#f4622d] text-white rounded-lg hover:bg-[#fa4909] transition-colors"
                    >
                      <IconRoute size={18} />
                      View Details
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPage;
