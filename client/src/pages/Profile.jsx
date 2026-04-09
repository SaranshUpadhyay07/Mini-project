import { useAuth } from "../context/AuthContext";

const API_BASE = ""; // Use relative paths so Vite proxy works on mobile (via ngrok)
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

const Profile = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isSetupMode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("setup") === "1";
  }, [location.search]);

  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({ name: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(isSetupMode);

  const fetchProfile = async () => {
    try {
      setError("");

      if (!currentUser) {
        setProfile(null);
        return;
      }

      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(
          data?.message || `Failed to load profile (HTTP ${res.status})`,
        );
      }

      setProfile(data.user);
      setFormData({
        name: data.user?.name || currentUser.displayName || "",
        phone: data.user?.phone || "",
      });

      if (!isSetupMode) {
        setIsEditing(false);
      }
    } catch (fetchError) {
      console.error("Failed to load profile:", fetchError);
      setProfile(null);
      setError(
        fetchError?.message || "Could not load your profile. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsEditing(isSetupMode);
  }, [isSetupMode]);

  useEffect(() => {
    setLoading(true);
    fetchProfile();
  }, [currentUser]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const token = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(
          data?.message || `Failed to save profile (HTTP ${res.status})`,
        );
      }

      setProfile(data.user);
      setFormData({
        name: data.user?.name || "",
        phone: data.user?.phone || "",
      });
      setIsEditing(false);

      if (isSetupMode) {
        navigate("/map", { replace: true });
      }
    } catch (saveError) {
      console.error("Failed to save profile:", saveError);
      setError(
        saveError?.message || "Could not save profile. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/signin", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading profile...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-sand flex justify-center items-center p-4">
        <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-primary mb-3 text-center">
            Not signed in
          </h1>
          <p className="text-gray-600 text-center">
            Please sign in to view your profile.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex-1 py-2 border-2 border-primary text-primary rounded-xl font-bold"
            >
              Go Home
            </button>
            <button
              onClick={() => navigate("/signin")}
              className="flex-1 py-2 bg-primary text-white rounded-xl font-bold"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand flex justify-center items-center p-4">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-primary mb-4 text-center">
          {isSetupMode ? "Complete Your Profile" : "My Profile"}
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Email</p>
              <p className="font-semibold break-all">
                {profile?.email || currentUser.email || "-"}
              </p>
            </div>

            <div>
              <label
                className="block text-sm text-gray-500 mb-1"
                htmlFor="name"
              >
                Name
              </label>
              <input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-primary focus:outline-none"
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <label
                className="block text-sm text-gray-500 mb-1"
                htmlFor="phone"
              >
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-primary focus:outline-none"
                placeholder="Enter your phone"
              />
            </div>

            <div className="mt-6 flex gap-3">
              {!isSetupMode && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2 border-2 border-primary text-primary rounded-xl font-bold"
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2 bg-primary text-white rounded-xl font-bold disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-semibold">
                  {profile?.name || "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-semibold break-all">
                  {profile?.email || currentUser.email || "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-semibold">
                  {profile?.phone || "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">User ID</p>
                <p className="font-mono text-xs break-all">
                  {profile?.firebaseUid || "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Joined</p>
                <p className="font-semibold">
                  {profile?.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString()
                    : "-"}
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => navigate("/")}
                className="flex-1 py-2 bg-[#4F46E5] text-white rounded-xl font-bold"
              >
                Back to Home
              </button>

              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 py-2 border-2 border-primary text-primary rounded-xl font-bold"
              >
                Edit
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="mt-3 w-full py-2 border-2 border-red-600 text-red-600 rounded-xl font-bold"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;
