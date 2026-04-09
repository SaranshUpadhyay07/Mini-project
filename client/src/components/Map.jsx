import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

const Map = forwardRef(({ onMapLoad, center = [85.8315, 20.2961], zoom = 10 }, ref) => {
  const mapInstance = useRef(null);
  const mapContainerRef = useRef(null);
  const isInitialized = useRef(false);
  const MAPPLS_KEY = import.meta.env.VITE_MAPPLS_API_KEY;

  useImperativeHandle(ref, () => ({
    getMap: () => mapInstance.current,
    addMarker: (options) => {
      if (mapInstance.current && window.mappls) {
        return new window.mappls.Marker({
          map: mapInstance.current,
          ...options
        });
      }
      return null;
    },
    setCenter: (coords) => {
      if (mapInstance.current) {
        mapInstance.current.setCenter(coords);
      }
    },
    setZoom: (zoomLevel) => {
      if (mapInstance.current) {
        mapInstance.current.setZoom(zoomLevel);
      }
    },
    fitBounds: (bounds, options) => {
      if (mapInstance.current) {
        mapInstance.current.fitBounds(bounds, options);
      }
    }
  }));

  useEffect(() => {
    // CRITICAL: Prevent any re-initialization
    if (isInitialized.current) {
      console.log('Map already initialized, preventing reload');
      return;
    }

    // Prevent re-initialization if map already exists
    if (mapInstance.current) {
      console.log('Map instance exists, skipping reload');
      return;
    }

    // Mark as initializing
    isInitialized.current = true;

    const loadMapplsSDK = () => {
      // Check if already loaded with nearby plugin
      if (window.mappls && window.mappls.Map && window.mappls.nearby) {
        console.log('Mappls SDK and plugins already loaded');
        setTimeout(initMap, 200);
        return;
      }

      // If SDK loaded but missing nearby, load plugins
      if (window.mappls && window.mappls.Map && !window.mappls.nearby) {
        console.log('Mappls SDK loaded, loading nearby plugin...');
        loadPlugins();
        return;
      }

      // Check if SDK script already exists
      if (document.querySelector('script[src*="sdk.mappls.com/map/sdk/web"]')) {
        console.log('Mappls SDK script exists, waiting...');
        const checkSDK = setInterval(() => {
          if (window.mappls && window.mappls.Map) {
            clearInterval(checkSDK);
            if (window.mappls.nearby) {
              setTimeout(initMap, 200);
            } else {
              loadPlugins();
            }
          }
        }, 200);
        setTimeout(() => clearInterval(checkSDK), 10000);
        return;
      }

      // Load main SDK
      const script = document.createElement('script');
      script.src = `https://sdk.mappls.com/map/sdk/web?v=3.0&access_token=${MAPPLS_KEY}`;
      script.async = true;
      script.onload = () => {
        console.log('Mappls SDK loaded successfully');
        loadPlugins();
      };
      script.onerror = () => {
        console.error('Failed to load Mappls SDK');
      };
      document.head.appendChild(script);
    };

    const loadPlugins = () => {
      // Check if plugins already loaded
      if (window.mappls && window.mappls.nearby) {
        console.log('Plugins already available');
        setTimeout(initMap, 200);
        return;
      }

      // Check if plugin script exists
      if (document.querySelector('script[src*="sdk.mappls.com/map/sdk/plugins"]')) {
        console.log('Plugin script exists, waiting...');
        const checkPlugins = setInterval(() => {
          if (window.mappls && window.mappls.nearby) {
            clearInterval(checkPlugins);
            setTimeout(initMap, 200);
          }
        }, 200);
        setTimeout(() => clearInterval(checkPlugins), 10000);
        return;
      }

      // Load plugins
      const pluginScript = document.createElement('script');
      pluginScript.src = `https://sdk.mappls.com/map/sdk/plugins?v=3.0&libraries=direction,nearby&access_token=${MAPPLS_KEY}`;
      pluginScript.async = true;
      pluginScript.onload = () => {
        console.log('Mappls plugins loaded (direction + nearby)');
        setTimeout(initMap, 500);
      };
      document.head.appendChild(pluginScript);
    };

    const initMap = () => {
      if (!window.mappls) {
        console.error('Mappls SDK not available');
        return;
      }

      if (!mapContainerRef.current) {
        console.error('Map container ref not available');
        return;
      }

      // Generate unique ID for container
      const containerId = `mappls-map-${Math.random().toString(36).substr(2, 9)}`;
      mapContainerRef.current.id = containerId;

      // Wait for DOM update and then create map
      requestAnimationFrame(() => {
        try {
          // Verify container exists in DOM
          const containerElement = document.getElementById(containerId);
          if (!containerElement) {
            console.error('Container element not found in DOM');
            return;
          }

          const map = new window.mappls.Map(containerId, {
            center: center,
            zoom: zoom,
            zoomControl: true,
            location: true
          });

          map.on('load', () => {
            console.log('Map initialized successfully');
            mapInstance.current = map;
            if (onMapLoad) {
              onMapLoad(map);
            }
          });
        } catch (error) {
          console.error('Error initializing map:', error);
        }
      });
    };

    loadMapplsSDK();

    return () => {
      // Don't remove map on cleanup to prevent re-initialization
      // Map will be cleaned up when component is unmounted
    };
  }, []); // Empty dependency array - only run once

  return <div ref={mapContainerRef} className="w-full h-full" />;
});

Map.displayName = 'Map';

export default Map;
