import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { TranslationProvider } from './context/TranslationContext';
import { VoiceNavigationProvider } from './context/VoiceNavigationContext';
import PersistentVoiceButton from './components/PersistentVoiceButton';
import { useLocationTracker } from './hooks/useLocationTracker';

import Home from "./pages/Home";
import MapPage from "./pages/MapPage";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import Profile from "./pages/Profile";
import Itinerary from './pages/Iternary';
import FamilyTrackerPage from './pages/FamilyTrackerPage';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!currentUser) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return children;
};

export default function App() {
  // Automatically send user's location to backend every 5s when logged in
  useLocationTracker();

  return (
    <TranslationProvider>
      <Router>
        <VoiceNavigationProvider>
          <div className="min-h-screen bg-sand-light">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/itineraryai" element={
                <ProtectedRoute>
                <Itinerary />
                </ProtectedRoute>} />

              <Route
                path="/map"
                element={
                  <ProtectedRoute>
                    <MapPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/family-tracker"
                element={
                  <ProtectedRoute>
                    <FamilyTrackerPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
            </Routes>
            
            {/* Persistent Voice Navigation Button */}
            <PersistentVoiceButton />
          </div>
        </VoiceNavigationProvider>
      </Router>
    </TranslationProvider>
  );
}
