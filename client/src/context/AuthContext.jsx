import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../config/firebase";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

// Create context
const AuthContext = createContext(null);

// Custom hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

// Provider
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔐 Signup (Email + Password)
  const signup = async (email, password, name, phone) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      const user = userCredential.user;
      setCurrentUser(user); // avoid auth-state race before listener fires
      const token = await user.getIdToken();

      // Sync user with backend (MongoDB)
      const res = await fetch(`${API_BASE}/api/auth/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firebaseUid: user.uid,
          email: user.email,
          name,
          phone: phone || "",
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      return { success: true, user: data.user };
    } catch (error) {
      console.error("Signup error:", error);
      return { success: false, error: error.message };
    }
  };

  // 🔐 Login (Email + Password)
  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      setCurrentUser(userCredential.user); // keep ProtectedRoute from redirecting before listener updates
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: error.message };
    }
  };

  // 🔐 Google Sign-in
  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      setCurrentUser(user);
      const token = await user.getIdToken();

      const res = await fetch(`${API_BASE}/api/auth/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firebaseUid: user.uid,
          email: user.email,
          name: user.displayName || user.email.split("@")[0],
          phone: user.phoneNumber || "",
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      return { success: true, user: data.user };
    } catch (error) {
      console.error("Google login error:", error);
      return { success: false, error: error.message };
    }
  };

  // 🔐 Logout
  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // 🔁 Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    signInWithGoogle,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
