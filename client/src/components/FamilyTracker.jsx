import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import FamilyMap from './FamilyMap';

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

  useEffect(() => {
    fetchFamily();
    
    // Update location every 30 seconds if sharing is enabled
    const locationInterval = setInterval(() => {
      if (locationSharing && navigator.geolocation) {
        updateLocation();
      }
    }, 30000);

    return () => clearInterval(locationInterval);
  }, [locationSharing]);

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
          const token = await currentUser.getIdToken();
          await fetch('http://localhost:5000/api/family/location/update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            }),
          });
          
          // Refresh family data to get updated locations
          fetchFamily();
        } catch (err) {
          console.error('Error updating location:', err);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
      }
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
        <FamilyMap
          member={selectedMember}
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
              <div className="bg-red-100 border border-red-300 rounded p-3 mb-4">
                <p className="text-red-800 font-semibold">⚠️ {family.lostMembers.filter(lm => !lm.isResolved).length} Member(s) Reported Lost</p>
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
                          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
                          title="Show location and navigate"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          Navigate
                        </button>
                      )}

                      {!isCurrentUser && (
                        <button
                          onClick={() => {
                            setSelectedLostMember(member.userId._id);
                            setShowLostMemberDialog(true);
                          }}
                          className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                          title="Report as lost"
                        >
                          🚨
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

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
