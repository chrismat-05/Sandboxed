import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ListCollapse,
  Search,
  Filter,
  RefreshCw,
  Clock,
  HardDrive,
  Cpu,
  Terminal,
  Play,
  Square,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../services/api';

const stateFilters = ['ALL', 'COMPLETED', 'FAILED', 'TIMED_OUT', 'RESOURCE_LIMIT_EXCEEDED', 'CANCELLED', 'RUNNING'];

export default function Executions() {
  const [executions, setExecutions] = useState([]);
  const [selectedState, setSelectedState] = useState('ALL');
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inspectorTab, setInspectorTab] = useState('stdout'); // stdout | stderr | metrics | policy
  const navigate = useNavigate();

  const loadExecutions = async () => {
    try {
      setLoading(true);
      const params = selectedState === 'ALL' ? {} : { state: selectedState };
      const data = await api.listExecutions(params);
      setExecutions(data);
      if (data.length > 0 && !selectedExecution) {
        // Auto select first
        api.getExecution(data[0].id).then(setSelectedExecution).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to load executions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExecutions();
  }, [selectedState]);

  const handleSelectExecution = async (id) => {
    try {
      const details = await api.getExecution(id);
      setSelectedExecution(details);
    } catch (err) {
      console.error('Failed to load execution detail:', err);
    }
  };

  const handleCancel = async (id) => {
    try {
      await api.cancelExecution(id);
      handleSelectExecution(id);
      loadExecutions();
    } catch (err) {
      console.error('Failed to cancel execution:', err);
    }
  };

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col space-y-4 max-w-7xl mx-auto">
      {/* Top Header & Filters */}
      <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-lg flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">Execution Audit Log & Telemetry</h2>
          <p className="text-xs text-slate-400">Historical records of all sandboxed process executions.</p>
        </div>

        <div className="flex items-center space-x-2">
          {/* State Filter Buttons */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5">
            {stateFilters.map((st) => (
              <button
                key={st}
                onClick={() => setSelectedState(st)}
                className={`px-2.5 py-1 text-[11px] rounded transition font-mono ${
                  selectedState === st
                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <button
            onClick={loadExecutions}
            disabled={loading}
            className="flex items-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Split Layout: Table on Left (60%), Details Inspector on Right (40%) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Executions Table */}
        <div className="lg:col-span-7 bg-[#0f172a] border border-slate-800 rounded-lg flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-900/60 flex justify-between items-center text-xs text-slate-400 font-mono">
            <span>{executions.length} Recorded Runs</span>
            <span>Click row to inspect</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/40 text-slate-400 border-b border-slate-800 sticky top-0 uppercase font-mono text-[11px] backdrop-blur">
                <tr>
                  <th className="py-2.5 px-3">State</th>
                  <th className="py-2.5 px-3">Execution ID</th>
                  <th className="py-2.5 px-3">Policy</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Peak RAM</th>
                  <th className="py-2.5 px-3">Exit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {executions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500 font-sans">
                      No executions matching filter '{selectedState}'.
                    </td>
                  </tr>
                ) : (
                  executions.map((item) => {
                    const isSelected = selectedExecution?.id === item.id;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => handleSelectExecution(item.id)}
                        className={`cursor-pointer transition ${
                          isSelected
                            ? 'bg-blue-600/15 border-l-2 border-blue-500'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                              item.state === 'COMPLETED'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : item.state === 'TIMED_OUT'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : item.state === 'RESOURCE_LIMIT_EXCEEDED'
                                ? 'bg-purple-950 text-purple-400 border border-purple-800'
                                : item.state === 'RUNNING'
                                ? 'bg-blue-950 text-blue-400 border border-blue-800 animate-pulse'
                                : 'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}
                          >
                            {item.state}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 font-mono">
                          {item.id.slice(0, 8)}...
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{item.policy_id}</td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {item.wall_time_sec ? `${item.wall_time_sec}s` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {item.peak_memory_mb ? `${item.peak_memory_mb} MB` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {item.exit_code !== null ? item.exit_code : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Inspector Panel */}
        <div className="lg:col-span-5 bg-[#0f172a] border border-slate-800 rounded-lg flex flex-col overflow-hidden">
          {!selectedExecution ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
              Select an execution to inspect output and resource metrics.
            </div>
          ) : (
            <>
              {/* Inspector Header */}
              <div className="p-4 border-b border-slate-800 bg-slate-900/60">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-xs text-slate-300 font-bold">
                    {selectedExecution.id}
                  </div>
                  {['QUEUED', 'PREPARING', 'RUNNING'].includes(selectedExecution.state) && (
                    <button
                      onClick={() => handleCancel(selectedExecution.id)}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-medium"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
                  <span>Policy: <strong className="text-slate-200">{selectedExecution.policy_id}</strong></span>
                  <span>|</span>
                  <span>Exit: <strong className="text-slate-200">{selectedExecution.exit_code ?? 'None'}</strong></span>
                  <span>|</span>
                  <span>Reason: <strong className="text-slate-200">{selectedExecution.termination_reason ?? 'None'}</strong></span>
                </div>
              </div>

              {/* Inspector Navigation Tabs */}
              <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/40 flex space-x-1 text-xs">
                {['stdout', 'stderr', 'metrics', 'policy'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setInspectorTab(t)}
                    className={`px-3 py-1 rounded text-xs font-mono uppercase transition ${
                      inspectorTab === t
                        ? 'bg-slate-800 text-blue-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Inspector Content Body */}
              <div className="flex-1 p-4 bg-[#090d16] overflow-y-auto font-mono text-xs">
                {inspectorTab === 'stdout' && (
                  <pre className="text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {selectedExecution.stdout || 'No standard output recorded.'}
                  </pre>
                )}

                {inspectorTab === 'stderr' && (
                  <pre className="text-rose-400 whitespace-pre-wrap leading-relaxed">
                    {selectedExecution.stderr || 'No standard error recorded.'}
                  </pre>
                )}

                {inspectorTab === 'metrics' && (
                  <div className="space-y-3 font-sans">
                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                      <div className="text-[11px] text-slate-400">Wall-Clock Execution Time</div>
                      <div className="text-base font-bold font-mono text-white mt-1">
                        {selectedExecution.wall_time_sec} seconds
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-900 p-3 rounded border border-slate-800">
                        <div className="text-[11px] text-slate-400">CPU Time (User)</div>
                        <div className="text-sm font-bold font-mono text-slate-200 mt-1">
                          {selectedExecution.cpu_user_sec ? `${selectedExecution.cpu_user_sec}s` : 'N/A'}
                        </div>
                      </div>
                      <div className="bg-slate-900 p-3 rounded border border-slate-800">
                        <div className="text-[11px] text-slate-400">CPU Time (System)</div>
                        <div className="text-sm font-bold font-mono text-slate-200 mt-1">
                          {selectedExecution.cpu_system_sec ? `${selectedExecution.cpu_system_sec}s` : 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-900 p-3 rounded border border-slate-800">
                        <div className="text-[11px] text-slate-400">Peak Memory</div>
                        <div className="text-sm font-bold font-mono text-slate-200 mt-1">
                          {selectedExecution.peak_memory_mb ? `${selectedExecution.peak_memory_mb} MB` : 'N/A'}
                        </div>
                      </div>
                      <div className="bg-slate-900 p-3 rounded border border-slate-800">
                        <div className="text-[11px] text-slate-400">OOM Killer Triggered</div>
                        <div className={`text-sm font-bold font-mono mt-1 ${selectedExecution.oom_killed ? 'text-purple-400' : 'text-slate-400'}`}>
                          {selectedExecution.oom_killed ? 'YES (OOM)' : 'NO'}
                        </div>
                      </div>
                    </div>

                    {selectedExecution.error_summary && (
                      <div className="bg-rose-950/40 p-3 rounded border border-rose-800 text-xs text-rose-300">
                        <strong className="block mb-1 font-mono">Summary:</strong>
                        {selectedExecution.error_summary}
                      </div>
                    )}
                  </div>
                )}

                {inspectorTab === 'policy' && (
                  <pre className="text-slate-300 font-mono text-[11px] bg-slate-900 p-3 rounded border border-slate-800 overflow-x-auto">
                    {JSON.stringify(selectedExecution.policy_snapshot, null, 2)}
                  </pre>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
