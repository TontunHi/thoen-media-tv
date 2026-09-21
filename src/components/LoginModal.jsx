import React, { useState } from 'react';
import { api, setAuthToken } from '../services/api';
import { Lock, User, AlertCircle, Tv, Sparkles, ShieldCheck } from 'lucide-react';

export default function LoginModal({ onLoginSuccess }) {
  const [username, setUsername] = useState('thoen');
  const [password, setPassword] = useState('thlp11152');
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
      setError(err.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100/70 p-4 select-none relative overflow-hidden">
      {/* Ambient background glow accents */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-200/60 relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/20 mb-4">
            <Tv size={32} className="stroke-[2.2]" />
          </div>
          <div className="flex items-center gap-1.5 mb-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              THOEN MEDIA TV
            </h1>
            <span className="px-1.5 py-0.2 bg-teal-50 text-teal-700 text-[10px] font-black rounded-md border border-teal-200/60 uppercase">
              Studio
            </span>
          </div>
          <p className="text-slate-500 text-xs text-center font-medium">
            ระบบบริหารจัดการสื่อโทรทัศน์โรงพยาบาลเถิน จ.ลำปาง
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-3">
            <AlertCircle size={18} className="shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              ชื่อผู้ใช้งาน (Username)
            </label>
            <div className="relative">
              <User
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-50/60 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent focus:bg-white transition-all text-sm"
                placeholder="ระบุชื่อผู้ใช้งาน"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              รหัสผ่าน (Password)
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-50/60 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent focus:bg-white transition-all text-sm"
                placeholder="ระบุรหัสผ่าน"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-teal-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5 text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>เข้าสู่ระบบจัดการ</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>เข้าสู่ระบบเฉพาะผู้ดูแลระบบ</span>
          <span className="font-semibold text-slate-500">v2.0 Enterprise</span>
        </div>
      </div>
    </div>
  );
}
