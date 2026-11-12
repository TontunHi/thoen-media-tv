import React, { useState } from 'react';
import { api, setAuthToken } from '../services/api';
import { Lock, User, AlertCircle } from 'lucide-react';

export default function LoginModal({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.login(username, password);
      setAuthToken(res.token);
      onLoginSuccess(res.username);
    } catch (err) {
      setError(err.message || 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6 select-none">
      <div className="max-w-sm w-full bg-white border border-slate-200/80 rounded-2xl p-8 shadow-xs">
        <div className="flex items-center gap-3 pb-6 mb-6 border-b border-slate-100">
          <img
            src="/favicon.svg"
            alt="Thoen Media TV"
            className="w-10 h-10 rounded-lg shrink-0"
          />
          <div className="min-w-0">
            <h1 className="text-base font-medium text-slate-900 leading-tight truncate">
              Thoen Media TV
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              ระบบควบคุมจอประชาสัมพันธ์ โรงพยาบาลเถิน
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-center gap-2.5">
            <AlertCircle size={16} strokeWidth={1.5} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              ชื่อผู้ใช้งาน
            </label>
            <div className="relative">
              <User
                size={16}
                strokeWidth={1.5}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-200/90 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-700 focus:bg-white transition-colors text-sm"
                placeholder="ชื่อผู้ใช้งาน"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              รหัสผ่าน
            </label>
            <div className="relative">
              <Lock
                size={16}
                strokeWidth={1.5}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-200/90 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-700 focus:bg-white transition-colors text-sm"
                placeholder="รหัสผ่าน"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>เข้าสู่ระบบ</span>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>โรงพยาบาลเถิน จ.ลำปาง</span>
          <span className="font-mono text-slate-400">LAN Console</span>
        </div>
      </div>
    </div>
  );
}
