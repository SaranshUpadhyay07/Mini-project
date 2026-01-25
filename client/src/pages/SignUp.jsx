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