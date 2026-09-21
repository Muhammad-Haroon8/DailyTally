// components/Sidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Store, ShieldAlert, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    {
      label: 'Shops Directory',
      href: '/shops',
      icon: Store,
      isActive: pathname.startsWith('/shops') || pathname.startsWith('/customers') || pathname.startsWith('/wholesalers'),
    },
    {
      label: 'Platform Audit Log',
      href: '/audit-log',
      icon: ShieldAlert,
      isActive: pathname.startsWith('/audit-log'),
    },
  ];

  return (
    <aside className="w-64 bg-slate-950/80 border-r border-slate-800/80 flex flex-col justify-between h-screen sticky top-0 backdrop-blur-xl z-20">
      {/* Brand */}
      <div>
        <div className="p-6 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-900/20">
              <ShieldCheck className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                Daily Tally
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Super Admin
                </span>
              </h1>
              <p className="text-xs text-slate-400">Platform Oversight</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1.5">
          <p className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
            System Navigation
          </p>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  item.isActive
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                {item.isActive && (
                  <motion.div
                    layoutId="activeSidebarIndicator"
                    className="absolute inset-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon
                  className={`w-4 h-4 z-10 transition-colors ${
                    item.isActive ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                />
                <span className="z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-4 border-t border-slate-800/60 bg-slate-950/40">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <p className="text-xs font-semibold text-slate-200 truncate">
              {user?.name || 'Super Admin'}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {user?.email || 'admin@dailytally.com'}
            </p>
          </div>

          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 transition"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
