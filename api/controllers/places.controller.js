import axios from 'axios';

// Mappls API configuration
const MAPPLS_API_KEY = process.env.MAPPLS_API_KEY;

/**
 * Search for pilgrim locations in a specific city using Mappls API
 */
export const searchPilgrimLocations = async (req, res) => {
  try {
    const { city } = req.query;
    
    if (!city) {
      return res.status(400).json({ 
        success: false, 
        message: 'City parameter is required' 
      });
    }

    // Search for temples and religious sites in the specified city
    const searchQueries = [
      `temple in ${city}`,
      `shrine in ${city}`,
      `pilgrimage in ${city}`,
      `religious place in ${city}`
    ];

    const allLocations = [];
    const locationSet = new Set(); // To avoid duplicates

    // Perform multiple searches to get comprehensive results
    for (const query of searchQueries) {
      try {
        const response = await axios.get(
          `https://atlas.mappls.com/api/places/search/json`,
          {
            params: {
              query: query,
              pod: 'POI', // Place of Interest
              access_token: MAPPLS_API_KEY
            },
            headers: {
              'Accept': 'application/json'
            }
          }
        );

        if (response.data && response.data.suggestedLocations) {
          response.data.suggestedLocations.forEach(location => {
            // Use eLoc as unique identifier to avoid duplicates
            if (!locationSet.has(location.eLoc)) {
              locationSet.add(location.eLoc);
              allLocations.push({
                name: location.placeName || location.placeAddress,
                address: location.placeAddress,
                city: location.city || city,
                eLoc: location.eLoc,
                lat: location.latitude,
                lng: location.longitude,
                type: location.type || 'Religious Site',
                categoryCode: location.categoryCode
              });
            }
          });
        }
      } catch (searchError) {
        console.error(`Error searching for "${query}":`, searchError.message);
        // Continue with other searches even if one fails
      }
    }

    // Filter and clean results
    const pilgrimLocations = allLocations
      .filter(loc => loc.lat && loc.lng) // Must have coordinates
      .slice(0, 50); // Limit to 50 results

    res.json({
      success: true,
      count: pilgrimLocations.length,
      data: pilgrimLocations
    });

  } catch (error) {
    console.error('Error fetching pilgrim locations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pilgrim locations',
      error: error.message
    });
  }
};

/**
 * Get details of a specific location by eLoc
 */
export const getLocationDetails = async (req, res) => {
  try {
    const { eLoc } = req.params;

    if (!eLoc) {
      return res.status(400).json({
        success: false,
        message: 'eLoc parameter is required'
      });
    }

    const response = await axios.get(
      `https://atlas.mappls.com/api/places/geocode`,
      {
        params: {
          address: eLoc,
          access_token: MAPPLS_API_KEY
        },
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (response.data && response.data.copResults) {
      const location = response.data.copResults;
      res.json({
        success: true,
        data: {
          name: location.placeName,
          address: location.formattedAddress,
          lat: location.latitude,
          lng: location.longitude,
          eLoc: location.eLoc,
          type: location.type
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

  } catch (error) {
    console.error('Error fetching location details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch location details',
      error: error.message
    });
  }
};

/**
 * Get pilgrim locations for multiple cities (Puri and Bhubaneswar)
 */
export const getOdishaPilgrimLocations = async (req, res) => {
  try {
    // Reference locations for nearby search
    const searchLocations = [
      { city: 'Puri', lat: 19.8135, lng: 85.8312, keywords: 'temple;shrine;pilgrimage' },
      { city: 'Bhubaneswar', lat: 20.2961, lng: 85.8245, keywords: 'temple;shrine;religious' },
      { city: 'Konark', lat: 19.8876, lng: 86.0945, keywords: 'temple;monument' }
    ];

    const allLocations = [];
    const locationSet = new Set(); // To avoid duplicates

    // Perform nearby search for each city
    for (const location of searchLocations) {
      try {
        // Mappls Nearby Search API (Text Search)
        const response = await axios.get(
          `https://atlas.mappls.com/api/places/nearby/json`,
          {
            params: {
              keywords: location.keywords,
              refLocation: `${location.lat},${location.lng}`,
              radius: 10000, // 10km radius
              access_token: MAPPLS_API_KEY
            },
            headers: {
              'Accept': 'application/json'
            }
          }
        );

        console.log(`Nearby search for ${location.city}:`, response.data);

        if (response.data && response.data.suggestedLocations) {
          response.data.suggestedLocations.forEach(place => {
            // Use eLoc as unique identifier
            if (!locationSet.has(place.eLoc) && place.latitude && place.longitude) {
              locationSet.add(place.eLoc);
              allLocations.push({
                name: place.placeName || place.placeAddress,
                address: place.placeAddress || `${location.city}, Odisha`,
                city: location.city,
                eLoc: place.eLoc,
                lat: parseFloat(place.latitude),
                lng: parseFloat(place.longitude),
                type: place.type || 'Temple',
                categoryCode: place.categoryCode,
                distance: place.distance
              });
            }
          });
        }
      } catch (cityError) {
        console.error(`Error in nearby search for ${location.city}:`, cityError.message);
      }
    }

    // If no results from API, return hardcoded famous locations
    if (allLocations.length === 0) {
      console.log('No results from API, using fallback locations');
      const fallbackLocations = [
        { name: 'Jagannath Temple', city: 'Puri', lat: 19.8048, lng: 85.8182, type: 'Temple', eLoc: 'MMI000', address: 'Grand Road, Puri, Odisha' },
        { name: 'Lingaraj Temple', city: 'Bhubaneswar', lat: 20.2373, lng: 85.8353, type: 'Temple', eLoc: 'MMI001', address: 'Lingaraj Nagar, Bhubaneswar' },
        { name: 'Konark Sun Temple', city: 'Konark', lat: 19.8876, lng: 86.0945, type: 'Temple', eLoc: 'MMI002', address: 'Konark, Puri District' },
        { name: 'Mukteshwar Temple', city: 'Bhubaneswar', lat: 20.2433, lng: 85.8337, type: 'Temple', eLoc: 'MMI003', address: 'Old Town, Bhubaneswar' },
        { name: 'Rajarani Temple', city: 'Bhubaneswar', lat: 20.2542, lng: 85.8258, type: 'Temple', eLoc: 'MMI004', address: 'Tankapani Road, Bhubaneswar' },
        { name: 'Parsurameswara Temple', city: 'Bhubaneswar', lat: 20.2428, lng: 85.8322, type: 'Temple', eLoc: 'MMI005', address: 'Old Town, Bhubaneswar' },
        { name: 'Brahmeshwara Temple', city: 'Bhubaneswar', lat: 20.2403, lng: 85.8324, type: 'Temple', eLoc: 'MMI006', address: 'Old Town, Bhubaneswar' },
        { name: 'Ananta Vasudeva Temple', city: 'Bhubaneswar', lat: 20.2396, lng: 85.8347, type: 'Temple', eLoc: 'MMI007', address: 'Old Town, Bhubaneswar' },
        { name: 'Ram Mandir', city: 'Bhubaneswar', lat: 20.2515, lng: 85.8347, type: 'Temple', eLoc: 'MMI008', address: 'Bhubaneswar' },
        { name: 'ISKCON Temple', city: 'Bhubaneswar', lat: 20.3006, lng: 85.8175, type: 'Temple', eLoc: 'MMI009', address: 'Nayapalli, Bhubaneswar' },
        { name: 'Gundicha Temple', city: 'Puri', lat: 19.8134, lng: 85.8285, type: 'Temple', eLoc: 'MMI010', address: 'Grand Road, Puri' },
        { name: 'Lokanath Temple', city: 'Puri', lat: 19.8081, lng: 85.8246, type: 'Temple', eLoc: 'MMI011', address: 'Puri, Odisha' },
        { name: 'Narendra Sarovar', city: 'Puri', lat: 19.8090, lng: 85.8295, type: 'Sacred Lake', eLoc: 'MMI012', address: 'Puri, Odisha' },
        { name: 'Dhauli Shanti Stupa', city: 'Bhubaneswar', lat: 20.1869, lng: 85.8403, type: 'Buddhist Site', eLoc: 'MMI013', address: 'Dhauli, Bhubaneswar' },
        { name: 'Udayagiri Caves', city: 'Bhubaneswar', lat: 20.2626, lng: 85.7317, type: 'Historic Site', eLoc: 'MMI014', address: 'Udayagiri, Bhubaneswar' },
        { name: 'Khandagiri Caves', city: 'Bhubaneswar', lat: 20.2600, lng: 85.7700, type: 'Historic Site', eLoc: 'MMI015', address: 'Khandagiri, Bhubaneswar' }
      ];
      
      return res.json({
        success: true,
        count: fallbackLocations.length,
        data: fallbackLocations,
        source: 'fallback'
      });
    }

    // Sort by distance if available
    allLocations.sort((a, b) => (a.distance || 0) - (b.distance || 0));

    res.json({
      success: true,
      count: allLocations.length,
      data: allLocations,
      source: 'mappls_api'
    });

  } catch (error) {
    console.error('Error fetching Odisha pilgrim locations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Odisha pilgrim locations',
      error: error.message
    });
  }
};
