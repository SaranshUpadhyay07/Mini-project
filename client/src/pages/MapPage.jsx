import React, { useEffect, useRef, useState } from 'react';
import { IconMapPin, IconX, IconRoute, IconCurrentLocation, IconSearch, IconChevronDown, IconChevronUp, IconAlertCircle, IconCheck, IconHome, IconNavigation } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { NavbarDemo } from '../components/Navbar';

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
    <div className="w-full h-screen flex flex-col overflow-hidden bg-white text-slate-900">
      {/* Top Navigation Bar */}
      <NavbarDemo />

      {/* Notification Toast */}
      {notification && (
        <div
          className={`absolute top-[76px] sm:top-[84px] left-3 right-3 sm:left-6 sm:right-6 z-50 mx-auto max-w-xl p-3.5 border bg-white shadow-md flex items-center gap-3 animate-slide-down ${
            notification.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          {notification.type === 'error' && <IconAlertCircle size={22} />}
          {notification.type === 'success' && <IconCheck size={22} />}
          {notification.type === 'info' && <IconNavigation size={22} className="animate-pulse" />}
          <span className="font-medium text-sm flex-1">{notification.message}</span>
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
                  <div className="h-12 w-12 bg-amber-100 text-amber-900 flex items-center justify-center border border-amber-200">
                    <IconMapPin size={26} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Explore Odisha</h2>
                    <p className="text-sm text-slate-500">Temples and shrines near you</p>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="p-5 space-y-4 border-b border-slate-200/60 bg-white">
                <button
                  onClick={getCurrentLocation}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 px-5 py-4 bg-[#f4622d] text-white font-semibold shadow-sm hover:bg-[#fa4909ff] transition-colors disabled:opacity-50"
                >
                  <IconCurrentLocation size={20} className={isLoading ? 'animate-spin' : ''} />
                  {currentUserLocation ? 'Location ready' : 'Use my location'}
                </button>

                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-[0.2em]">Choose a city</p>
                  <div className="flex items-center gap-2 p-1.5 bg-slate-100 border border-slate-200">
                    {Object.keys(cityCoordinates).map((city) => (
                      <button
                        key={city}
                        onClick={() => searchNearbyTemples(city)}
                        className={`flex-1 px-3 py-2.5 text-sm font-semibold border border-transparent transition-colors ${
                          searchCity === city
                            ? 'bg-white text-slate-900 border-slate-200'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Results */}
              <div className="flex-1 overflow-y-auto bg-white">
                <div className="p-4 bg-white border-b border-slate-200 sticky top-0 z-10">
                  <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <IconSearch size={18} className="text-amber-600" />
                    Temples near {searchCity}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Tap a place in the list to view details</p>
                </div>

                {!isMapReady && (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"></div>
                    </div>
                    <p className="mt-6 text-slate-600 font-medium">Preparing map…</p>
                  </div>
                )}

                {/* Desktop nearby results - only visible on lg+ */}
                <div className="hidden lg:block p-3">
                  <div className="w-full"
                    id="nearby_search_results"
                    ref={nearbyContainerRef}
                    suppressHydrationWarning
                  />
                </div>
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
          <div className="pointer-events-none absolute inset-0 lg:inset-4 bg-gradient-to-b from-transparent via-transparent to-amber-100/25" />
        </div>

        {/* Mobile Bottom Sheet */}
        <div
          className="lg:hidden fixed inset-x-0 bottom-0 z-40 transition-all duration-300 ease-out"
          style={{
            transform: isBottomSheetOpen ? 'translateY(0)' : 'translateY(calc(100% - 72px))',
            maxHeight: '72vh'
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
                {isBottomSheetOpen ? <IconChevronDown size={18} /> : <IconChevronUp size={18} />}
                {isBottomSheetOpen ? 'Swipe down' : 'Tap to browse'}
              </div>
            </button>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Controls */}
              <div className="p-4 space-y-4 border-b border-slate-200/70 bg-white">
                <button
                  onClick={getCurrentLocation}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 px-5 py-4 bg-[#f4622d] text-white font-semibold shadow-sm active:bg-[#fa4909ff] transition-colors disabled:opacity-50"
                >
                  <IconCurrentLocation size={20} className={isLoading ? 'animate-spin' : ''} />
                  {currentUserLocation ? 'Location ready' : 'Use my location'}
                </button>

                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-[0.2em]">Choose a city</p>
                  <div className="flex items-center gap-2 p-1.5 bg-slate-100 border border-slate-200">
                    {Object.keys(cityCoordinates).map((city) => (
                      <button
                        key={city}
                        onClick={() => searchNearbyTemples(city)}
                        className={`flex-1 px-3 py-2.5 text-sm font-semibold border border-transparent transition-colors ${
                          searchCity === city
                            ? 'bg-white text-slate-900 border-slate-200'
                            : 'text-slate-600 active:bg-white'
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Results - Mobile shows nearby search results */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-3 bg-white border-b border-slate-200 sticky top-0 z-10">
                  <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <IconSearch size={18} className="text-amber-600" />
                    Near {searchCity}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Tap a result to open details</p>
                </div>
                
                {!isMapReady && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="relative w-14 h-14">
                      <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"></div>
                    </div>
                    <p className="mt-4 text-slate-600 text-sm font-medium">Loading…</p>
                  </div>
                )}
                
                {/* Mobile shows the same nearby results - Mappls injects here on mobile */}
                <div className="p-3 lg:hidden">
                  <div 
                    id="nearby_search_results"
                    suppressHydrationWarning
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && locationDetails && (
        <div className="fixed inset-0 bg-black/55 flex items-end lg:items-center justify-center z-50 p-0 lg:p-6">
          <div
            className="bg-white w-full lg:max-w-md shadow-[0_18px_45px_rgba(2,6,23,0.22)] overflow-hidden flex flex-col max-h-[85vh] lg:max-h-[80vh] border border-slate-200"
            style={{ animation: 'slideUp 0.24s ease-out' }}
          >
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white">
              <div className="flex justify-between items-start">
                <div className="relative flex items-start gap-3 flex-1">
                  <div className="h-11 w-11 bg-amber-200 text-slate-900 flex items-center justify-center border border-amber-300">
                    <span className="text-2xl">🕉️</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold mb-1 leading-tight truncate">{locationDetails.name}</h2>
                    <p className="text-slate-200/90 text-xs truncate">{locationDetails.city}, Odisha</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setLocationDetails(null);
                  }}
                  className="bg-white/10 hover:bg-white/20 p-2 transition-colors flex-shrink-0 ml-3"
                  aria-label="Close detail"
                >
                  <IconX size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Address Card */}
              <div className="p-5 border border-slate-200 bg-white">
                <div className="flex items-start gap-3">
                  <div className="bg-amber-100 p-2.5 text-amber-800 border border-amber-200">
                    <IconMapPin size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.15em] mb-1">Address</p>
                    <p className="text-slate-800 font-medium leading-relaxed">
                      {locationDetails.address || `${locationDetails.city}, Odisha, India`}
                    </p>
                  </div>
                </div>
              </div>

              {/* eLoc Card */}
              {locationDetails.eLoc && (
                <div className="p-5 border border-amber-200 bg-amber-50">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-[0.18em] mb-2">
                    Digital Address (eLoc)
                  </p>
                  <div className="bg-white p-4 border border-amber-200">
                    <code className="font-mono text-xl font-semibold text-slate-900 tracking-widest">
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
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#f4622d] text-white font-semibold text-base shadow-sm hover:bg-[#fa4909ff] transition-colors disabled:opacity-50"
                >
                  <IconRoute size={22} />
                  {currentUserLocation ? 'Get directions' : 'Set location first'}
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
