// Exact copy of attached dribble design generated, to redesign later.
// TODO: remake this full function after VIVA, dont touch now, everything breaks
// please just work for the demo tomorrow
// temporary fix so the UI doesn't clip during presentation
// temporary fix so the UI doesn't go down during presentation
// tchr said this shouldn't be hardcoded but I'm tired

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
  Activity,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api';
import SandboxedLogo from '../components/SandboxedLogo';

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
    // console.log("HERE!!!")
    // console.log("navigating to:", location.pathname)
    api.getCapabilities()
      .then((data) => {
        // console.log("capabilities loaded:", data)
        setCapabilities(data);
      })
      .catch((err) => console.error('Failed to load system capabilities:', err));
  }, [location.pathname]);

  const currentNav = navItems.find((item) => item.path === location.pathname) || { label: 'Console' };

  return (
    <div className="flex h-screen bg-burgundy-900 text-beige-200 overflow-hidden font-sub">
      {/* Sidebar */}
      <aside className="w-64 border-r border-burgundy-700 bg-burgundy-850 flex flex-col justify-between shrink-0">
        <div>
          {/* Header with New Sandboxed Logo */}
          <div className="p-4 border-b border-burgundy-700 bg-burgundy-800/90">
            <SandboxedLogo className="w-9 h-9" showText={true} textClassName="leading-tight" />
          </div>

          {/* Engine Status Banner */}
          <div className="px-4 py-3 border-b border-burgundy-700/80 bg-burgundy-950/60">
            <div className="flex items-center justify-between text-xs">
              <span className="text-beige-400 font-medium">Engine Status</span>
              {capabilities?.ready ? (
                <span className="inline-flex items-center text-emerald-300 font-medium text-[11px] bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                  Ready (Linux)
                </span>
              ) : (
                <span className="inline-flex items-center text-champagne-400 font-medium text-[11px] bg-burgundy-900 px-2 py-0.5 rounded border border-burgundy-650" title={capabilities?.issues?.[0] || 'Unverified'}>
                  <AlertCircle className="w-3 h-3 mr-1 text-champagne-400" />
                  {capabilities?.is_linux ? 'Missing Setup' : 'Host: Non-Linux'}
                </span>
              )}
            </div>
            <div className="mt-1.5 text-[11px] text-beige-500 truncate font-mono">
              {capabilities?.os_name || 'Probing kernel...'}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                      isActive
                        ? 'bg-burgundy-500/25 text-beige-100 border border-burgundy-500/40 shadow-velvet-glow'
                        : 'text-beige-400 hover:text-beige-100 hover:bg-burgundy-800/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 mr-2.5 shrink-0 text-champagne-500/80" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t border-burgundy-700 bg-burgundy-950/50 text-[11px] text-beige-400 space-y-2 font-mono">
          <div className="flex justify-between items-center">
            <span className="text-beige-500">Kernel</span>
            <span className="text-beige-200 truncate max-w-[120px]" title={capabilities?.kernel_version}>
              {capabilities?.kernel_version || 'Detecting...'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-beige-500">cgroups v2</span>
            <span className={capabilities?.cgroups_v2_mounted ? 'text-champagne-400' : 'text-beige-500'}>
              {capabilities?.cgroups_v2_mounted ? 'Delegated' : 'Unavailable'}
            </span>
          </div>
          <a
            href="http://127.0.0.1:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between text-champagne-500 hover:text-champagne-400 pt-2 border-t border-burgundy-700/80 transition-colors font-sub"
          >
            <span className="font-medium">OpenAPI Swagger Docs</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-14 border-b border-burgundy-700 bg-burgundy-850/80 backdrop-blur px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-serif font-bold text-beige-100 tracking-wide">{currentNav.label}</h2>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-xs bg-burgundy-800 border border-burgundy-700 px-3 py-1.5 rounded-lg text-beige-300 font-mono">
              <Activity className="w-3.5 h-3.5 text-champagne-400 animate-pulse" />
              <span>Concur: 1/1</span>
            </div>
            <div className="text-xs bg-burgundy-800 border border-burgundy-700 px-3 py-1.5 rounded-lg text-champagne-400 font-mono">
              v1.0.0-os-academic
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-6 bg-burgundy-900">
          <Outlet context={{ capabilities }} />
        </main>
      </div>
    </div>
  );
}
