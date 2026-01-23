import React, { useEffect, useRef, useState } from 'react';
import { IconMapPin, IconX, IconRoute, IconCurrentLocation, IconSearch, IconChevronDown, IconChevronUp, IconAlertCircle, IconCheck, IconHome, IconNavigation } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

const MapPage = () => {
  const navigate = useNavigate();
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [locationDetails, setLocationDetails] = useState(null);
  const [currentUserLocation, setCurrentUserLocation] = useState(null);
  const [currentLocationMarker, setCurrentLocationMarker] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [searchCity, setSearchCity] = useState('Bhubaneswar');
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(true);
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const nearbyPluginRef = useRef(null);
  const directionPluginRef = useRef(null);
  const nearbyContainerRef = useRef(null);
  const isInitialized = useRef(false);
  const lastSearchCity = useRef(null);

  const MAPPLS_KEY = import.meta.env.VITE_MAPPLS_API_KEY;

  // City coordinates for searching
  const cityCoordinates = {
    'Bhubaneswar': { lat: 20.2961, lng: 85.8245 },
    'Puri': { lat: 19.8135, lng: 85.8312 },
    'Konark': { lat: 19.8876, lng: 86.0945 }
  };

  // Show notification helper
  const showNotification = (message, type = 'info', duration = 4000) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), duration);
  };

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const loadMapplsSDK = () => {
      if (window.mappls && window.mappls.Map && window.mappls.nearby) {
        console.log('Mappls SDK and plugins already loaded');
        setTimeout(initializeMap, 100);
        return;
      }

      if (window.mappls && window.mappls.Map && !window.mappls.nearby) {
        console.log('Mappls SDK loaded, but nearby plugin missing. Loading plugins...');
        loadPlugins();
        return;
      }

      const existingSDK = document.querySelector('script[src*="sdk.mappls.com/map/sdk/web"]');
      
      if (existingSDK) {
        console.log('Mappls SDK script exists, waiting for it to load...');
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

      console.log('Loading Mappls SDK fresh...');
      const script = document.createElement('script');
      script.src = `https://sdk.mappls.com/map/sdk/web?v=3.0&access_token=${MAPPLS_KEY}`;
      script.async = true;
      script.onload = () => {
        console.log('Mappls SDK loaded');
        loadPlugins();
      };
      script.onerror = () => {
        console.error('Failed to load Mappls SDK');
        showNotification('Failed to load map. Please refresh.', 'error');
      };
      document.head.appendChild(script);
    };

    const loadPlugins = () => {
      if (window.mappls && window.mappls.nearby) {
        console.log('Plugins already available');
        setTimeout(initializeMap, 100);
        return;
      }

      const existingPlugin = document.querySelector('script[src*="sdk.mappls.com/map/sdk/plugins"]');
      if (existingPlugin) {
        console.log('Plugin script exists, waiting...');
        const checkPlugins = setInterval(() => {
          if (window.mappls && window.mappls.nearby) {
            clearInterval(checkPlugins);
            setTimeout(initializeMap, 100);
          }
        }, 200);
        setTimeout(() => clearInterval(checkPlugins), 10000);
        return;
      }

      console.log('Loading Mappls plugins...');
      const pluginScript = document.createElement('script');
      pluginScript.src = `https://sdk.mappls.com/map/sdk/plugins?v=3.0&libraries=direction,nearby&access_token=${MAPPLS_KEY}`;
      pluginScript.async = true;
      pluginScript.onload = () => {
        console.log('Mappls plugins loaded');
        setTimeout(initializeMap, 300);
      };
      document.head.appendChild(pluginScript);
    };

    loadMapplsSDK();

    return () => {
      if (nearbyContainerRef.current) {
        nearbyContainerRef.current.innerHTML = '';
      }
    };
  }, []);

  const initializeMap = () => {
    console.log('initializeMap called, checking requirements...');
    console.log('mapContainerRef:', !!mapContainerRef.current);
    console.log('window.mappls:', !!window.mappls);
    console.log('window.mappls.Map:', !!(window.mappls && window.mappls.Map));
    console.log('window.mappls.nearby:', !!(window.mappls && window.mappls.nearby));

    if (!mapContainerRef.current) {
      console.error('Map container not ready');
      return;
    }
    
    if (!window.mappls || !window.mappls.Map) {
      console.error('Mappls SDK not ready');
      return;
    }

    if (mapInstanceRef.current) {
      console.log('Map already exists, searching...');
      setIsMapReady(true);
      if (window.mappls.nearby) {
        searchNearbyTemples('Bhubaneswar');
      }
      return;
    }

    const containerId = 'mappls-map-container';
    mapContainerRef.current.id = containerId;

    try {
      console.log('Creating new Mappls Map...');
      const map = new window.mappls.Map(containerId, {
        center: [85.85, 20.15],
        zoom: window.innerWidth < 768 ? 7 : 9,
        zoomControl: true,
        location: true
      });

      map.on('load', () => {
        console.log('Map load event fired!');
        mapInstanceRef.current = map;
        setIsMapReady(true);
        
        if (window.mappls && window.mappls.nearby) {
          console.log('Nearby plugin available, starting search...');
          searchNearbyTemples('Bhubaneswar');
        } else {
          console.warn('Nearby plugin not available yet');
        }
      });

    } catch (error) {
      console.error('Error initializing map:', error);
      showNotification('Failed to initialize map', 'error');
    }
  };

  const searchNearbyTemples = (city) => {
    if (!mapInstanceRef.current || !window.mappls || !window.mappls.nearby) {
      console.error('Map or nearby plugin not ready');
      return;
    }

    const coords = cityCoordinates[city];
    if (!coords) {
      console.error('Unknown city:', city);
      return;
    }

    if (lastSearchCity.current === city) {
      console.log(`Already showing results for ${city}`);
      return;
    }
    lastSearchCity.current = city;

    console.log(`Searching temples near ${city}...`);
    setSearchCity(city);

    if (nearbyContainerRef.current) {
      nearbyContainerRef.current.innerHTML = '';
    }
    if (nearbyPluginRef.current && nearbyPluginRef.current.remove) {
      try {
        nearbyPluginRef.current.remove();
      } catch (e) {
        console.log('Could not remove previous nearby:', e);
      }
    }

    const options = {
      divId: 'nearby_search_results',
      map: mapInstanceRef.current,
      keywords: 'temple',
      refLocation: [coords.lat, coords.lng],
      fitbounds: true,
      geolocation: true,
      click_callback: function(d) {
        if (d) {
          console.log('Clicked location:', d);
          const loc = {
            name: d.placeName,
            address: d.placeAddress,
            city: city,
            eLoc: d.eLoc,
            lat: parseFloat(d.latitude),
            lng: parseFloat(d.longitude),
            type: d.type || 'Temple'
          };
          setSelectedLocation(loc);
          setLocationDetails(loc);
          setShowDetailModal(true);
        }
      }
    };

    window.mappls.nearby(options, function(data) {
      console.log('Nearby search callback - results:', data);
      
      if (data && data.error === 'error-auth-failed') {
        console.error('Auth failed - check API key whitelisting and quotas');
        showNotification('Search failed. Please try again.', 'error');
        lastSearchCity.current = null;
        return;
      }
      
      nearbyPluginRef.current = data;
      if (data && data.data && data.data.length > 0) {
        showNotification(`Found ${data.data.length} temples near ${city}`, 'success');
      }
    });
  };

  const showRoute = (destination) => {
    if (!currentUserLocation) {
      showNotification('Please get your location first', 'error');
      return;
    }

    if (!mapInstanceRef.current || !window.mappls || !window.mappls.direction) {
      showNotification('Direction service not ready', 'error');
      return;
    }

    let startPoint, endPoint;
    
    if (currentUserLocation.lat && currentUserLocation.lng) {
      startPoint = `${currentUserLocation.lat},${currentUserLocation.lng}`;
    } else {
      showNotification('Invalid current location', 'error');
      return;
    }
    
    if (destination.eLoc) {
      endPoint = destination.eLoc;
      console.log('Using eLoc for routing:', endPoint);
    } else if (destination.lat && destination.lng) {
      endPoint = `${destination.lat},${destination.lng}`;
      console.log('Using lat,lng for routing:', endPoint);
    } else if (destination.latitude && destination.longitude) {
      endPoint = `${destination.latitude},${destination.longitude}`;
      console.log('Using latitude,longitude for routing:', endPoint);
    } else {
      showNotification('Invalid destination', 'error');
      return;
    }

    console.log('Routing from:', startPoint, 'to:', endPoint);
    setIsLoading(true);
    showNotification('Calculating route...', 'info');

    try {
      if (directionPluginRef.current && directionPluginRef.current.remove) {
        try { directionPluginRef.current.remove(); } catch (e) {}
      }

      const directionOptions = {
        map: mapInstanceRef.current,
        start: startPoint,
        end: endPoint,
        fitbounds: true,
        profile: 'driving',
        resource: 'route_adv',
        steps: true,
        stepPopup: false,
        search: false
      };

      window.mappls.direction(directionOptions, function(data) {
        setIsLoading(false);
        
        if (!data || data.error) {
          console.error('Direction failed:', data);
          if (data && data.error === 'error-auth-failed') {
            showNotification('Route service unavailable. Try again later.', 'error');
          } else {
            showNotification('Could not calculate route', 'error');
          }
          return;
        }

        console.log('Direction success:', data);
        directionPluginRef.current = data;
        
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const distance = (route.distance / 1000).toFixed(1);
          const duration = Math.round(route.duration / 60);
          showNotification(`${distance} km • ${duration} min drive`, 'success', 6000);
        }
      });
    } catch (error) {
      setIsLoading(false);
      console.error('Error showing route:', error);
      showNotification('Route calculation failed. Please try again.', 'error');
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      showNotification('Geolocation not supported', 'error');
      return;
    }

    setIsLoading(true);
    showNotification('Getting your location...', 'info');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLoading(false);
        const userLoc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        setCurrentUserLocation(userLoc);
        console.log('Current location:', userLoc);

        if (mapInstanceRef.current && window.mappls) {
          if (currentLocationMarker) {
            try { currentLocationMarker.remove(); } catch (e) {}
          }

          const marker = new window.mappls.Marker({
            map: mapInstanceRef.current,
            position: userLoc,
            title: 'Your Location',
            icon: {
              url: 'https://apis.mappls.com/map_v3/2.png',
              width: 35,
              height: 45
            }
          });

          setCurrentLocationMarker(marker);
          mapInstanceRef.current.setCenter(userLoc);
          mapInstanceRef.current.setZoom(13);
          showNotification('Location found!', 'success');
        }
      },
      (error) => {
        setIsLoading(false);
        console.error('Geolocation error:', error);
        showNotification('Could not get location. Enable GPS.', 'error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="w-full h-screen flex flex-col bg-slate-900 overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white px-4 py-3 flex items-center justify-between shadow-lg z-50 safe-area-top">
        <button 
          onClick={() => navigate('/')}
          className="p-2 -ml-2 hover:bg-white/20 rounded-full transition-colors"
        >
          <IconHome size={24} />
        </button>
        <div className="flex items-center gap-2">
          <IconMapPin size={24} />
          <h1 className="text-lg font-bold tracking-tight">Pilgrim Guide</h1>
        </div>
        <button 
          onClick={getCurrentLocation}
          className={`p-2 -mr-2 hover:bg-white/20 rounded-full transition-colors ${currentUserLocation ? 'text-green-300' : ''}`}
        >
          <IconCurrentLocation size={24} />
        </button>
      </header>

      {/* Notification Toast */}
      {notification && (
        <div className={`absolute top-16 left-4 right-4 z-50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-slide-down ${
          notification.type === 'error' ? 'bg-red-500 text-white' :
          notification.type === 'success' ? 'bg-green-500 text-white' :
          'bg-slate-800 text-white'
        }`}>
          {notification.type === 'error' && <IconAlertCircle size={24} />}
          {notification.type === 'success' && <IconCheck size={24} />}
          {notification.type === 'info' && <IconNavigation size={24} className="animate-pulse" />}
          <span className="font-medium text-sm flex-1">{notification.message}</span>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex lg:w-[420px] bg-white flex-col shadow-2xl z-20">
          {/* Header */}
          <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-4 rounded-2xl shadow-lg">
                <IconMapPin size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-black">Explore Odisha</h2>
                <p className="text-slate-300 text-sm mt-1">Discover sacred temples & shrines</p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="p-5 space-y-4 border-b border-slate-100 bg-slate-50">
            <button
              onClick={getCurrentLocation}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50"
            >
              <IconCurrentLocation size={22} className={isLoading ? 'animate-spin' : ''} />
              {currentUserLocation ? 'Location Set ✓' : 'Get My Location'}
            </button>

            <div>
              <p className="text-xs font-black text-slate-500 mb-3 uppercase tracking-widest">Select City</p>
              <div className="grid grid-cols-3 gap-3">
                {Object.keys(cityCoordinates).map((city) => (
                  <button
                    key={city}
                    onClick={() => searchNearbyTemples(city)}
                    className={`px-4 py-3.5 text-sm font-bold rounded-xl transition-all ${
                      searchCity === city
                        ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg transform scale-105'
                        : 'bg-white text-slate-700 hover:bg-slate-100 shadow border border-slate-200'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b sticky top-0 z-10">
              <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <IconSearch size={18} className="text-orange-600" />
                Temples near {searchCity}
              </p>
            </div>
            
            {!isMapReady && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 rounded-full border-4 border-orange-100"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-orange-500 border-t-transparent animate-spin"></div>
                  <div className="absolute inset-3 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" style={{animationDirection: 'reverse', animationDuration: '0.8s'}}></div>
                </div>
                <p className="mt-6 text-slate-600 font-semibold">Loading map...</p>
              </div>
            )}
            
            {/* Desktop nearby results - only visible on lg+ */}
            <div 
              id="nearby_search_results"
              ref={nearbyContainerRef}
              className="p-4"
              suppressHydrationWarning
            />
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          <div 
            ref={mapContainerRef} 
            className="w-full h-full absolute inset-0"
          />
        </div>

        {/* Mobile Bottom Sheet */}
        <div 
          className="lg:hidden fixed inset-x-0 bottom-0 z-40 transition-all duration-300 ease-out"
          style={{ 
            transform: isBottomSheetOpen ? 'translateY(0)' : 'translateY(calc(100% - 72px))',
            maxHeight: '65vh'
          }}
        >
          <div className="bg-white rounded-t-[28px] shadow-2xl flex flex-col h-full border-t-4 border-orange-500">
            {/* Handle */}
            <button
              onClick={() => setIsBottomSheetOpen(!isBottomSheetOpen)}
              className="w-full py-4 flex flex-col items-center gap-2 border-b border-slate-100 active:bg-slate-50"
            >
              <div className="w-14 h-1.5 bg-slate-300 rounded-full"></div>
              <div className="flex items-center gap-2 text-slate-600">
                {isBottomSheetOpen ? <IconChevronDown size={20} /> : <IconChevronUp size={20} />}
                <span className="font-bold text-sm">
                  {isBottomSheetOpen ? 'Swipe down to minimize' : 'Tap to explore temples'}
                </span>
              </div>
            </button>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Controls */}
              <div className="p-4 space-y-4 border-b border-slate-100 bg-slate-50">
                <button
                  onClick={getCurrentLocation}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-transform disabled:opacity-50"
                >
                  <IconCurrentLocation size={22} className={isLoading ? 'animate-spin' : ''} />
                  {currentUserLocation ? 'Location Set ✓' : 'Get My Location'}
                </button>

                <div>
                  <p className="text-xs font-black text-slate-500 mb-3 uppercase tracking-widest">Select City</p>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.keys(cityCoordinates).map((city) => (
                      <button
                        key={city}
                        onClick={() => searchNearbyTemples(city)}
                        className={`px-3 py-3 text-sm font-bold rounded-xl transition-all ${
                          searchCity === city
                            ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg'
                            : 'bg-white text-slate-700 active:bg-slate-100 shadow border border-slate-200'
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Results - Mobile shows same container via CSS */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-3 bg-gradient-to-r from-orange-50 to-amber-50 border-b sticky top-0 z-10">
                  <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <IconSearch size={18} className="text-orange-600" />
                    Near {searchCity}
                  </p>
                </div>
                
                {!isMapReady && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 rounded-full border-4 border-orange-100"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-orange-500 border-t-transparent animate-spin"></div>
                    </div>
                    <p className="mt-4 text-slate-600 text-sm font-semibold">Loading...</p>
                  </div>
                )}
                
                {/* Mobile nearby results - clone content from desktop via portal or show message */}
                <div className="p-3 text-center text-slate-500 text-sm">
                  <p>View temples on the map above</p>
                  <p className="text-xs mt-1">Tap markers to see details</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && locationDetails && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end lg:items-center justify-center z-50 p-0 lg:p-6">
          <div 
            className="bg-white w-full lg:max-w-md lg:rounded-3xl rounded-t-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] lg:max-h-[80vh]"
            style={{ animation: 'slideUp 0.3s ease-out' }}
          >
            {/* Header */}
            <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 p-6 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-transparent"></div>
              <div className="relative flex justify-between items-start">
                <div className="flex items-start gap-4 flex-1">
                  <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-4 rounded-2xl shadow-lg">
                    <span className="text-3xl">🕉️</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-black mb-1 leading-tight">{locationDetails.name}</h2>
                    <p className="text-slate-300 text-sm truncate">{locationDetails.city}, Odisha</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setLocationDetails(null);
                  }}
                  className="bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all flex-shrink-0 ml-3"
                >
                  <IconX size={22} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Address Card */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-5 border border-slate-200">
                <div className="flex items-start gap-3">
                  <div className="bg-orange-100 p-2.5 rounded-xl text-orange-600">
                    <IconMapPin size={22} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Address</p>
                    <p className="text-slate-800 font-medium leading-relaxed">
                      {locationDetails.address || `${locationDetails.city}, Odisha, India`}
                    </p>
                  </div>
                </div>
              </div>

              {/* eLoc Card */}
              {locationDetails.eLoc && (
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5 border border-orange-200">
                  <p className="text-xs font-black text-orange-600 uppercase tracking-widest mb-2">
                    Digital Address (eLoc)
                  </p>
                  <div className="bg-white rounded-xl p-4 border-2 border-orange-200 shadow-inner">
                    <code className="font-mono text-2xl font-black text-slate-800 tracking-widest">
                      {locationDetails.eLoc}
                    </code>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    showRoute(locationDetails);
                  }}
                  disabled={isLoading || !currentUserLocation}
                  className="w-full flex items-center justify-center gap-3 px-6 py-5 bg-gradient-to-r from-green-600 via-green-500 to-emerald-500 text-white rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50 disabled:transform-none"
                >
                  <IconRoute size={26} />
                  {currentUserLocation ? 'Get Directions' : 'Set Location First'}
                </button>
                
                {!currentUserLocation && (
                  <p className="text-center text-sm text-slate-500">
                    Tap the location icon in header to enable routing
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
