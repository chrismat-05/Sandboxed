import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  PlaySquare,
  ListCollapse,
  FlaskConical,
  ShieldCheck,
  Cpu,
  Settings as SettingsIcon,
  Shield,
  Activity,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api';

const navItems = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/playground', label: 'Playground', icon: PlaySquare },
  { path: '/executions', label: 'Executions', icon: ListCollapse },
  { path: '/policy-lab', label: 'Policy Lab', icon: FlaskConical },
  { path: '/policies', label: 'Security Policies', icon: ShieldCheck },
  { path: '/system', label: 'System Information', icon: Cpu },
  { path: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function AppLayout() {
  const [capabilities, setCapabilities] = useState(null);
  const location = useLocation();

  useEffect(() => {
    api.getCapabilities()
      .then(setCapabilities)
      .catch((err) => console.error('Failed to load system capabilities:', err));
  }, [location.pathname]);

  const currentNav = navItems.find((item) => item.path === location.pathname) || { label: 'Console' };

  return (
    <div className="flex h-screen bg-[#090d16] text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800/80 bg-[#0d1322] flex flex-col justify-between shrink-0">
        <div>
          {/* Logo & Header */}
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-semibold text-sm tracking-wide text-white">SANDBOXED</h1>
                <p className="text-[11px] text-slate-400 font-mono">Linux Isolation Engine</p>
              </div>
            </div>
          </div>

          {/* Engine Status Banner */}
          <div className="px-4 py-3 border-b border-slate-800/60 bg-slate-900/40">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Engine Status</span>
              {capabilities?.ready ? (
                <span className="inline-flex items-center text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Ready (Linux)
                </span>
              ) : (
                <span className="inline-flex items-center text-amber-400 font-medium" title={capabilities?.issues?.[0] || 'Unverified'}>
                  <AlertCircle className="w-3.5 h-3.5 mr-1" />
                  {capabilities?.is_linux ? 'Prerequisites Missing' : 'Host: Non-Linux'}
                </span>
              )}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 truncate font-mono">
              {capabilities?.os_name || 'Probing...'}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 mr-2.5 shrink-0" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/30 text-[11px] text-slate-400 space-y-2">
          <div className="flex justify-between items-center font-mono">
            <span>Kernel</span>
            <span className="text-slate-300 truncate max-w-[120px]" title={capabilities?.kernel_version}>
              {capabilities?.kernel_version || 'Detecting...'}
            </span>
          </div>
          <div className="flex justify-between items-center font-mono">
            <span>cgroups v2</span>
            <span className={capabilities?.cgroups_v2_mounted ? 'text-emerald-400' : 'text-slate-500'}>
              {capabilities?.cgroups_v2_mounted ? 'Mounted' : 'Unavailable'}
            </span>
          </div>
          <a
            href="http://127.0.0.1:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between text-blue-400 hover:text-blue-300 pt-1 border-t border-slate-800/60"
          >
            <span>OpenAPI Docs</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-14 border-b border-slate-800/80 bg-[#0d1322]/80 backdrop-blur px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <h2 className="text-base font-semibold text-white tracking-wide">{currentNav.label}</h2>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-xs bg-slate-800/60 border border-slate-700/60 px-3 py-1.5 rounded-md text-slate-300 font-mono">
              <Activity className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              <span>Concur: 1/1</span>
            </div>
            <div className="text-xs bg-slate-800/60 border border-slate-700/60 px-3 py-1.5 rounded-md text-slate-300 font-mono">
              v1.0.0-os-academic
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#090d16]">
          <Outlet context={{ capabilities }} />
        </main>
      </div>
    </div>
  );
}
