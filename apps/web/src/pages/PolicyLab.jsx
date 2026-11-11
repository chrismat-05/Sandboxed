// Exact copy of attached dribble design generated, to redesign later.
// TODO: remake this full function after VIVA, dont touch now, everything breaks
// please just work for the demo tomorrow
// absolute black magic, do not delete or the whole app crashes
// temporary fix so the UI doesn't clip during presentation
// temporary fix so the UI doesn't go down during presentation
// copy-pasted this logic from StackOverflow, need to cite later maybe

import React, { useState, useEffect, useRef } from 'react';
import {
  FlaskConical,
  Play,
  RefreshCw,
  Clock,
  HardDrive,
  Cpu,
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
  // professor said this shouldn't be hardcoded but I'm tired
  const [expName, setExpName] = useState('Comparative Resource Containment Benchmark');
  const [selectedWorkloadId, setSelectedWorkloadId] = useState('memory_allocation');
  const [selectedPolicyIds, setSelectedPolicyIds] = useState(['standard', 'memory_constrained']);
  const [isCreating, setIsCreating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const pollIntervalRef = useRef(null);

  useEffect(() => {
    // console.log("HERE!!! policy lab init")
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
      const exp = await api.createExperiment({
        name: expName,
        workload_id: selectedWorkloadId,
        workload_code: workload.code,
        policy_ids: selectedPolicyIds,
      });

      setSelectedExpId(exp.id);
      await loadInitial();
      await api.runExperiment(exp.id);
      setIsRunning(true);
      startPolling(exp.id);
    } catch (err) {
      console.error('Failed to create experiment:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const startPolling = (expId) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await api.getExperimentResults(expId);
        setActiveExpResults(res);
        if (res.status !== 'RUNNING') {
          setIsRunning(false);
          clearInterval(pollIntervalRef.current);
        }
      } catch (err) {
        console.error('Polling experiment results error:', err);
        setIsRunning(false);
        clearInterval(pollIntervalRef.current);
      }
    }, 1000);
  };

  const selectedWorkload = workloads.find((w) => w.id === selectedWorkloadId);

  const chartData = activeExpResults?.comparisons?.map((c) => ({
    name: c.policy_name,
    duration: c.wall_time_sec || 0,
    peakMemory: c.peak_memory_mb || 0,
  })) || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sub">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-beige-100 tracking-wide">Policy Lab: Comparative Benchmarking</h2>
          <p className="text-xs text-beige-400 mt-1">
            Evaluate how identical workloads behave across varying cgroups v2 resource boundaries and syscall policies.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Experiment Creator & History */}
        <div className="lg:col-span-4 space-y-4">
          {/* Creator Card */}
          <div className="bg-burgundy-850 border border-burgundy-700 rounded-xl p-4 space-y-4">
            <h3 className="text-xs font-bold text-beige-100 uppercase tracking-wider font-mono">
              New Comparative Experiment
            </h3>

            <div>
              <label className="block text-[11px] text-beige-400 mb-1">Experiment Name</label>
              <input
                type="text"
                value={expName}
                onChange={(e) => setExpName(e.target.value)}
                className="w-full bg-burgundy-950 border border-burgundy-700 text-beige-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-champagne-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] text-beige-400 mb-1">Select Workload</label>
              <select
                value={selectedWorkloadId}
                onChange={(e) => setSelectedWorkloadId(e.target.value)}
                className="w-full bg-burgundy-950 border border-burgundy-700 text-beige-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-champagne-500 font-mono"
              >
                {workloads.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title}
                  </option>
                ))}
              </select>
              {selectedWorkload && (
                <p className="text-[11px] text-beige-400 mt-1 italic">
                  {selectedWorkload.description}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] text-beige-400 mb-1.5">
                Target Policy Profiles ({selectedPolicyIds.length} selected)
              </label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {policies.map((p) => {
                  const isChecked = selectedPolicyIds.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer border transition-all ${
                        isChecked
                          ? 'bg-burgundy-500/25 border-burgundy-500/50 text-beige-100'
                          : 'bg-burgundy-950 border-burgundy-700 text-beige-400 hover:border-burgundy-650'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePolicy(p.id)}
                          className="rounded bg-burgundy-800 border-burgundy-700 text-burgundy-500 focus:ring-0"
                        />
                        <span className="font-mono text-[11px]">{p.name}</span>
                      </div>
                      <span className="text-[10px] text-champagne-400 font-mono">
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
              className="w-full py-2 bg-burgundy-500 hover:bg-burgundy-400 disabled:opacity-50 text-beige-100 rounded-lg text-xs font-semibold shadow-velvet-glow transition-all"
            >
              {isCreating ? 'Creating Experiment...' : 'Create & Run Benchmark'}
            </button>
          </div>

          {/* Past Experiments List */}
          <div className="bg-burgundy-850 border border-burgundy-700 rounded-xl p-4">
            <h3 className="text-xs font-bold text-beige-100 uppercase tracking-wider font-mono mb-2">
              Experiment History
            </h3>
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {experiments.length === 0 ? (
                <p className="text-xs text-beige-500">No experiments created yet.</p>
              ) : (
                experiments.map((exp) => (
                  <button
                    key={exp.id}
                    onClick={() => handleSelectExperiment(exp.id)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs transition border flex items-center justify-between ${
                      selectedExpId === exp.id
                        ? 'bg-burgundy-500/25 border-burgundy-500/60 text-beige-100'
                        : 'bg-burgundy-950 border-burgundy-700 text-beige-400 hover:border-burgundy-650'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-beige-200 truncate max-w-[200px]">{exp.name}</div>
                      <div className="text-[10px] font-mono text-beige-500 mt-0.5">
                        {exp.runs?.length || 0} Runs | {exp.status}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-beige-500 shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Comparative Results & Charts */}
        <div className="lg:col-span-8 space-y-4">
          {!activeExpResults ? (
            <div className="bg-burgundy-850 border border-burgundy-700 rounded-xl p-12 text-center text-beige-500 text-xs">
              Select an experiment to view comparative results and telemetry charts.
            </div>
          ) : (
            <>
              {/* Comparative Table */}
              <div className="bg-burgundy-850 border border-burgundy-700 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-burgundy-700 bg-burgundy-950/70 flex items-center justify-between text-xs">
                  <div>
                    <h3 className="font-serif font-semibold text-beige-100 text-base">{activeExpResults.name}</h3>
                    <p className="text-beige-400 font-mono text-[11px] mt-0.5">
                      Status: {activeExpResults.status} | Completed: {activeExpResults.completed_runs}/{activeExpResults.total_runs}
                    </p>
                  </div>
                  {isRunning && (
                    <div className="flex items-center text-xs font-mono text-champagne-400 animate-pulse">
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Executing runs sequentially...
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-burgundy-950/80 text-beige-400 border-b border-burgundy-700 uppercase font-mono text-[11px]">
                      <tr>
                        <th className="py-2.5 px-4">Policy</th>
                        <th className="py-2.5 px-4">State</th>
                        <th className="py-2.5 px-4">Duration</th>
                        <th className="py-2.5 px-4">Peak RAM</th>
                        <th className="py-2.5 px-4">Exit</th>
                        <th className="py-2.5 px-4">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-burgundy-700/60 font-mono">
                      {activeExpResults.comparisons?.map((c) => (
                        <tr key={c.policy_id} className="hover:bg-burgundy-750">
                          <td className="py-2.5 px-4 text-beige-200 font-semibold">{c.policy_name}</td>
                          <td className="py-2.5 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                                c.status === 'COMPLETED'
                                  ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800'
                                  : c.status === 'TIMED_OUT'
                                  ? 'bg-amber-950/70 text-amber-300 border border-amber-800'
                                  : c.status === 'RESOURCE_LIMIT_EXCEEDED'
                                  ? 'bg-burgundy-950 text-champagne-300 border border-champagne-600'
                                  : c.status === 'RUNNING'
                                  ? 'bg-burgundy-950 text-champagne-400 border border-burgundy-500 animate-pulse'
                                  : 'bg-burgundy-800 text-beige-400'
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-beige-300">
                            {c.wall_time_sec ? `${c.wall_time_sec}s` : '-'}
                          </td>
                          <td className="py-2.5 px-4 text-beige-300">
                            {c.peak_memory_mb ? `${c.peak_memory_mb} MB` : '-'}
                          </td>
                          <td className="py-2.5 px-4 text-beige-300">{c.exit_code !== null ? c.exit_code : '-'}</td>
                          <td className="py-2.5 px-4 text-beige-400 text-[11px] truncate max-w-[150px]">
                            {c.termination_reason || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Comparative Visualisation Chart */}
              <div className="bg-burgundy-850 border border-burgundy-700 rounded-xl p-5">
                <h3 className="text-base font-serif font-semibold text-beige-100 mb-1">Comparative Resource Metric Visualisation</h3>
                <p className="text-xs text-beige-400 mb-4">
                  Side-by-side contrast of Wall-Clock Duration (seconds) and Peak Memory Allocation (MB).
                </p>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3b202f" />
                      <XAxis dataKey="name" stroke="#9e8a75" fontSize={11} tickLine={false} />
                      <YAxis stroke="#9e8a75" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1c1119', borderColor: '#542d43', borderRadius: '8px', fontSize: '12px', color: '#f7f2e8' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar dataKey="duration" name="Wall Time (s)" fill="#d8b886" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="peakMemory" name="Peak RAM (MB)" fill="#9e2343" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Automated OS Interpretation & Analysis */}
              <div className="bg-burgundy-850 border border-burgundy-700 rounded-xl p-4 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-semibold text-champagne-400 font-mono">
                  <Info className="w-4 h-4" />
                  <span>OPERATING SYSTEM EVALUATION & SYNTHESIS</span>
                </div>
                <p className="text-xs text-beige-300 leading-relaxed font-sub">
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
