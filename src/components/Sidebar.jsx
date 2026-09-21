import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Tv,
  Folder,
  ListVideo,
  Monitor,
  LogOut,
  Radio,
  Layers,
  HardDrive,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { api } from '../services/api';

export default function Sidebar({ onLogout }) {
  const location = useLocation();
  const [stats, setStats] = useState({
    totalTvs: 0,
    onlineTvs: 0,
    totalMedia: 0,
    totalPlaylists: 0,
  });

  // Load quick live stats
  const loadStats = async () => {
    try {
      const [tvs, media, playlists] = await Promise.all([
        api.getTvs().catch(() => []),
        api.getMedia('all').catch(() => []),
        api.getPlaylists().catch(() => []),
      ]);
      const onlineCount = tvs.filter((t) => t.is_online === 1).length;
      setStats({
        totalTvs: tvs.length,
        onlineTvs: onlineCount,
        totalMedia: media.length,
        totalPlaylists: playlists.length,
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 15000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  const navItems = [
    {
      path: '/upload',
      label: 'คลังจัดการสื่อ',
      sublabel: 'Media Assets & Folders',
      icon: Folder,
      badge: stats.totalMedia ? `${stats.totalMedia} สื่อ` : null,
    },
    {
      path: '/playlist',
      label: 'จัดสรร Playlist',
      sublabel: 'Broadcast Storyboard',
      icon: ListVideo,
      badge: stats.totalPlaylists ? `${stats.totalPlaylists} ลิสต์` : null,
    },
    {
      path: '/tv',
      label: 'ตั้งค่าจอทีวี',
      sublabel: 'TV Displays & Slugs',
      icon: Monitor,
      badge: stats.totalTvs ? `${stats.onlineTvs}/${stats.totalTvs} จอ` : null,
      badgeColor: stats.onlineTvs > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600',
    },
  ];

  return (
    <aside className="w-72 bg-white border-r border-slate-200/90 flex flex-col h-screen sticky top-0 shrink-0 select-none shadow-xs z-30">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-100">
        <Link to="/upload" className="flex items-center gap-3.5 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition duration-300">
            <Tv size={22} className="stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base text-slate-900 tracking-tight block truncate">
                THOEN MEDIA
              </span>
              <span className="px-1.5 py-0.2 bg-teal-50 text-teal-700 text-[10px] font-bold rounded-md border border-teal-200/60 uppercase">
                Studio
              </span>
            </div>
            <span className="text-[11px] font-medium text-slate-400 block truncate">
              โรงพยาบาลเถิน จ.ลำปาง
            </span>
          </div>
        </Link>
      </div>

      {/* Main Navigation Links */}
      <div className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
          เมนูหลัก (Studio Control)
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm transition-all duration-200 group ${
                isActive
                  ? 'bg-indigo-50/80 text-indigo-700 font-semibold shadow-xs border border-indigo-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/30'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200/70 group-hover:text-slate-800'
                  }`}
                >
                  <Icon size={18} />
                </div>
                <div className="truncate">
                  <div className="text-sm font-semibold truncate leading-tight">
                    {item.label}
                  </div>
                  <div className="text-[11px] font-normal text-slate-400 truncate leading-tight mt-0.5">
                    {item.sublabel}
                  </div>
                </div>
              </div>

              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                    item.badgeColor || 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Live System Monitor Widget */}
      <div className="p-4 mx-4 mb-4 bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl text-white shadow-md shadow-slate-900/10 border border-slate-800">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-200">
              Live Broadcast
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/40">
            {stats.onlineTvs} จอออนไลน์
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2.5 text-center">
          <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/50">
            <div className="text-xs font-extrabold text-white">{stats.totalMedia}</div>
            <div className="text-[10px] text-slate-400">ไฟล์สื่อในระบบ</div>
          </div>
          <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/50">
            <div className="text-xs font-extrabold text-white">{stats.totalPlaylists}</div>
            <div className="text-[10px] text-slate-400">เพลย์ลิสต์</div>
          </div>
        </div>
      </div>

      {/* User Profile & Logout Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
            AD
          </div>
          <div className="truncate">
            <div className="text-xs font-bold text-slate-800 truncate leading-tight">
              ผู้ดูแลระบบ
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate">
              Admin Console
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
          title="ออกจากระบบ"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
