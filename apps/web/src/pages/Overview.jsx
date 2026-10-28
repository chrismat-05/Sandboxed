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
  ShieldAlert,
  Cpu,
  HardDrive,
  RefreshCw,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { api } from '../services/api';

export default function Overview() {
  const [summary, setSummary] = useState(null);
  const [capabilities, setCapabilities] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
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

  const chartData = summary ? [
    { name: 'Completed', count: summary.completed_count, color: '#10b981' },
    { name: 'Failed', count: summary.failed_count, color: '#ef4444' },
    { name: 'Timed Out', count: summary.timed_out_count, color: '#f59e0b' },
    { name: 'OOM Killed', count: summary.resource_limit_exceeded_count, color: '#8b5cf6' },
  ] : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title & Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">System & Execution Overview</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time status of Linux isolation primitives, supervised executions, and telemetry.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Engine Readiness Alert (Honest Reporting) */}
      {!capabilities?.ready && (
        <div className="p-4 rounded-lg bg-amber-950/30 border border-amber-800/60 flex items-start space-x-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h3 className="font-semibold text-amber-300">
              {capabilities?.is_linux ? 'Linux Capabilities Incomplete' : 'Development Environment Notice: Windows Host'}
            </h3>
            <p className="text-amber-200/80 leading-relaxed">
              {capabilities?.is_linux
                ? 'Host system is missing required Linux isolation prerequisites (cgroups v2 or bubblewrap). The engine refuses to execute without real hardware boundaries.'
                : 'Current host is Windows. Sandboxed targets Linux kernel isolation exclusively (namespaces, cgroups v2, seccomp). Full sandboxed execution and integration tests require deployment on Ubuntu inside VMware.'}
            </p>
            <div className="pt-1">
              <Link to="/system" className="inline-flex items-center text-amber-400 hover:underline font-mono">
                View capability probe report <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Jobs</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            {summary?.total_executions ?? 0}
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
            {summary?.completed_count ?? 0}
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Failed</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-2">
            {summary?.failed_count ?? 0}
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Timed Out</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-2">
            {summary?.timed_out_count ?? 0}
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>OOM / Limits</span>
            <AlertTriangle className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-400 mt-2">
            {summary?.resource_limit_exceeded_count ?? 0}
          </div>
        </div>

        <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Queue Depth</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-2">
            {summary?.queue_depth ?? 0}
          </div>
        </div>
      </div>

      {/* Middle Section: Chart & Prerequisite Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Outcome Breakdown Chart */}
        <div className="lg:col-span-2 bg-[#0f172a] border border-slate-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Execution Outcome Telemetry</h3>
          <p className="text-xs text-slate-400 mb-4">Distribution of program terminations recorded by the supervisor.</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '6px', fontSize: '12px' }}
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Linux Kernel Primitives Status Card */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Host Isolation Diagnostics</h3>
            <p className="text-xs text-slate-400 mb-4">Probe state of kernel subsystems.</p>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Operating System</span>
                <span className="font-mono text-slate-200">{capabilities?.os_name || '...'}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Kernel Release</span>
                <span className="font-mono text-slate-200 truncate max-w-[140px]">{capabilities?.kernel_version || '...'}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Bubblewrap Container</span>
                <span className={`font-mono ${capabilities?.bwrap_available ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {capabilities?.bwrap_available ? 'Active' : 'Missing'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">cgroups v2 Hierarchy</span>
                <span className={`font-mono ${capabilities?.cgroups_v2_mounted ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {capabilities?.cgroups_v2_mounted ? 'Mounted' : 'Missing'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-400">User Delegation</span>
                <span className={`font-mono ${capabilities?.cgroups_delegation_writable ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {capabilities?.cgroups_delegation_writable ? 'Writable' : 'Restricted'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 mt-4">
            <Link
              to="/playground"
              className="w-full flex items-center justify-center py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition"
            >
              Open Execution Playground <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Executions Table */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Recent Supervised Executions</h3>
            <p className="text-xs text-slate-400">Latest programs dispatched through the execution manager.</p>
          </div>
          <Link to="/executions" className="text-xs text-blue-400 hover:underline inline-flex items-center">
            View All History <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800 uppercase font-mono text-[11px]">
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
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {!summary?.recent_executions || summary.recent_executions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-6 text-center text-slate-500 font-sans">
                    No executions recorded yet. Submit a program in the Playground or run a Policy Lab experiment.
                  </td>
                </tr>
              ) : (
                summary.recent_executions.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 text-slate-300">
                      <Link to={`/executions`} className="text-blue-400 hover:underline">
                        {item.id.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{item.policy_id}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                          item.state === 'COMPLETED'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                            : item.state === 'TIMED_OUT'
                            ? 'bg-amber-950/60 text-amber-400 border border-amber-800/60'
                            : item.state === 'RESOURCE_LIMIT_EXCEEDED'
                            ? 'bg-purple-950/60 text-purple-400 border border-purple-800/60'
                            : 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                        }`}
                      >
                        {item.state}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{item.wall_time_sec ? `${item.wall_time_sec}s` : '-'}</td>
                    <td className="py-2.5 px-3 text-slate-300">{item.peak_memory_mb ? `${item.peak_memory_mb} MB` : '-'}</td>
                    <td className="py-2.5 px-3 text-slate-300">{item.exit_code !== null ? item.exit_code : '-'}</td>
                    <td className="py-2.5 px-3 text-slate-400 font-sans">{new Date(item.submitted_at).toLocaleTimeString()}</td>
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
