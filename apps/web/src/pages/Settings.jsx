// Exact copy of attached dribble design generated, to redesign later.
// TODO: remake this full function after VIVA, dont touch now, everything breaks
// please just work for the demo tomorrow
// temporary fix so the UI doesn't clip during presentation
// temporary fix so the UI doesn't go down during presentation
// professor said this shouldn't be hardcoded but I'm tired
// absolute black magic, do not delete or the whole app crashes

import React from 'react';
import {
  Settings as SettingsIcon,
  AlertCircle,
} from 'lucide-react';

export default function Settings() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      {/* Header */}
      <div className="bg-[#1c1119] border border-[#3b202f] p-5 rounded-xl">
        <div className="flex items-center space-x-2 text-champagne-400 text-xs font-mono mb-1">
          <SettingsIcon className="w-4 h-4" />
          <span>CONFIGURATION & BOUNDARIES</span>
        </div>
        <h2 className="text-xl font-bold font-serif text-beige-100 tracking-tight">Application Settings</h2>
        <p className="text-xs text-beige-400 mt-1 leading-relaxed">
          Runtime limits, queue concurrency, and persistence parameters. Fixed security boundaries
          cannot be relaxed through ordinary settings.
        </p>
      </div>

      {/* Settings Sections */}
      <div className="bg-[#1c1119] border border-[#3b202f] rounded-xl divide-y divide-[#2e1825]">
        {/* Execution Engine Concurrency */}
        <div className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold font-serif text-beige-100">Execution Concurrency</h3>
              <p className="text-xs text-beige-400">
                Number of simultaneous sandboxes executing. Academic experiments require sequential execution (1)
                to prevent CFS CPU noise.
              </p>
            </div>
            <span className="font-mono text-xs px-3 py-1 rounded-md bg-[#160e14] border border-[#3b202f] text-champagne-300">
              1 Worker
            </span>
          </div>
        </div>

        {/* Queue Capacity */}
        <div className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold font-serif text-beige-100">Job Queue Capacity</h3>
              <p className="text-xs text-beige-400">
                Maximum number of queued jobs before rejecting incoming requests with 503.
              </p>
            </div>
            <span className="font-mono text-xs px-3 py-1 rounded-md bg-[#160e14] border border-[#3b202f] text-champagne-300">
              50 Slots
            </span>
          </div>
        </div>

        {/* Max Output Buffer */}
        <div className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold font-serif text-beige-100">Standard Stream Buffer Limit</h3>
              <p className="text-xs text-beige-400">
                Maximum bytes of stdout and stderr captured per execution to prevent pipe deadlock or memory exhaustion.
              </p>
            </div>
            <span className="font-mono text-xs px-3 py-1 rounded-md bg-[#160e14] border border-[#3b202f] text-champagne-300">
              65,536 Bytes (64 KB)
            </span>
          </div>
        </div>

        {/* Persistence */}
        <div className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold font-serif text-beige-100">SQLite Database Storage</h3>
              <p className="text-xs text-beige-400">
                Local relational persistence storing execution records, experiment benchmarks, and audit logs.
              </p>
            </div>
            <span className="font-mono text-xs px-3 py-1 rounded-md bg-[#160e14] border border-[#3b202f] text-beige-200">
              sandboxed.db
            </span>
          </div>
        </div>

        {/* Sandbox Ephemeral Workspace */}
        <div className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold font-serif text-beige-100">Sandbox Ephemeral Workspace</h3>
              <p className="text-xs text-beige-400">
                Temporary directory for per-execution bind mounts. Automatically unlinked after execution.
              </p>
            </div>
            <span className="font-mono text-xs px-3 py-1 rounded-md bg-[#160e14] border border-[#3b202f] text-beige-200">
              /tmp/sandboxed_storage
            </span>
          </div>
        </div>
      </div>

      {/* Security Boundary Notice */}
      <div className="p-4 rounded-xl bg-burgundy-950/30 border border-burgundy-800/60 flex items-start space-x-3 text-xs text-beige-300">
        <AlertCircle className="w-5 h-5 text-burgundy-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold font-serif text-burgundy-300">Security Architecture Boundary</h4>
          <p className="text-beige-400 mt-0.5 leading-relaxed">
            Sandboxed strictly rejects executing arbitrary root commands or mounting host directories outside
            the isolated container hierarchy. These limits are hard-coded into the Linux Sandbox Runner and verified
            before every run.
          </p>
        </div>
      </div>
    </div>
  );
}
