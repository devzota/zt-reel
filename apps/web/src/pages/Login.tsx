import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useZTTeamAuthStore } from '../stores/authStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { ztteam_login, isLoading } = useZTTeamAuthStore();
  const navigate = useNavigate();

  const ztteam_handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await ztteam_login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {/* Decorative blurred blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-tertiary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-white p-8 rounded-2xl shadow-lg z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-400 mx-auto rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-4xl" data-icon="auto_awesome" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          </div>
          <h1 className="text-[32px] leading-tight font-bold text-gray-900 mb-2">
            AutoContent AI
          </h1>
          <p className="text-sm text-gray-500">Đăng nhập để vào hệ thống</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                  <span className="material-symbols-outlined text-sm" data-icon="warning" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
             </div>
             <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={ztteam_handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-100 rounded-full text-gray-900 focus:ring-2 focus:ring-primary outline-none transition-all text-sm placeholder:text-gray-400"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-100 rounded-full text-gray-900 focus:ring-2 focus:ring-primary outline-none transition-all text-sm placeholder:text-gray-400"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-4 bg-primary text-white font-bold rounded-full px-4 py-4 shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined animate-spin" data-icon="sync">sync</span>
                <span>Đang xử lý...</span>
              </>
            ) : (
              <span>Đăng nhập</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
