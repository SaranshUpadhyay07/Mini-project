# 🗺️ Mappls API Integration Guide

## ✅ What Has Been Set Up

### 1. **Environment Variables** (`.env`)
Your Mappls API credentials have been added:
- `VITE_MAPPLS_API_KEY` - Your Mappls API key
- `VITE_MAPPLS_CLIENT_KEY` - Your client key for SDK initialization
- `VITE_MAPPLS_CLIENT_SECRET` - Your client secret

### 2. **Map Page Component** (`src/pages/MapPage.jsx`)
A complete interactive map component featuring:
- **Interactive Map**: Full-screen Mappls map centered on Odisha
- **Location Markers**: 10 pre-configured pilgrim sites including:
  - Jagannath Temple, Puri
  - Konark Sun Temple
  - Lingaraj Temple, Bhubaneswar
  - Chilika Lake
  - And 6 more locations
- **Sidebar**: List of all locations with click-to-navigate
- **Current Location**: Button to get user's GPS location
- **Selected Location Info**: Displays details when a location is clicked

### 3. **Routing** (`src/App.jsx`)
React Router has been configured with two routes:
- `/` - Home page
- `/map` - Map page

### 4. **Updated Navbar** (`src/components/Navbar.jsx`)
Navigation has been enhanced with:
- New "Map" menu item (desktop & mobile)
- Smart navigation (routes vs scroll anchors)
- Map icon in mobile speed dial

### 5. **Dependencies Installed**
- `react-router-dom` - For page navigation

---

## 🚀 How to Use

### Start the Application
The app is already running at: **http://localhost:5173/**

1. Open your browser and go to `http://localhost:5173/`
2. Click "Map" in the navbar to view the interactive map
3. Click on any location in the sidebar to zoom to that site
4. Click markers on the map to see location details

### Key Features

#### 📍 View Locations
- Click any location in the sidebar to center the map
- Markers appear on all pilgrim sites
- Selected location is highlighted in orange

#### 🧭 Get Your Current Location
- Click the location button (📍) in the sidebar
- Allow location access when prompted
- Map will center on your current position

#### 🗺️ Map Interactions
- **Zoom**: Use mouse wheel or + / - buttons
- **Pan**: Click and drag the map
- **Click Markers**: View location details

---

## 🔧 Customization Guide

### Adding More Locations
Edit `src/pages/MapPage.jsx` and add to the `pilgrimLocations` array:

```javascript
const pilgrimLocations = [
  // Existing locations...
  { 
    name: 'Your New Location', 
    lat: 20.1234, 
    lng: 85.5678, 
    type: 'Temple' 
  },
];
```

### Changing Map Appearance
In `initializeMap()` function, modify:

```javascript
const mapInstance = new window.mappls.Map(mapContainerRef.current, {
  center: [20.2961, 85.8245], // Center coordinates
  zoom: 8,                     // Default zoom level
  zoomControl: true,           // Show zoom controls
  location: true,              // Show location button
});
```

### Fetching Locations from Database
Replace the hardcoded `pilgrimLocations` array with an API call:

```javascript
useEffect(() => {
  const fetchLocations = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/attractions');
      const data = await response.json();
      setPilgrimLocations(data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };
  
  fetchLocations();
}, []);
```

---

## 🎨 Advanced Features

### 1. Route Planning Between Locations
Add this function to plan routes:

```javascript
const planRoute = (startLocation, endLocation) => {
  if (!map) return;
  
  new window.mappls.direction({
    map: map,
    start: [startLocation.lat, startLocation.lng],
    end: [endLocation.lat, endLocation.lng],
    resource: 'route_adv',
    profile: 'driving',
    rtype: 1,
  });
};
```

### 2. Search for Nearby Places
Add search functionality:

```javascript
const searchNearby = (location, keyword) => {
  window.mappls.search(keyword, {
    location: [location.lat, location.lng],
    radius: 5000, // 5km radius
  }, (data) => {
    console.log('Nearby places:', data);
  });
};
```

### 3. Marker Clustering
For better performance with many markers:

```javascript
const markerCluster = new window.mappls.MarkerClusterer(
  map, 
  markers, 
  {
    maxZoom: 12,
    gridSize: 60,
  }
);
```

---

## 📚 Mappls API Documentation

For more features, check out:
- **Main Docs**: https://apis.mappls.com/advancedmaps/doc/interactive-map-api
- **JS SDK**: https://github.com/mappls-api/mappls-web-maps
- **Examples**: https://www.mapmyindia.com/api/advanced-maps/doc/sample-code

### Common API Methods

```javascript
// Set map center
map.setCenter([lat, lng]);

// Set zoom level
map.setZoom(12);

// Add custom marker
new window.mappls.Marker({
  position: [lat, lng],
  map: map,
  title: 'Custom Location',
  icon: 'custom-icon-url.png'
});

// Add popup/infowindow
new window.mappls.InfoWindow({
  position: [lat, lng],
  map: map,
  content: '<h3>Location Name</h3>'
});
```

---

## 🐛 Troubleshooting

### Map Not Loading?
1. Check if the API keys are correct in `.env`
2. Verify the keys are prefixed with `VITE_`
3. Restart the dev server after changing `.env`

### Console Errors?
- Open browser DevTools (F12)
- Check Console tab for specific errors
- Most common: API key issues or network problems

### Markers Not Appearing?
- Verify coordinates are in `[latitude, longitude]` format
- Check if locations array is properly formatted
- Ensure map initialization is complete before adding markers

---

## 🎯 Next Steps

1. **Connect to Your Database**: Replace hardcoded locations with MongoDB data
2. **Add Filtering**: Filter locations by type (temples, lakes, etc.)
3. **Integrate Itinerary AI**: Show planned routes on the map
4. **Family Tracker**: Add real-time location tracking
5. **User Favorites**: Let users save favorite locations
6. **Reviews & Ratings**: Show user reviews for each location

---

## 📞 Support

For issues specific to:
- **Mappls API**: https://about.mappls.com/contact/
- **Your App**: Check the React/Vite documentation

---

**Happy Mapping! 🗺️🚀**
