import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const Profile = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Fetch profile from MongoDB
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!currentUser) return;

        const token = await currentUser.getIdToken();

        const res = await fetch("http://localhost:5000/api/users/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (data.success) {
          setProfile(data.user);
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [currentUser]);

  const handleLogout = async () => {
    await logout();
    navigate("/signin");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading profile...
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center p-4">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-orange-600 mb-6 text-center">
          My Profile
        </h1>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="font-semibold">{profile.name}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-semibold">{profile.email}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="font-semibold">
              {profile.phone || "Not provided"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">User ID</p>
            <p className="font-mono text-xs break-all">
              {profile.firebaseUid}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Joined</p>
            <p className="font-semibold">
              {new Date(profile.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => navigate("/map")}
            className="flex-1 py-2 bg-orange-600 text-white rounded-xl font-bold"
          >
            Back to Map
          </button>

          <button
            onClick={handleLogout}
            className="flex-1 py-2 border-2 border-orange-600 text-orange-600 rounded-xl font-bold"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
