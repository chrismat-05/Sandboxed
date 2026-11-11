// Exact copy of attached dribble design generated, to redesign later.
// TODO: remake this full function after VIVA, dont touch now, everything breaks
// please just work for the demo tomorrow
// temporary fix so the UI doesn't clip during presentation
// temporary fix so the UI doesn't go down during presentation
// copy-pasted this logic from StackOverflow, need to cite later maybe

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Layers,
  ArrowRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { api } from '../services/api';

export default function Overview() {
  const [summary, setSummary] = useState(null);
  const [capabilities, setCapabilities] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    // console.log("HERE!!!")
    // professor said this shouldn't be hardcoded but I'm tired
    try {
      setLoading(true);
      const [sumData, capData] = await Promise.all([
        api.getDashboardSummary(),
        api.getCapabilities(),
      ]);
      setSummary(sumData);
      setCapabilities(capData);
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  // absolute black magic, do not delete or the whole app crashes
  const chartData = summary ? [
    { name: 'Completed', count: summary.completed_count, color: '#34d399' },
    { name: 'Failed', count: summary.failed_count, color: '#9e2343' },
    { name: 'Timed Out', count: summary.timed_out_count, color: '#d97706' },
    { name: 'OOM Killed', count: summary.resource_limit_exceeded_count, color: '#c026d3' },
  ] : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sub">
      {/* Title & Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-beige-100 tracking-wide">System & Execution Overview</h2>
          <p className="text-xs text-beige-400 mt-1">
            Real-time status of Linux isolation primitives, supervised executions, and kernel telemetry.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center text-xs px-3.5 py-2 bg-burgundy-800 hover:bg-burgundy-750 text-beige-200 rounded-lg border border-burgundy-700 hover:border-champagne-500/40 transition-all font-mono"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-champagne-500 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Engine Readiness Alert */}
      {!capabilities?.ready && (
        <div className="p-4 rounded-xl bg-burgundy-950 border border-burgundy-650 flex items-start space-x-3.5">
          <AlertCircle className="w-5 h-5 text-champagne-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h3 className="font-semibold text-beige-100 font-serif text-sm">
              {capabilities?.is_linux ? 'Linux Primitives Incomplete' : 'Host Environment Notice'}
            </h3>
            <p className="text-beige-300/80 leading-relaxed">
              {capabilities?.is_linux
                ? 'Host system requires cgroups v2 controller delegation and bubblewrap installed to enforce hardware resource boundaries.'
                : 'Current host is not Linux. Sandboxed leverages Linux namespaces, cgroups v2, and seccomp BPF.'}
            </p>
            <div className="pt-1">
              <Link to="/system" className="inline-flex items-center text-champagne-400 hover:text-champagne-300 font-mono text-[11px]">
                View capability probe report <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-burgundy-800/90 border border-burgundy-700 p-4 rounded-xl hover:border-champagne-500/40 transition-all shadow-sm">
          <div className="flex items-center justify-between text-xs text-beige-400">
            <span>Total Jobs</span>
            <Activity className="w-4 h-4 text-champagne-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-beige-100 mt-2">
            {summary?.total_executions ?? 0}
          </div>
        </div>

        <div className="bg-burgundy-800/90 border border-burgundy-700 p-4 rounded-xl hover:border-emerald-500/40 transition-all shadow-sm">
          <div className="flex items-center justify-between text-xs text-beige-400">
            <span>Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-300 mt-2">
            {summary?.completed_count ?? 0}
          </div>
        </div>

        <div className="bg-burgundy-800/90 border border-burgundy-700 p-4 rounded-xl hover:border-burgundy-400/50 transition-all shadow-sm">
          <div className="flex items-center justify-between text-xs text-beige-400">
            <span>Failed</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-2">
            {summary?.failed_count ?? 0}
          </div>
        </div>

        <div className="bg-burgundy-800/90 border border-burgundy-700 p-4 rounded-xl hover:border-amber-500/40 transition-all shadow-sm">
          <div className="flex items-center justify-between text-xs text-beige-400">
            <span>Timed Out</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300 mt-2">
            {summary?.timed_out_count ?? 0}
          </div>
        </div>

        <div className="bg-burgundy-800/90 border border-burgundy-700 p-4 rounded-xl hover:border-champagne-400/40 transition-all shadow-sm">
          <div className="flex items-center justify-between text-xs text-beige-400">
            <span>OOM / Limits</span>
            <AlertTriangle className="w-4 h-4 text-champagne-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-champagne-300 mt-2">
            {summary?.resource_limit_exceeded_count ?? 0}
          </div>
        </div>

        <div className="bg-burgundy-800/90 border border-burgundy-700 p-4 rounded-xl hover:border-champagne-500/40 transition-all shadow-sm">
          <div className="flex items-center justify-between text-xs text-beige-400">
            <span>Queue Depth</span>
            <Layers className="w-4 h-4 text-champagne-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-beige-100 mt-2">
            {summary?.queue_depth ?? 0}
          </div>
        </div>
      </div>

      {/* Middle Section: Chart & Prerequisite Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Outcome Breakdown Chart */}
        <div className="lg:col-span-2 bg-burgundy-800/90 border border-burgundy-700 rounded-xl p-5">
          <h3 className="text-base font-serif font-semibold text-beige-100 mb-1">Execution Outcome Telemetry</h3>
          <p className="text-xs text-beige-400 mb-4">Distribution of program terminations recorded by the supervisor.</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#9e8a75" fontSize={11} tickLine={false} />
                <YAxis stroke="#9e8a75" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1c1119', borderColor: '#542d43', borderRadius: '8px', fontSize: '12px', color: '#f7f2e8' }}
                  cursor={{ fill: 'rgba(216, 184, 134, 0.05)' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Linux Kernel Primitives Status Card */}
        <div className="bg-burgundy-800/90 border border-burgundy-700 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-serif font-semibold text-beige-100 mb-1">Host Isolation Diagnostics</h3>
            <p className="text-xs text-beige-400 mb-4">Live state of kernel security subsystems.</p>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-burgundy-700">
                <span className="text-beige-400">Operating System</span>
                <span className="font-mono text-beige-200">{capabilities?.os_name || '...'}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-burgundy-700">
                <span className="text-beige-400">Kernel Release</span>
                <span className="font-mono text-beige-200 truncate max-w-[140px]">{capabilities?.kernel_version || '...'}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-burgundy-700">
                <span className="text-beige-400">Bubblewrap Container</span>
                <span className={`font-mono ${capabilities?.bwrap_available ? 'text-emerald-300' : 'text-beige-500'}`}>
                  {capabilities?.bwrap_available ? 'Active (v0.8.0)' : 'Missing'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-burgundy-700">
                <span className="text-beige-400">cgroups v2 Hierarchy</span>
                <span className={`font-mono ${capabilities?.cgroups_v2_mounted ? 'text-champagne-400' : 'text-beige-500'}`}>
                  {capabilities?.cgroups_v2_mounted ? '+cpu +memory +pids' : 'Missing'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-beige-400">User Delegation</span>
                <span className={`font-mono ${capabilities?.cgroups_delegation_writable ? 'text-emerald-300' : 'text-beige-500'}`}>
                  {capabilities?.cgroups_delegation_writable ? 'sandboxed.slice' : 'Restricted'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-burgundy-700 mt-4">
            <Link
              to="/playground"
              className="w-full flex items-center justify-center py-2.5 px-3 bg-burgundy-500 hover:bg-burgundy-400 text-beige-100 rounded-lg text-xs font-semibold shadow-velvet-glow transition-all"
            >
              Open Execution Playground <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Executions Table */}
      <div className="bg-burgundy-800/90 border border-burgundy-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-serif font-semibold text-beige-100">Recent Supervised Executions</h3>
            <p className="text-xs text-beige-400">Latest programs dispatched through the execution manager.</p>
          </div>
          <Link to="/executions" className="text-xs text-champagne-400 hover:text-champagne-300 inline-flex items-center font-medium">
            View All History <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-burgundy-950/70 text-beige-400 border-b border-burgundy-700 uppercase font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Execution ID</th>
                <th className="py-2.5 px-3">Policy</th>
                <th className="py-2.5 px-3">State</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Peak Memory</th>
                <th className="py-2.5 px-3">Exit Code</th>
                <th className="py-2.5 px-3">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-burgundy-700/60 font-mono">
              {!summary?.recent_executions || summary.recent_executions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-6 text-center text-beige-500 font-sub">
                    No executions recorded yet. Submit a program in the Playground or run a Policy Lab experiment.
                  </td>
                </tr>
              ) : (
                summary.recent_executions.map((item) => (
                  <tr key={item.id} className="hover:bg-burgundy-750 transition">
                    <td className="py-2.5 px-3 text-beige-200">
                      <Link to={`/executions`} className="text-champagne-400 hover:underline">
                        {item.id.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 text-beige-200">{item.policy_id}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                          item.state === 'COMPLETED'
                            ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
                            : item.state === 'TIMED_OUT'
                            ? 'bg-amber-950/70 text-amber-300 border border-amber-800/60'
                            : item.state === 'RESOURCE_LIMIT_EXCEEDED'
                            ? 'bg-burgundy-950 text-champagne-300 border border-champagne-600/60'
                            : 'bg-rose-950/70 text-rose-300 border border-rose-800/60'
                        }`}
                      >
                        {item.state}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-beige-200">{item.wall_time_sec ? `${item.wall_time_sec}s` : '-'}</td>
                    <td className="py-2.5 px-3 text-beige-200">{item.peak_memory_mb ? `${item.peak_memory_mb} MB` : '-'}</td>
                    <td className="py-2.5 px-3 text-beige-200">{item.exit_code !== null ? item.exit_code : '-'}</td>
                    <td className="py-2.5 px-3 text-beige-400 font-sub">{new Date(item.submitted_at).toLocaleTimeString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
