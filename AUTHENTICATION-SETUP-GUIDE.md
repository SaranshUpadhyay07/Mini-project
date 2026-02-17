# 🔐 Authentication Setup Guide - Sign In & Sign Up Implementation

## 📋 Table of Contents
1. [Overview](#overview)
2. [How Authentication Works](#how-authentication-works)
3. [Prerequisites](#prerequisites)
4. [Step-by-Step Implementation](#step-by-step-implementation)
5. [Creating Sign Up Page](#creating-sign-up-page)
6. [Creating Sign In Page](#creating-sign-in-page)
7. [Testing Your Authentication](#testing-your-authentication)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

Your app uses a **dual authentication system**:
- **Firebase Authentication** - Handles user login/signup (email, password, Google sign-in)
- **MongoDB** - Stores user profile data (trips, family info, etc.)

### Why Two Databases?
- Firebase: Fast authentication, secure password handling
- MongoDB: Store complex user data (trips, family groups, locations)

---

## 🔄 How Authentication Works

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   React     │  Sign   │  Firebase   │  Sync   │   MongoDB   │
│  Frontend   │ ──────> │    Auth     │ ──────> │  (Backend)  │
└─────────────┘         └─────────────┘         └─────────────┘
     User fills              Creates user            Stores user
     form                    account                 profile data
```

**Flow:**
1. User enters email/password → React frontend
2. Firebase creates account & returns token
3. React sends token + user data to your backend
4. Backend syncs user to MongoDB
5. User is now logged in!

---

## ✅ Prerequisites

### Already Done ✓
- ✅ Firebase config in `client/src/config/firebase.js`
- ✅ Backend API routes at `api/routes/auth.routes.js`
- ✅ User model at `api/models/user.model.js`
- ✅ Sync controller at `api/controllers/auth.controller.js`

### What You Need to Install

**Frontend (React):**
```bash
cd client
npm install react-router-dom
```

**Backend (should already have these):**
```bash
cd api
npm install firebase-admin express mongoose cors dotenv
```

---

## 🚀 Step-by-Step Implementation

### STEP 1: Create Auth Context (React)

This stores logged-in user info across your entire app.

**File:** `client/src/context/AuthContext.jsx`

```jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../config/firebase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign up with email and password
  const signup = async (email, password, name, phone) => {
    try {
      // 1. Create user in Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Get Firebase token
      const token = await user.getIdToken();

      // 3. Sync to MongoDB
      const response = await fetch('http://localhost:5000/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firebaseUid: user.uid,
          email: user.email,
          name: name,
          phone: phone || ''
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      return { success: true, user: data.user };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: error.message };
    }
  };

  // Sign in with email and password
  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      // Sync to MongoDB
      const token = await user.getIdToken();
      const response = await fetch('http://localhost:5000/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firebaseUid: user.uid,
          email: user.email,
          name: user.displayName || email.split('@')[0],
          phone: user.phoneNumber || ''
        }),
      });

      const data = await response.json();
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Google sign-in error:', error);
      return { success: false, error: error.message };
    }
  };

  // Logout
  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Listen for auth state changes
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
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
```

---

### STEP 2: Wrap Your App with AuthProvider

**File:** `client/src/main.jsx`

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext.jsx'  // ADD THIS

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>  {/* WRAP APP */}
      <App />
    </AuthProvider>
  </React.StrictMode>,
)
```

---

### STEP 3: Create Sign Up Page

**File:** `client/src/pages/SignUp.jsx`

```jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IconMail, IconLock, IconUser, IconPhone, IconBrandGoogle } from '@tabler/icons-react';

const SignUp = () => {
  const navigate = useNavigate();
  const { signup, signInWithGoogle } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    if (formData.password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    setLoading(true);

    const result = await signup(
      formData.email,
      formData.password,
      formData.name,
      formData.phone
    );

    setLoading(false);

    if (result.success) {
      alert('Account created successfully!');
      navigate('/map'); // Redirect to map page after signup
    } else {
      setError(result.error);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const result = await signInWithGoogle();
    setLoading(false);

    if (result.success) {
      navigate('/map');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-800 mb-2">Create Account</h1>
          <p className="text-slate-600">Join Patha Gamini - Your Pilgrim Guide</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {/* Sign Up Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
            <div className="relative">
              <IconUser className="absolute left-3 top-3.5 text-slate-400" size={20} />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                placeholder="Enter your full name"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
            <div className="relative">
              <IconMail className="absolute left-3 top-3.5 text-slate-400" size={20} />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                placeholder="your.email@example.com"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Phone (Optional)</label>
            <div className="relative">
              <IconPhone className="absolute left-3 top-3.5 text-slate-400" size={20} />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                placeholder="+91 1234567890"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
            <div className="relative">
              <IconLock className="absolute left-3 top-3.5 text-slate-400" size={20} />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                placeholder="At least 6 characters"
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Confirm Password</label>
            <div className="relative">
              <IconLock className="absolute left-3 top-3.5 text-slate-400" size={20} />
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                placeholder="Re-enter password"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-600 to-amber-500 text-white font-bold py-3 rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-slate-200"></div>
          <span className="px-4 text-sm text-slate-500">OR</span>
          <div className="flex-1 border-t border-slate-200"></div>
        </div>

        {/* Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 border-2 border-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-50 transition-all"
        >
          <IconBrandGoogle size={20} />
          Continue with Google
        </button>

        {/* Sign In Link */}
        <p className="text-center mt-6 text-slate-600">
          Already have an account?{' '}
          <Link to="/signin" className="text-orange-600 font-bold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
```

---

### STEP 4: Create Sign In Page

**File:** `client/src/pages/SignIn.jsx`

```jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IconMail, IconLock, IconBrandGoogle } from '@tabler/icons-react';

const SignIn = () => {
  const navigate = useNavigate();
  const { login, signInWithGoogle } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(formData.email, formData.password);
    setLoading(false);

    if (result.success) {
      navigate('/map'); // Redirect after successful login
    } else {
      setError(result.error);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const result = await signInWithGoogle();
    setLoading(false);

    if (result.success) {
      navigate('/map');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-800 mb-2">Welcome Back</h1>
          <p className="text-slate-600">Sign in to continue your journey</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
            <div className="relative">
              <IconMail className="absolute left-3 top-3.5 text-slate-400" size={20} />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                placeholder="your.email@example.com"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
            <div className="relative">
              <IconLock className="absolute left-3 top-3.5 text-slate-400" size={20} />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:outline-none"
                placeholder="Enter your password"
              />
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="text-right">
            <Link to="/forgot-password" className="text-sm text-orange-600 hover:underline">
              Forgot Password?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-600 to-amber-500 text-white font-bold py-3 rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-slate-200"></div>
          <span className="px-4 text-sm text-slate-500">OR</span>
          <div className="flex-1 border-t border-slate-200"></div>
        </div>

        {/* Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 border-2 border-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-50 transition-all"
        >
          <IconBrandGoogle size={20} />
          Continue with Google
        </button>

        {/* Sign Up Link */}
        <p className="text-center mt-6 text-slate-600">
          Don't have an account?{' '}
          <Link to="/signup" className="text-orange-600 font-bold hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignIn;
```

---

### STEP 5: Add Routes to App.jsx

**File:** `client/src/App.jsx`

```jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Home from './pages/Home';
import MapPage from './pages/MapPage';
import SignUp from './pages/SignUp';
import SignIn from './pages/SignIn';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/signin" />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/signin" element={<SignIn />} />
        
        {/* Protected Routes */}
        <Route 
          path="/map" 
          element={
            <ProtectedRoute>
              <MapPage />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
```

---

### STEP 6: Update Home Page with Auth Links

**File:** `client/src/pages/Home.jsx` (Add navigation buttons)

```jsx
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      navigate('/signin');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Header with Auth Buttons */}
      <header className="p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-orange-600">Patha Gamini</h1>
        
        <div className="flex gap-3">
          {currentUser ? (
            <>
              <button
                onClick={() => navigate('/map')}
                className="px-6 py-2 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700"
              >
                Explore Map
              </button>
              <button
                onClick={handleLogout}
                className="px-6 py-2 border-2 border-orange-600 text-orange-600 font-bold rounded-xl hover:bg-orange-50"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/signin')}
                className="px-6 py-2 border-2 border-orange-600 text-orange-600 font-bold rounded-xl hover:bg-orange-50"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="px-6 py-2 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </header>

      {/* Rest of your Home page content */}
    </div>
  );
};

export default Home;
```

---

## 🧪 Testing Your Authentication

### Test Checklist:

1. **Start Backend Server:**
```bash
cd api
npm start
# Should run on http://localhost:5000
```

2. **Start Frontend Server:**
```bash
cd client
npm run dev
# Should run on http://localhost:5173
```

3. **Test Sign Up:**
   - Go to `http://localhost:5173/signup`
   - Fill in the form
   - Click "Sign Up"
   - Check console for errors
   - Should redirect to `/map` page

4. **Check MongoDB:**
```bash
# Open MongoDB Compass or use mongo shell
# Check if user was created in your database
```

5. **Test Sign In:**
   - Go to `http://localhost:5173/signin`
   - Use credentials from step 3
   - Should redirect to `/map` page

6. **Test Google Sign In:**
   - Click "Continue with Google"
   - Select Google account
   - Should redirect to `/map` page

7. **Test Protected Routes:**
   - Logout
   - Try accessing `/map` directly
   - Should redirect to `/signin`

---

## 🐛 Troubleshooting

### Common Issues:

#### 1. "Firebase: Error (auth/email-already-in-use)"
**Solution:** Email is already registered. Use Sign In instead.

#### 2. "CORS Error"
**Solution:** In `api/index.js`, update CORS:
```javascript
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
```

#### 3. "Cannot sync to MongoDB"
**Solution:** 
- Check if backend is running on port 5000
- Check MongoDB connection in `api/config/db.config.js`
- Check console for error messages

#### 4. "User not found after login"
**Solution:** Check `api/controllers/auth.controller.js` - sync endpoint might be failing

#### 5. Google Sign-In not working
**Solution:** 
- Enable Google Sign-In in Firebase Console
- Add your domain to authorized domains

---

## 📱 What Happens Behind the Scenes

### When User Signs Up:
1. React form sends data to Firebase
2. Firebase creates user account
3. React gets Firebase UID & token
4. React sends UID + user data to your backend `/api/auth/sync`
5. Backend creates user in MongoDB with firebaseUid
6. User is now in both databases ✓

### When User Signs In:
1. React sends email/password to Firebase
2. Firebase verifies and returns token
3. User is logged in
4. Token is stored in React state
5. Protected routes become accessible

### When User Accesses Protected Route:
1. React checks if user is logged in
2. If yes → show page
3. If no → redirect to `/signin`

---

## 🎉 You're Done!

Your authentication system is now complete with:
- ✅ Email/Password Sign Up
- ✅ Email/Password Sign In
- ✅ Google Sign In
- ✅ Firebase Authentication
- ✅ MongoDB User Sync
- ✅ Protected Routes
- ✅ Beautiful UI

### Next Steps:
1. Add user profile page
2. Add password reset functionality
3. Add user avatar upload
4. Add email verification

---

## 📞 Need Help?

If something doesn't work:
1. Check browser console for errors
2. Check backend terminal for errors
3. Verify Firebase config is correct
4. Verify MongoDB is connected
5. Check all file paths are correct

**Happy Coding! 🚀**
