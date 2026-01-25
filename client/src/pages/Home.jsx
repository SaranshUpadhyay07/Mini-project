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
      <header className="p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-orange-600">
          Patha Gamini
        </h1>

        <div className="flex gap-3">
          {currentUser ? (
            <>
              <button
                onClick={() => navigate('/map')}
                className="px-6 py-2 bg-orange-600 text-white font-bold rounded-xl"
              >
                Explore Map
              </button>

              <button
                onClick={() => navigate('/profile')}
                className="px-6 py-2 border-2 border-orange-600 text-orange-600 font-bold rounded-xl"
              >
                Profile
              </button>

              <button
                onClick={handleLogout}
                className="px-6 py-2 border-2 border-orange-600 text-orange-600 font-bold rounded-xl"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/signin')}
                className="px-6 py-2 border-2 border-orange-600 text-orange-600 font-bold rounded-xl"
              >
                Sign In
              </button>

              <button
                onClick={() => navigate('/signup')}
                className="px-6 py-2 bg-orange-600 text-white font-bold rounded-xl"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </header>
    </div>
  );
};

export default Home;
