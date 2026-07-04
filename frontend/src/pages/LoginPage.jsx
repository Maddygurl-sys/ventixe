import React, { useState } from 'react';
import { API_BASE } from '../config';

export default function LoginPage({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isRegister && password.length < 6) {
      setError('Password is less than 6 characters. Keep a strong password.');
      return;
    }

    setLoading(true);

    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const body = { username, password };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed.');
      }

      if (isRegister) {
        setSuccess(data.message || 'Account created successfully! Please sign in.');
        setIsRegister(false);
        setPassword('');
        setUsername('');
      } else {
        localStorage.setItem('user', JSON.stringify(data.user));
        if (onLoginSuccess) {
          onLoginSuccess(data.user);
        } else {
          window.location.reload();
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl border border-purple-50 shadow-2xl p-8 space-y-6 relative overflow-hidden animate-entrance">
        {/* Gradients */}
        <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-fuchsia-50/50 blur-xl"></div>
        <div className="absolute -left-10 -bottom-10 w-36 h-36 rounded-full bg-purple-50/50 blur-xl"></div>

        <div className="text-center relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-fuchsia-50/50 border border-purple-100 flex items-center justify-center mx-auto mb-4 p-2">
            <img src="/logo.png" alt="Ventixe" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
            {isRegister ? 'Create Account' : 'Welcome to Ventixe'}
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">
            {isRegister ? 'Register user account' : 'Sign in to manage & book events'}
          </p>
        </div>

        {error && (
          <div className="p-4 bg-pink-50 border border-pink-100 text-pink-900 text-xs font-semibold rounded-2xl flex items-start gap-2 animate-entrance relative z-10">
            <span className="material-symbols-outlined text-[16px] text-primary mt-0.5 animate-pulse">error</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-950 text-xs font-semibold rounded-2xl flex items-start gap-2 animate-entrance relative z-10">
            <span className="material-symbols-outlined text-[16px] text-emerald-600 mt-0.5">check_circle</span>
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="login-username">Username</label>
            <input
              id="login-username"
              type="text"
              required
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50/50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" htmlFor="login-pass">Password</label>
            <input
              id="login-pass"
              type="password"
              required
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50/50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary hover:bg-primary/95 text-white rounded-2xl text-xs font-black shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all uppercase tracking-widest mt-4 disabled:opacity-50 disabled:cursor-wait"
          >
            {loading ? 'Processing...' : isRegister ? 'Register Account' : 'Sign In'}
          </button>
        </form>

        <div className="text-center relative z-10 pt-2">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
              setSuccess('');
              setUsername('');
              setPassword('');
            }}
            className="text-xs font-bold text-primary hover:underline font-black"
          >
            {isRegister ? 'Already have an account? Sign In' : 'Create a new user account'}
          </button>
        </div>
      </div>
    </div>
  );
}
