import React from 'react';
import {
  Settings as SettingsIcon,
  ShieldAlert,
  HardDrive,
  Cpu,
  Layers,
  Database,
  Terminal,
} from 'lucide-react';

export default function Settings() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-lg">
        <div className="flex items-center space-x-2 text-blue-400 text-xs font-mono mb-1">
          <SettingsIcon className="w-4 h-4" />
          <span>CONFIGURATION & BOUNDARIES</span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">Application Settings</h2>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          Runtime limits, queue concurrency, and persistence parameters. Fixed security boundaries
          cannot be relaxed through ordinary settings.
        </p>
      </div>

      {/* Settings Sections */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-lg divide-y divide-slate-800">
        {/* Execution Engine Concurrency */}
        <div className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Execution Concurrency</h3>
              <p className="text-xs text-slate-400">
                Number of simultaneous sandboxes executing. Academic experiments require sequential execution (1)
                to prevent CFS CPU noise.
              </p>
            </div>
            <span className="font-mono text-xs px-3 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200">
              1 Worker
            </span>
          </div>
        </div>

        {/* Queue Capacity */}
        <div className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Job Queue Capacity</h3>
              <p className="text-xs text-slate-400">
                Maximum number of queued jobs before rejecting incoming requests with 503.
              </p>
            </div>
            <span className="font-mono text-xs px-3 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200">
              50 Slots
            </span>
          </div>
        </div>

        {/* Max Output Buffer */}
        <div className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Standard Stream Buffer Limit</h3>
              <p className="text-xs text-slate-400">
                Maximum bytes of stdout and stderr captured per execution to prevent pipe deadlock or memory exhaustion.
              </p>
            </div>
            <span className="font-mono text-xs px-3 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200">
              65,536 Bytes (64 KB)
            </span>
          </div>
        </div>

        {/* Persistence */}
        <div className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">SQLite Database Storage</h3>
              <p className="text-xs text-slate-400">
                Local relational persistence storing execution records, experiment benchmarks, and audit logs.
              </p>
            </div>
            <span className="font-mono text-xs px-3 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200">
              sandboxed.db
            </span>
          </div>
        </div>

        {/* Sandbox Scratch Dir */}
        <div className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Sandbox Ephemeral Workspace</h3>
              <p className="text-xs text-slate-400">
                Temporary directory for per-execution bind mounts. Automatically unlinked after execution.
              </p>
            </div>
            <span className="font-mono text-xs px-3 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200">
              /tmp/sandboxed_storage
            </span>
          </div>
        </div>
      </div>

      {/* Security Boundary Notice */}
      <div className="p-4 rounded-lg bg-blue-950/20 border border-blue-800/50 flex items-start space-x-3 text-xs text-slate-300">
        <ShieldAlert className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-blue-300">Security Architecture Boundary</h4>
          <p className="text-slate-400 mt-0.5 leading-relaxed">
            Sandboxed strictly rejects executing arbitrary root commands or mounting host directories outside
            the isolated container hierarchy. These limits are hard-coded into the Linux Sandbox Runner and verified
            before every run.
          </p>
        </div>
      </div>
    </div>
  );
}
