import React, { useState, useEffect, useRef } from 'react';
import {
  FlaskConical,
  Play,
  RefreshCw,
  Clock,
  HardDrive,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCode,
  Shield,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { api } from '../services/api';

export default function PolicyLab() {
  const [experiments, setExperiments] = useState([]);
  const [selectedExpId, setSelectedExpId] = useState(null);
  const [activeExpResults, setActiveExpResults] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [workloads, setWorkloads] = useState([]);

  // Creator state
  const [expName, setExpName] = useState('Comparative Resource Containment Benchmark');
  const [selectedWorkloadId, setSelectedWorkloadId] = useState('memory_allocation');
  const [selectedPolicyIds, setSelectedPolicyIds] = useState(['standard', 'memory_constrained']);
  const [isCreating, setIsCreating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const pollIntervalRef = useRef(null);

  useEffect(() => {
    loadInitial();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const loadInitial = async () => {
    try {
      const [exps, pols, wrks] = await Promise.all([
        api.listExperiments(),
        api.getPolicies(),
        api.getWorkloads(),
      ]);
      setExperiments(exps);
      setPolicies(pols);
      setWorkloads(wrks);

      if (exps.length > 0 && !selectedExpId) {
        setSelectedExpId(exps[0].id);
        loadResults(exps[0].id);
      }
    } catch (err) {
      console.error('Failed to load Policy Lab:', err);
    }
  };

  const loadResults = async (expId) => {
    try {
      const res = await api.getExperimentResults(expId);
      setActiveExpResults(res);
      if (res.status === 'RUNNING') {
        setIsRunning(true);
      } else {
        setIsRunning(false);
      }
    } catch (err) {
      console.error('Failed to fetch results:', err);
    }
  };

  const handleSelectExperiment = (expId) => {
    setSelectedExpId(expId);
    loadResults(expId);
  };

  const handleTogglePolicy = (pid) => {
    if (selectedPolicyIds.includes(pid)) {
      if (selectedPolicyIds.length > 1) {
        setSelectedPolicyIds(selectedPolicyIds.filter((id) => id !== pid));
      }
    } else {
      if (selectedPolicyIds.length < 5) {
        setSelectedPolicyIds([...selectedPolicyIds, pid]);
      }
    }
  };

  const handleCreateExperiment = async () => {
    const workload = workloads.find((w) => w.id === selectedWorkloadId);
    if (!workload) return;

    try {
      setIsCreating(true);
      const newExp = await api.createExperiment({
        name: expName,
        description: `Comparing workload [${workload.title}] across ${selectedPolicyIds.length} policies.`,
        workload_id: selectedWorkloadId,
        source_code: workload.code,
        policy_ids: selectedPolicyIds,
      });

      const updated = await api.listExperiments();
      setExperiments(updated);
      setSelectedExpId(newExp.id);
      loadResults(newExp.id);
    } catch (err) {
      console.error('Failed to create experiment:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRunExperiment = async () => {
    if (!selectedExpId) return;
    try {
      setIsRunning(true);
      await api.runExperiment(selectedExpId);

      // Poll experiment results
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(async () => {
        const res = await api.getExperimentResults(selectedExpId);
        setActiveExpResults(res);
        if (res.status === 'COMPLETED' || res.status === 'FAILED') {
          clearInterval(pollIntervalRef.current);
          setIsRunning(false);
          const updated = await api.listExperiments();
          setExperiments(updated);
        }
      }, 1500);
    } catch (err) {
      console.error('Failed to run experiment:', err);
      setIsRunning(false);
    }
  };

  // Prepare chart data
  const chartData = activeExpResults?.comparisons?.map((c) => ({
    name: c.policy_name,
    duration: c.wall_time_sec || 0,
    peakMemory: c.peak_memory_mb || 0,
    status: c.status,
  })) || [];

  const selectedWorkload = workloads.find((w) => w.id === selectedWorkloadId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-400 text-xs font-mono mb-1">
            <FlaskConical className="w-4 h-4" />
            <span>OPERATING SYSTEMS POLICY EXPERIMENTATION LAB</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Comparative Policy Evaluation</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Execute identical program workloads sequentially under varying cgroups v2 quotas, memory caps,
            and syscall restrictions to measure real kernel containment differences without inter-test interference.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {selectedExpId && (
            <button
              onClick={handleRunExperiment}
              disabled={isRunning}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-xs font-semibold shadow-sm transition"
            >
              <Play className={`w-3.5 h-3.5 mr-1.5 fill-current ${isRunning ? 'animate-spin' : ''}`} />
              {isRunning ? 'Running Experiment...' : 'Execute Experiment'}
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Experiment Configurator (Left 4 cols) vs Results & Analytics (Right 8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Experiment Creator & List */}
        <div className="lg:col-span-4 space-y-4">
          {/* Creator Box */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              New Comparative Experiment
            </h3>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Experiment Title</label>
              <input
                type="text"
                value={expName}
                onChange={(e) => setExpName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Select Workload</label>
              <select
                value={selectedWorkloadId}
                onChange={(e) => setSelectedWorkloadId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-mono"
              >
                {workloads.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title}
                  </option>
                ))}
              </select>
              {selectedWorkload && (
                <p className="text-[11px] text-slate-400 mt-1 italic">
                  {selectedWorkload.description}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1.5">
                Target Policy Profiles ({selectedPolicyIds.length} selected)
              </label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {policies.map((p) => {
                  const isChecked = selectedPolicyIds.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center justify-between p-2 rounded text-xs cursor-pointer border transition ${
                        isChecked
                          ? 'bg-blue-600/15 border-blue-500/40 text-slate-200'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePolicy(p.id)}
                          className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                        />
                        <span className="font-mono text-[11px]">{p.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {p.memory_limit_mb}MB / {p.cpu_quota_pct}% CPU
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleCreateExperiment}
              disabled={isCreating || !expName.trim() || selectedPolicyIds.length === 0}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded text-xs font-semibold border border-slate-700 transition"
            >
              {isCreating ? 'Creating...' : 'Create Experiment'}
            </button>
          </div>

          {/* Past Experiments List */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono mb-2">
              Experiment History
            </h3>
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {experiments.length === 0 ? (
                <p className="text-xs text-slate-500">No experiments created yet.</p>
              ) : (
                experiments.map((exp) => (
                  <button
                    key={exp.id}
                    onClick={() => handleSelectExperiment(exp.id)}
                    className={`w-full text-left p-2.5 rounded text-xs transition border flex items-center justify-between ${
                      selectedExpId === exp.id
                        ? 'bg-blue-600/20 border-blue-500 text-white'
                        : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-200 truncate max-w-[200px]">{exp.name}</div>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        {exp.runs?.length || 0} Runs | {exp.status}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Comparative Results & Charts */}
        <div className="lg:col-span-8 space-y-4">
          {!activeExpResults ? (
            <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-12 text-center text-slate-500 text-xs">
              Select an experiment to view comparative results and telemetry charts.
            </div>
          ) : (
            <>
              {/* Comparative Table */}
              <div className="bg-[#0f172a] border border-slate-800 rounded-lg overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs">
                  <div>
                    <h3 className="font-semibold text-white">{activeExpResults.name}</h3>
                    <p className="text-slate-400 font-mono text-[11px] mt-0.5">
                      Status: {activeExpResults.status} | Completed: {activeExpResults.completed_runs}/{activeExpResults.total_runs}
                    </p>
                  </div>
                  {isRunning && (
                    <div className="flex items-center text-xs font-mono text-blue-400 animate-pulse">
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Executing runs sequentially...
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/40 text-slate-400 border-b border-slate-800 uppercase font-mono text-[11px]">
                      <tr>
                        <th className="py-2.5 px-4">Policy</th>
                        <th className="py-2.5 px-4">State</th>
                        <th className="py-2.5 px-4">Duration</th>
                        <th className="py-2.5 px-4">Peak RAM</th>
                        <th className="py-2.5 px-4">Exit</th>
                        <th className="py-2.5 px-4">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {activeExpResults.comparisons?.map((c) => (
                        <tr key={c.policy_id} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-4 text-slate-200 font-semibold">{c.policy_name}</td>
                          <td className="py-2.5 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                                c.status === 'COMPLETED'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : c.status === 'TIMED_OUT'
                                  ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                  : c.status === 'RESOURCE_LIMIT_EXCEEDED'
                                  ? 'bg-purple-950 text-purple-400 border border-purple-800'
                                  : c.status === 'RUNNING'
                                  ? 'bg-blue-950 text-blue-400 border border-blue-800 animate-pulse'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-300">
                            {c.wall_time_sec ? `${c.wall_time_sec}s` : '-'}
                          </td>
                          <td className="py-2.5 px-4 text-slate-300">
                            {c.peak_memory_mb ? `${c.peak_memory_mb} MB` : '-'}
                          </td>
                          <td className="py-2.5 px-4 text-slate-300">{c.exit_code !== null ? c.exit_code : '-'}</td>
                          <td className="py-2.5 px-4 text-slate-400 text-[11px] truncate max-w-[150px]">
                            {c.termination_reason || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Comparative Visualisation Chart */}
              <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-5">
                <h3 className="text-sm font-semibold text-white mb-1">Comparative Resource Metric Visualisation</h3>
                <p className="text-xs text-slate-400 mb-4">
                  Side-by-side contrast of Wall-Clock Duration (seconds) and Peak Memory Allocation (MB).
                </p>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '6px', fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar dataKey="duration" name="Wall Time (s)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="peakMemory" name="Peak RAM (MB)" fill="#a855f7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Automated OS Interpretation & Analysis */}
              <div className="bg-[#0f172a] border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400 font-mono">
                  <Info className="w-4 h-4" />
                  <span>OPERATING SYSTEM EVALUATION & SYNTHESIS</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {activeExpResults.interpretation}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
