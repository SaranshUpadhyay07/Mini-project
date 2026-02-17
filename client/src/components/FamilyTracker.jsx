import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import FindMyDevice from './FindMyDevice';
import { initiateSocket, disconnectSocket, sendLocationUpdate } from '../services/socket';

const FamilyTracker = () => {
  const { currentUser } = useAuth();
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isCreatingFamily, setIsCreatingFamily] = useState(false);
  const [isJoiningFamily, setIsJoiningFamily] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [locationSharing, setLocationSharing] = useState(false);
  const [showLostMemberDialog, setShowLostMemberDialog] = useState(false);
  const [selectedLostMember, setSelectedLostMember] = useState(null);
  const [showLostMembersView, setShowLostMembersView] = useState(false);
  
  // Real-time tracking refs
  const watchIdRef = useRef(null);
  const headingRef = useRef(0);
  const lastLocationRef = useRef(null);

  // 1. Fetch family ONCE on mount
  useEffect(() => {
    fetchFamily();
  }, []); // Empty deps = runs once

  // 2. Initialize Socket ONLY when family first loads
  useEffect(() => {
    if (family && currentUser) {
      console.log('🔌 Initializing Socket for family:', family.familyId);
      initiateSocket(family.familyId, currentUser.uid);
      
      return () => {
        console.log('🔌 Disconnecting Socket on unmount');
        disconnectSocket();
      };
    }
  }, [family?.familyId, currentUser?.uid]); // Only re-run if IDs change

  // 3. Real-time location tracking with device compass (separate concern)
  useEffect(() => {
    if (!locationSharing || !family?.familyId || !currentUser?.uid) {
      // Stop watching if disabled
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        console.log('🛑 Stopped real-time location tracking');
      }
      return;
    }

    console.log('🔄 Starting real-time location tracking with compass...');

    // Setup device orientation listener for compass heading
    const handleOrientation = (event) => {
      if (event.alpha !== null) {
        // alpha: 0-360 degrees, where 0/360 is North
        headingRef.current = event.alpha;
      }
      // Also try webkitCompassHeading for iOS
      if (event.webkitCompassHeading !== undefined) {
        headingRef.current = event.webkitCompassHeading;
      }
    };

    // Request device orientation permission (iOS 13+)
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then(permissionState => {
          if (permissionState === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation, true);
            console.log('✅ Compass access granted');
          }
        })
        .catch(console.error);
    } else {
      // Non-iOS or older iOS
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    // Calculate heading from movement (fallback if compass not available)
    const calculateHeadingFromMovement = (lat1, lng1, lat2, lng2) => {
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const lat1Rad = lat1 * Math.PI / 180;
      const lat2Rad = lat2 * Math.PI / 180;
      
      const y = Math.sin(dLng) * Math.cos(lat2Rad);
      const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
                Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
      
      let heading = Math.atan2(y, x) * 180 / Math.PI;
      heading = (heading + 360) % 360; // Normalize to 0-360
      return heading;
    };

    // Real-time geolocation watching
    const handlePositionUpdate = async (position) => {
      const { latitude, longitude, accuracy, speed } = position.coords;
      
      // Get heading from device compass or calculate from movement
      let heading = headingRef.current;
      
      // If compass not available and we have previous location, calculate from movement
      if (heading === 0 && lastLocationRef.current) {
        heading = calculateHeadingFromMovement(
          lastLocationRef.current.lat,
          lastLocationRef.current.lng,
          latitude,
          longitude
        );
      }
      
      // Use position.coords.heading as fallback (GPS-based heading)
      if (heading === 0 && position.coords.heading !== null) {
        heading = position.coords.heading;
      }

      console.log('📍 Real-time location update:');
      console.log('   Lat:', latitude, 'Lng:', longitude);
      console.log('   Heading:', heading, '° (0=N, 90=E, 180=S, 270=W)');
      console.log('   Speed:', speed, 'm/s');
      console.log('   Accuracy:', accuracy, 'meters');

      try {
        // 1. Save to MongoDB via HTTP
        const token = await currentUser.getIdToken();
        const response = await fetch('http://localhost:5000/api/family/location/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ latitude, longitude, accuracy }),
        });

        if (response.ok) {
          console.log('✅ Location saved to MongoDB');
        }

        // 2. Broadcast via Socket.io with heading
        const socketData = {
          familyId: family.familyId,
          userId: currentUser.uid, // Firebase UID
          lat: latitude,
          lng: longitude,
          heading: heading, // Device compass or calculated heading
          speed: speed || 0,
          accuracy: accuracy || 0,
          timestamp: Date.now()
        };
        
        console.log('🔌 Broadcasting to Socket.io:', socketData);
        sendLocationUpdate(socketData);
        
        // Store for heading calculation
        lastLocationRef.current = { lat: latitude, lng: longitude };

      } catch (error) {
        console.error('Error updating location:', error);
      }
    };

    // Start continuous watching
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      (error) => {
        console.error('❌ Geolocation watch error:', error.message);
        // Try to restart watching
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          setTimeout(() => {
            if (locationSharing) {
              watchIdRef.current = navigator.geolocation.watchPosition(
                handlePositionUpdate,
                console.error,
                {
                  enableHighAccuracy: true,
                  timeout: 10000,
                  maximumAge: 0
                }
              );
            }
          }, 3000);
        }
      },
      {
        enableHighAccuracy: true, // Use GPS
        timeout: 10000,
        maximumAge: 0, // Always get fresh location
        // High accuracy mode triggers updates on every movement
      }
    );

    console.log('✅ Real-time tracking started (watch ID:', watchIdRef.current, ')');

    return () => {
      console.log('🛑 Stopping real-time tracking...');
      
      // Stop watching location
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      
      // Remove compass listener
      window.removeEventListener('deviceorientation', handleOrientation, true);
      
      // Clear refs
      headingRef.current = 0;
      lastLocationRef.current = null;
    };
  }, [locationSharing, family?.familyId, currentUser?.uid]); // Stable dependencies

  const fetchFamily = async () => {
    try {
      setLoading(true);
      const token = await currentUser.getIdToken();
      const response = await fetch('http://localhost:5000/api/family', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 404) {
          setFamily(null);
        } else {
          throw new Error(data.message);
        }
      } else {
        setFamily(data.data.family);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createFamily = async (e) => {
    e.preventDefault();
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('http://localhost:5000/api/family/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ familyName }),
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message);
      
      setFamily(data.data.family);
      setIsCreatingFamily(false);
      setFamilyName('');
      alert(`Family created! Share this code with family members: ${data.data.familyCode}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const joinFamily = async (e) => {
    e.preventDefault();
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('http://localhost:5000/api/family/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ familyCode: joinCode.toUpperCase() }),
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message);
      
      setFamily(data.data.family);
      setIsJoiningFamily(false);
      setJoinCode('');
    } catch (err) {
      setError(err.message);
    }
  };

  const updateLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };

          // HTTP call to persist in MongoDB
          const token = await currentUser.getIdToken();
          await fetch('http://localhost:5000/api/family/location/update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(locationData),
          });
          
          // Socket.io emit for real-time broadcast to family members
          if (family && currentUser) {
            sendLocationUpdate({
              familyId: family.familyId,
              userId: currentUser.uid,
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              heading: position.coords.heading || 0,
              speed: position.coords.speed || 0,
              accuracy: position.coords.accuracy,
              timestamp: Date.now()
            });
          }
          
          // Refresh family data to get updated locations
          fetchFamily();
        } catch (err) {
          console.error('Error updating location:', err);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
      },
      { enableHighAccuracy: true } // Added for better GPS accuracy
    );
  };

  const toggleLocationSharing = async () => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('http://localhost:5000/api/family/location/toggle', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message);
      
      setLocationSharing(data.data.isSharingLocation);
      
      if (data.data.isSharingLocation) {
        updateLocation();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const showMemberLocation = (member) => {
    console.log('🗺️ Navigate clicked for member:', member.userId.name);
    console.log('   Firebase UID:', member.userId.firebaseUid);
    console.log('   MongoDB _id:', member.userId._id);
    console.log('   Is sharing location:', member.userId.isSharingLocation);
    console.log('   Has location:', member.userId.currentLocation);
    console.log('   Coordinates:', member.userId.currentLocation?.coordinates);
    
    if (!member.userId.isSharingLocation) {
      alert(`${member.userId.name} is not currently sharing their location.`);
      return;
    }
    
    if (!member.userId.currentLocation || !member.userId.currentLocation.coordinates) {
      alert(`Location data not available for ${member.userId.name}. They may need to enable location sharing.`);
      return;
    }
    
    const [lng, lat] = member.userId.currentLocation.coordinates;
    if (!lat || !lng) {
      alert(`Invalid location coordinates for ${member.userId.name}.`);
      return;
    }
    
    console.log(`✅ Opening map to track ${member.userId.name} at [${lat}, ${lng}]`);
    setSelectedMember(member);
    setShowMap(true);
  };

  const reportLostMember = async (userId) => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('http://localhost:5000/api/family/member/lost/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ lostUserId: userId }),
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message);
      
      alert('Lost member reported successfully. All family members have been notified.');
      setShowLostMemberDialog(false);
      fetchFamily();
    } catch (err) {
      setError(err.message);
    }
  };

  const resolveLostMember = async (lostMemberId) => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('http://localhost:5000/api/family/member/lost/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ lostMemberId }),
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message);
      
      alert('Lost member marked as found!');
      fetchFamily();
    } catch (err) {
      setError(err.message);
    }
  };

  const getMemberDistance = (member) => {
    // This would calculate distance from current user to member
    // Implementation depends on your location tracking setup
    return null;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!family) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Family Tracker</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Create Family */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Create a Family</h2>
            {!isCreatingFamily ? (
              <button
                onClick={() => setIsCreatingFamily(true)}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Create New Family
              </button>
            ) : (
              <form onSubmit={createFamily} className="space-y-4">
                <input
                  type="text"
                  placeholder="Family Name"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="w-full px-4 py-2 border rounded"
                  required
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingFamily(false)}
                    className="flex-1 bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Join Family */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Join a Family</h2>
            {!isJoiningFamily ? (
              <button
                onClick={() => setIsJoiningFamily(true)}
                className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Join Existing Family
              </button>
            ) : (
              <form onSubmit={joinFamily} className="space-y-4">
                <input
                  type="text"
                  placeholder="Family Code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 border rounded uppercase"
                  maxLength={6}
                  required
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    Join
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsJoiningFamily(false)}
                    className="flex-1 bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = family.adminUserId._id === currentUser.uid || 
                  family.adminUserId === currentUser.uid;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {showMap && selectedMember ? (
        <FindMyDevice
          member={selectedMember}
          currentUser={currentUser}
          familyId={family.familyId}
          onClose={() => {
            setShowMap(false);
            setSelectedMember(null);
          }}
        />
      ) : (
        <>
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-3xl font-bold">{family.familyName}</h1>
                <p className="text-gray-600">Family Code: <span className="font-mono font-bold">{family.familyCode}</span></p>
                <p className="text-sm text-gray-500">Family ID: {family.familyId}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={toggleLocationSharing}
                  className={`px-4 py-2 rounded ${
                    locationSharing
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                >
                  {locationSharing ? '📍 Sharing Location' : '📍 Start Sharing'}
                </button>
                {locationSharing && (
                  <button
                    onClick={updateLocation}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    🔄 Update Now
                  </button>
                )}
              </div>
            </div>

            {family.activeTripId && (
              <div className="bg-blue-100 border border-blue-300 rounded p-3 mb-4">
                <p className="text-blue-800 font-semibold">🚗 Active Trip in Progress</p>
              </div>
            )}

            {family.lostMembers?.filter(lm => !lm.isResolved).length > 0 && (
              <div 
                className="bg-red-100 border border-red-300 rounded p-3 mb-4 cursor-pointer hover:bg-red-200 transition"
                onClick={() => setShowLostMembersView(true)}
              >
                <div className="flex justify-between items-center">
                  <p className="text-red-800 font-semibold">⚠️ {family.lostMembers.filter(lm => !lm.isResolved).length} Member(s) Reported Lost</p>
                  {isAdmin && (
                    <p className="text-red-600 text-sm">Click to manage →</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold mb-4">Family Members ({family.members.length})</h2>
            
            <div className="space-y-3">
              {family.members.map((member) => {
                const isCurrentUser = member.userId._id === currentUser.uid;
                const hasLocation = member.userId.currentLocation && member.userId.currentLocation.coordinates;
                const distance = getMemberDistance(member);

                return (
                  <div
                    key={member.userId._id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      isCurrentUser ? 'bg-blue-50 border-blue-300' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                        {member.userId.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold">
                          {member.userId.name}
                          {isCurrentUser && <span className="text-blue-600 ml-2">(You)</span>}
                          {member.role === 'admin' && <span className="ml-2 text-xs bg-yellow-200 px-2 py-1 rounded">Admin</span>}
                        </p>
                        <p className="text-sm text-gray-600">ID: {member.memberId}</p>
                        {member.userId.isSharingLocation && hasLocation ? (
                          <p className="text-xs text-green-600">
                            📍 Sharing location
                            {member.userId.lastLocationUpdate && 
                              ` • Updated ${new Date(member.userId.lastLocationUpdate).toLocaleTimeString()}`
                            }
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500">📍 Not sharing location</p>
                        )}
                        {distance && (
                          <p className="text-xs text-orange-600">⚠️ {Math.round(distance)}m away</p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {hasLocation && !isCurrentUser && (
                        <button
                          onClick={() => showMemberLocation(member)}
                          className="px-6 py-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 flex items-center gap-2 font-medium shadow-md transition-all hover:shadow-lg"
                          title="Locate device"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Locate
                        </button>
                      )}

                      {!isCurrentUser && (
                        <button
                          onClick={() => {
                            setSelectedLostMember(member.userId._id);
                            setShowLostMemberDialog(true);
                          }}
                          className="px-4 py-2.5 bg-red-50 text-red-600 rounded-full hover:bg-red-100 font-medium transition-all"
                          title="Report as lost"
                        >
                          🚨 Report
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lost Members View Dialog */}
          {showLostMembersView && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-bold text-red-700">⚠️ Lost Members</h3>
                  <button
                    onClick={() => setShowLostMembersView(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  {family.lostMembers
                    ?.filter(lm => !lm.isResolved)
                    .map((lostMember) => {
                      const member = family.members.find(m => m.userId._id === lostMember.userId);
                      const reporter = family.members.find(m => m.userId._id === lostMember.reportedBy);
                      
                      return (
                        <div key={lostMember._id} className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                                  {member?.userId.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <h4 className="font-bold text-lg">{member?.userId.name}</h4>
                                  <p className="text-sm text-gray-600">Member ID: {member?.memberId}</p>
                                </div>
                              </div>
                              
                              <div className="ml-15 space-y-1 text-sm">
                                <p className="text-gray-700">
                                  <span className="font-semibold">Reported by:</span> {reporter?.userId.name}
                                </p>
                                <p className="text-gray-700">
                                  <span className="font-semibold">Reported at:</span>{' '}
                                  {new Date(lostMember.reportedAt).toLocaleString()}
                                </p>
                                {lostMember.lastKnownLocation?.coordinates?.[0] && lostMember.lastKnownLocation?.coordinates?.[1] && (
                                  <p className="text-gray-700">
                                    <span className="font-semibold">Last known location:</span>{' '}
                                    Lat: {lostMember.lastKnownLocation.coordinates[1].toFixed(6)}, 
                                    Lng: {lostMember.lastKnownLocation.coordinates[0].toFixed(6)}
                                  </p>
                                )}
                              </div>
                            </div>

                            {isAdmin && (
                              <button
                                onClick={() => resolveLostMember(lostMember._id)}
                                className="ml-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-semibold whitespace-nowrap"
                              >
                                ✓ Mark as Found
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>

                {family.lostMembers?.filter(lm => !lm.isResolved).length === 0 && (
                  <p className="text-center text-gray-500 py-8">No lost members at the moment.</p>
                )}

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowLostMembersView(false)}
                    className="px-6 py-2 bg-gray-300 rounded hover:bg-gray-400 font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lost Member Dialog */}
          {showLostMemberDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md">
                <h3 className="text-xl font-bold mb-4">Report Lost Member</h3>
                <p className="mb-4">Are you sure you want to report this member as lost? All family members will be notified.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => reportLostMember(selectedLostMember)}
                    className="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  >
                    Report Lost
                  </button>
                  <button
                    onClick={() => {
                      setShowLostMemberDialog(false);
                      setSelectedLostMember(null);
                    }}
                    className="flex-1 bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FamilyTracker;
