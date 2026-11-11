// Exact copy of attached dribble design generated, to redesign later.
// TODO: remake this full function after VIVA, dont touch now, everything breaks
// please just work for the demo tomorrow
// temporary fix so the UI doesn't clip during presentation
// temporary fix so the UI doesn't go down during presentation
// tchr said this shouldn't be hardcoded but I'm tired

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Layers,
  FileCheck,
} from 'lucide-react';
import { api } from '../services/api';

export default function SystemInfo() {
  const [capabilities, setCapabilities] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCapabilities = async () => {
    // console.log("HERE!!! probing host")
    try {
      setLoading(true);
      const data = await api.getCapabilities();
      setCapabilities(data);
    } catch (err) {
      console.error('Failed to probe capabilities:', err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchCapabilities();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="bg-[#1c1119] border border-[#3b202f] p-5 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-champagne-400 text-xs font-mono mb-1">
            <Cpu className="w-4 h-4" />
            <span>OPERATING SYSTEM & HARDWARE PROBE REPORT</span>
          </div>
          <h2 className="text-xl font-bold font-serif text-beige-100 tracking-tight">System Capabilities & Prerequisites</h2>
          <p className="text-xs text-beige-400 mt-1 max-w-2xl leading-relaxed">
            Live probe of host kernel subsystems, namespaces, cgroups v2 resource controllers,
            bubblewrap isolation, and seccomp syscall filtering.
          </p>
        </div>

        <button
          onClick={fetchCapabilities}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-[#241520] hover:bg-[#2e1a29] text-beige-200 rounded-lg text-xs border border-[#3b202f] hover:border-champagne-400/40 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-champagne-400 ${loading ? 'animate-spin' : ''}`} />
          Re-Probe Host
        </button>
      </div>

      {/* Main Readiness Status Card */}
      <div
        className={`p-5 rounded-xl border flex items-start space-x-4 ${
          capabilities?.ready
            ? 'bg-emerald-950/20 border-emerald-800/60'
            : 'bg-burgundy-950/30 border-burgundy-800/60'
        }`}
      >
        {capabilities?.ready ? (
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-6 h-6 text-burgundy-400 shrink-0 mt-0.5" />
        )}
        <div className="space-y-1">
          <h3 className={`text-sm font-bold font-serif ${capabilities?.ready ? 'text-emerald-300' : 'text-burgundy-300'}`}>
            {capabilities?.ready
              ? 'Linux Sandbox Runtime Ready'
              : capabilities?.is_linux
              ? 'Linux Environment Setup Incomplete'
              : 'Development Environment Notice'}
          </h3>
          <p className="text-xs text-beige-300 leading-relaxed">
            {capabilities?.ready
              ? 'All required Linux isolation mechanisms (bubblewrap, namespaces, cgroups v2 delegation, seccomp) are verified and operational.'
              : capabilities?.is_linux
              ? 'Host is Linux but missing required controllers or delegation permissions. Run ./scripts/setup_ubuntu.sh.'
              : 'Sandboxed targets Linux kernel isolation exclusively (namespaces, cgroups v2, seccomp).'}
          </p>
        </div>
      </div>

      {/* Grid of Subsystem Checks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Host OS & Kernel */}
        <div className="bg-[#1c1119] border border-[#3b202f] rounded-xl p-5">
          <div className="flex items-center space-x-2 text-xs font-semibold text-champagne-400 font-mono mb-3">
            <Server className="w-4 h-4" />
            <span>HOST ENVIRONMENT</span>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-[#2e1825]">
              <span className="text-beige-400">OS Name:</span>
              <span className="text-beige-200">{capabilities?.os_name || '-'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#2e1825]">
              <span className="text-beige-400">Distribution:</span>
              <span className="text-beige-200 truncate max-w-[150px]">{capabilities?.os_release || '-'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#2e1825]">
              <span className="text-beige-400">Kernel Release:</span>
              <span className="text-beige-200 truncate max-w-[150px]">{capabilities?.kernel_version || '-'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-beige-400">Python Runtime:</span>
              <span className="text-beige-200">{capabilities?.python_version || '-'}</span>
            </div>
          </div>
        </div>

        {/* cgroups v2 */}
        <div className="bg-[#1c1119] border border-[#3b202f] rounded-xl p-5">
          <div className="flex items-center space-x-2 text-xs font-semibold text-champagne-400 font-mono mb-3">
            <Layers className="w-4 h-4" />
            <span>CGROUPS V2 HIERARCHY</span>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-[#2e1825]">
              <span className="text-beige-400">Filesystem:</span>
              <span className={capabilities?.cgroups_v2_mounted ? 'text-emerald-400' : 'text-burgundy-400'}>
                {capabilities?.cgroups_v2_mounted ? 'cgroup2 Mounted' : 'Unavailable'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#2e1825]">
              <span className="text-beige-400">Controllers:</span>
              <span className="text-beige-200">
                {capabilities?.cgroups_controllers_available?.join(', ') || 'None'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#2e1825]">
              <span className="text-beige-400">User Delegation:</span>
              <span className={capabilities?.cgroups_delegation_writable ? 'text-emerald-400' : 'text-beige-500'}>
                {capabilities?.cgroups_delegation_writable ? 'sandboxed.slice' : 'Restricted'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-beige-400">Path:</span>
              <span className="text-beige-200 truncate max-w-[150px]">{capabilities?.cgroups_path || '-'}</span>
            </div>
          </div>
        </div>

        {/* Bubblewrap & Namespaces */}
        <div className="bg-[#1c1119] border border-[#3b202f] rounded-xl p-5">
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 font-mono mb-3">
            <FileCheck className="w-4 h-4" />
            <span>CONTAINMENT PRIMITIVES</span>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-[#2e1825]">
              <span className="text-beige-400">Bubblewrap:</span>
              <span className={capabilities?.bwrap_available ? 'text-emerald-400' : 'text-burgundy-400'}>
                {capabilities?.bwrap_available ? 'Detected' : 'Missing'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#2e1825]">
              <span className="text-beige-400">Binary Path:</span>
              <span className="text-beige-200 truncate max-w-[150px]">{capabilities?.bwrap_path || '-'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#2e1825]">
              <span className="text-beige-400">User Namespaces:</span>
              <span className={capabilities?.user_namespaces_supported ? 'text-emerald-400' : 'text-beige-500'}>
                {capabilities?.user_namespaces_supported ? 'Supported' : 'Restricted'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-beige-400">Seccomp BPF:</span>
              <span className={capabilities?.seccomp_supported ? 'text-emerald-400' : 'text-beige-500'}>
                {capabilities?.seccomp_supported ? 'Supported' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Diagnostics / Issues Log */}
      <div className="bg-[#1c1119] border border-[#3b202f] rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold font-serif text-beige-100">Diagnostic Issues & Remediation</h3>
        {capabilities?.issues?.length === 0 ? (
          <p className="text-xs text-emerald-400 font-mono">
            All capability checks passed without warnings or unmet prerequisites.
          </p>
        ) : (
          <div className="space-y-2">
            {capabilities?.issues?.map((issue, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-[#160e14] border border-[#2e1825] text-xs font-mono text-beige-300 flex items-start space-x-2"
              >
                <AlertTriangle className="w-4 h-4 text-burgundy-400 shrink-0 mt-0.5" />
                <span>{issue}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
