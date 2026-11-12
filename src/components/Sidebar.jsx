import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Folder,
  ListVideo,
  Monitor,
  LogOut,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../services/api';

export default function Sidebar({ onLogout, user = { username: 'admin', role: 'admin' } }) {
  const location = useLocation();
  const [stats, setStats] = useState({
    totalTvs: 0,
    onlineTvs: 0,
    totalMedia: 0,
    totalPlaylists: 0,
  });

  const loadStats = async () => {
    try {
      const data = await api.getStats();
      setStats({
        totalTvs: data.totalTvs || 0,
        onlineTvs: data.onlineTvs || 0,
        totalMedia: data.totalMedia || 0,
        totalPlaylists: data.totalPlaylists || 0,
      });
    } catch {
      // Ignore stats error
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 15000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  const isErStaffOnly = user?.role === 'er_staff';

  const allNavItems = [
    {
      path: '/upload',
      label: 'คลังจัดการสื่อ',
      icon: Folder,
      count: stats.totalMedia ? `${stats.totalMedia}` : null,
      adminOnly: true,
    },
    {
      path: '/playlist',
      label: 'จัดสรรเพลย์ลิสต์',
      icon: ListVideo,
      count: stats.totalPlaylists ? `${stats.totalPlaylists}` : null,
      adminOnly: true,
    },
    {
      path: '/tv',
      label: 'ตั้งค่าจอทีวี',
      icon: Monitor,
      count: stats.totalTvs ? `${stats.onlineTvs}/${stats.totalTvs}` : null,
      hasLiveDot: stats.onlineTvs > 0,
      adminOnly: true,
    },
    {
      path: '/incident',
      label: 'ศูนย์อุบัติเหตุหมู่',
      icon: ShieldAlert,
      adminOnly: false,
    },
    {
      path: '/system',
      label: 'ผู้ใช้งานและสำรองข้อมูล',
      icon: ShieldCheck,
      adminOnly: true,
    },
  ];

  const navItems = allNavItems.filter((item) => !isErStaffOnly || !item.adminOnly);

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col h-screen sticky top-0 shrink-0 select-none z-30">
      <div className="h-16 px-5 border-b border-slate-200/80 flex items-center">
        <Link to={isErStaffOnly ? '/incident' : '/upload'} className="flex items-center gap-3 min-w-0">
          <img
            src="/favicon.svg"
            alt="Thoen Media TV"
            className="w-8 h-8 rounded-lg shrink-0"
          />
          <div className="min-w-0">
            <span className="font-medium text-sm text-slate-900 block truncate leading-tight">
              Thoen Media TV
            </span>
            <span className="text-xs text-slate-500 block truncate leading-tight mt-0.5">
              โรงพยาบาลเถิน
            </span>
          </div>
        </Link>
      </div>

      <div className="flex-1 px-3 py-5 overflow-y-auto">
        <div className="text-xs font-normal text-slate-500 px-3 mb-2">
          ระบบควบคุมการออกอากาศ
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`h-9 px-3 rounded-lg flex items-center justify-between text-sm transition-colors ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 font-medium'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-normal'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-4.5 flex items-center justify-center shrink-0">
                    <Icon
                      size={16}
                      strokeWidth={1.5}
                      className={isActive ? 'text-teal-700' : 'text-slate-500'}
                    />
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>

                {(item.count || item.hasLiveDot) && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.hasLiveDot && (
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                    )}
                    {item.count && (
                      <span className="text-xs font-mono tabular-nums text-slate-500">
                        {item.count}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-3 mx-3 mb-3 bg-slate-50 rounded-xl border border-slate-200/80">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
          <div className="flex items-center gap-2">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                stats.onlineTvs > 0 ? 'bg-teal-600' : 'bg-slate-400'
              }`}
            />
            <span className="text-xs font-medium text-slate-700">
              สถานะออกอากาศ
            </span>
          </div>
          <span className="text-xs font-mono tabular-nums text-teal-700 font-medium">
            {stats.onlineTvs}/{stats.totalTvs} จอ
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <div>
            <div className="text-xs text-slate-500">สื่อทั้งหมด</div>
            <div className="text-sm font-mono tabular-nums font-medium text-slate-900">
              {stats.totalMedia}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">เพลย์ลิสต์</div>
            <div className="text-sm font-mono tabular-nums font-medium text-slate-900">
              {stats.totalPlaylists}
            </div>
          </div>
        </div>
      </div>

      <div className="h-14 px-4 border-t border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200/80 text-slate-700 flex items-center justify-center font-mono text-xs font-medium uppercase shrink-0">
            {(user?.username || 'AD').slice(0, 2)}
          </div>
          <div className="truncate">
            <div className="text-xs font-medium text-slate-900 truncate leading-tight">
              {user?.username || 'admin'}
            </div>
            <div className="text-[11px] text-slate-500 truncate leading-tight">
              {isErStaffOnly ? 'เจ้าหน้าที่ห้องฉุกเฉิน' : 'ผู้ดูแลระบบ'}
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
          title="ออกจากระบบ"
        >
          <LogOut size={16} strokeWidth={1.5} />
        </button>
      </div>
    </aside>
  );
}
