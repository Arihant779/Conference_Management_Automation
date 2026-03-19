import React, { useState } from 'react';
import { Layout } from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';

const AuthModule = () => {
  const { setUser } = useApp();

  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // --- Existing Supabase Email/Password Logic ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isLogin) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        setError(error.message);
      } else {
        setUser(data.user);   // 🔥 THIS FIXES REDIRECT
      }

    } else {
      if (!formData.name || !formData.email || !formData.password) {
        setError("All fields required");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        setError(error.message);
      } else {
        await supabase
          .from("users")
          .insert({
            user_id: data.user.id,
            user_name: formData.name
          });

        setUser(data.user);   // 🔥 Auto login after signup
      }
    }

    setLoading(false);
  };

  // --- NEW: Supabase Google Auth Logic ---
  const handleGoogleLogin = async () => {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Ensures the user comes back to your app after Google login
        redirectTo: 'http://localhost:3000'
      }
    });

    if (error) {
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
      <div className="bg-slate-900 p-8 rounded-3xl w-full max-w-md">
        <div className="text-center mb-10">
          <Layout size={32} className="mx-auto text-white mb-4" />
          <h1 className="text-3xl text-white font-bold">ConfManager</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <input
              type="text"
              placeholder="Full Name"
              className="w-full p-3 rounded bg-black text-white"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          )}

          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 rounded bg-black text-white"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 rounded bg-black text-white"
            value={formData.password}
            onChange={e => setFormData({ ...formData, password: e.target.value })}
          />

          {error && <p className="text-red-400">{error}</p>}

          <button className="w-full bg-indigo-600 text-white p-3 rounded">
            {loading ? "Please wait..." : (isLogin ? "Sign In" : "Create Account")}
          </button>
        </form>

        {/* --- Google Login UI Section --- */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-slate-900 text-slate-400">Or continue with</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          type="button"
          className="w-full bg-white text-black p-3 rounded flex items-center justify-center font-semibold hover:bg-gray-200 transition-colors mb-5"
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="w-5 h-5 mr-2"
          />
          Sign in with Google
        </button>
        {/* --------------------------------- */}

        <div className="text-center mt-5">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-gray-400"
          >
            {isLogin ? "New here? Create account" : "Already have an account?"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModule;