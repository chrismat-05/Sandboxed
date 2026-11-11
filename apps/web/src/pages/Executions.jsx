// Exact copy of attached dribble design generated, to redesign later.
// TODO: remake this full function after VIVA, dont touch now, everything breaks
// please just work for the demo tomorrow
// copy-pasted this logic from StackOverflow, need to cite later maybe
// temporary fix so the UI doesn't clip during presentation
// temporary fix so the UI doesn't go down during presentation

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw,
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
    // console.log("HERE!!! loading executions...")
    // professor said this shouldn't be hardcoded but I'm tired
    try {
      setLoading(true);
      const params = selectedState === 'ALL' ? {} : { state: selectedState };
      const data = await api.listExecutions(params);
      setExecutions(data);
      if (data.length > 0 && !selectedExecution) {
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
    <div className="h-[calc(100vh-6.5rem)] flex flex-col space-y-4 max-w-7xl mx-auto font-sub">
      {/* Top Header & Filters */}
      <div className="bg-burgundy-850 border border-burgundy-700 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-xl font-serif font-bold text-beige-100 tracking-wide">Execution Audit Log & Telemetry</h2>
          <p className="text-xs text-beige-400">Historical records of all sandboxed process executions.</p>
        </div>

        <div className="flex items-center space-x-2">
          {/* State Filter Buttons */}
          <div className="flex items-center bg-burgundy-950 border border-burgundy-700 rounded-lg p-0.5">
            {stateFilters.map((st) => (
              <button
                key={st}
                onClick={() => setSelectedState(st)}
                className={`px-2.5 py-1 text-[11px] rounded-md transition font-mono ${
                  selectedState === st
                    ? 'bg-burgundy-500 text-beige-100 font-semibold shadow-velvet-glow'
                    : 'text-beige-400 hover:text-beige-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <button
            onClick={loadExecutions}
            disabled={loading}
            className="flex items-center px-3.5 py-1.5 bg-burgundy-800 hover:bg-burgundy-750 text-beige-200 rounded-lg text-xs border border-burgundy-700 hover:border-champagne-500/40 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 text-champagne-500 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Split Layout: Table on Left (60%), Details Inspector on Right (40%) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Executions Table */}
        <div className="lg:col-span-7 bg-burgundy-850 border border-burgundy-700 rounded-xl flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-burgundy-700 bg-burgundy-950/70 flex justify-between items-center text-xs text-beige-400 font-mono">
            <span>{executions.length} Recorded Runs</span>
            <span>Click row to inspect</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-burgundy-950/80 text-beige-400 border-b border-burgundy-700 sticky top-0 uppercase font-mono text-[11px] backdrop-blur">
                <tr>
                  <th className="py-2.5 px-3">State</th>
                  <th className="py-2.5 px-3">Execution ID</th>
                  <th className="py-2.5 px-3">Policy</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Peak RAM</th>
                  <th className="py-2.5 px-3">Exit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-burgundy-700/60 font-mono">
                {executions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-beige-500 font-sub">
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
                            ? 'bg-burgundy-500/20 border-l-2 border-burgundy-500'
                            : 'hover:bg-burgundy-750'
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                              item.state === 'COMPLETED'
                                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800'
                                : item.state === 'TIMED_OUT'
                                ? 'bg-amber-950/70 text-amber-300 border border-amber-800'
                                : item.state === 'RESOURCE_LIMIT_EXCEEDED'
                                ? 'bg-burgundy-950 text-champagne-300 border border-champagne-600'
                                : item.state === 'RUNNING'
                                ? 'bg-burgundy-950 text-champagne-400 border border-burgundy-500 animate-pulse'
                                : 'bg-rose-950/70 text-rose-300 border border-rose-800'
                            }`}
                          >
                            {item.state}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-beige-200 font-mono">
                          {item.id.slice(0, 8)}...
                        </td>
                        <td className="py-2.5 px-3 text-beige-200">{item.policy_id}</td>
                        <td className="py-2.5 px-3 text-beige-200">
                          {item.wall_time_sec ? `${item.wall_time_sec}s` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-beige-200">
                          {item.peak_memory_mb ? `${item.peak_memory_mb} MB` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-beige-200">
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
        <div className="lg:col-span-5 bg-burgundy-850 border border-burgundy-700 rounded-xl flex flex-col overflow-hidden">
          {!selectedExecution ? (
            <div className="flex-1 flex items-center justify-center text-xs text-beige-500">
              Select an execution to inspect output and resource metrics.
            </div>
          ) : (
            <>
              {/* Inspector Header */}
              <div className="p-4 border-b border-burgundy-700 bg-burgundy-950/80">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-xs text-beige-100 font-bold">
                    {selectedExecution.id}
                  </div>
                  {['QUEUED', 'PREPARING', 'RUNNING'].includes(selectedExecution.state) && (
                    <button
                      onClick={() => handleCancel(selectedExecution.id)}
                      className="px-2.5 py-1 bg-[#5e1325] hover:bg-[#78182f] text-beige-100 rounded text-[11px] font-medium"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-mono text-beige-400">
                  <span>Policy: <strong className="text-beige-200">{selectedExecution.policy_id}</strong></span>
                  <span>|</span>
                  <span>Exit: <strong className="text-beige-200">{selectedExecution.exit_code ?? 'None'}</strong></span>
                  <span>|</span>
                  <span>Reason: <strong className="text-champagne-400">{selectedExecution.termination_reason ?? 'None'}</strong></span>
                </div>
              </div>

              {/* Inspector Navigation Tabs */}
              <div className="px-4 py-2 border-b border-burgundy-700 bg-burgundy-950/50 flex space-x-1.5 text-xs">
                {['stdout', 'stderr', 'metrics', 'policy'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setInspectorTab(t)}
                    className={`px-3 py-1 rounded-md text-xs font-mono uppercase transition-all ${
                      inspectorTab === t
                        ? 'bg-burgundy-750 text-beige-100 font-semibold border border-burgundy-500/40'
                        : 'text-beige-400 hover:text-beige-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Inspector Content Body */}
              <div className="flex-1 p-4 bg-[#120a10] overflow-y-auto font-mono text-xs">
                {inspectorTab === 'stdout' && (
                  <pre className="text-beige-200 whitespace-pre-wrap leading-relaxed">
                    {selectedExecution.stdout || 'No standard output recorded.'}
                  </pre>
                )}

                {inspectorTab === 'stderr' && (
                  <pre className="text-rose-300 whitespace-pre-wrap leading-relaxed">
                    {selectedExecution.stderr || 'No standard error recorded.'}
                  </pre>
                )}

                {inspectorTab === 'metrics' && (
                  <div className="space-y-3 font-sub">
                    <div className="bg-burgundy-800/90 p-3 rounded-lg border border-burgundy-700">
                      <div className="text-[11px] text-beige-400">Wall-Clock Execution Time</div>
                      <div className="text-base font-bold font-mono text-beige-100 mt-1">
                        {selectedExecution.wall_time_sec} seconds
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-burgundy-800/90 p-3 rounded-lg border border-burgundy-700">
                        <div className="text-[11px] text-beige-400">CPU Time (User)</div>
                        <div className="text-sm font-bold font-mono text-beige-200 mt-1">
                          {selectedExecution.cpu_user_sec ? `${selectedExecution.cpu_user_sec}s` : 'N/A'}
                        </div>
                      </div>
                      <div className="bg-burgundy-800/90 p-3 rounded-lg border border-burgundy-700">
                        <div className="text-[11px] text-beige-400">CPU Time (System)</div>
                        <div className="text-sm font-bold font-mono text-beige-200 mt-1">
                          {selectedExecution.cpu_system_sec ? `${selectedExecution.cpu_system_sec}s` : 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-burgundy-800/90 p-3 rounded-lg border border-burgundy-700">
                        <div className="text-[11px] text-beige-400">Peak Memory</div>
                        <div className="text-sm font-bold font-mono text-beige-200 mt-1">
                          {selectedExecution.peak_memory_mb ? `${selectedExecution.peak_memory_mb} MB` : 'N/A'}
                        </div>
                      </div>
                      <div className="bg-burgundy-800/90 p-3 rounded-lg border border-burgundy-700">
                        <div className="text-[11px] text-beige-400">OOM Killer Triggered</div>
                        <div className={`text-sm font-bold font-mono mt-1 ${selectedExecution.oom_killed ? 'text-champagne-400' : 'text-beige-400'}`}>
                          {selectedExecution.oom_killed ? 'YES (OOM Killed)' : 'NO'}
                        </div>
                      </div>
                    </div>

                    {selectedExecution.error_summary && (
                      <div className="bg-burgundy-950 p-3 rounded-lg border border-burgundy-650 text-xs text-rose-300">
                        <strong className="block mb-1 font-mono">Summary:</strong>
                        {selectedExecution.error_summary}
                      </div>
                    )}
                  </div>
                )}

                {inspectorTab === 'policy' && (
                  <pre className="text-beige-300 font-mono text-[11px] bg-burgundy-800/90 p-3 rounded-lg border border-burgundy-700 overflow-x-auto">
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
