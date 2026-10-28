import React, { useState, useEffect, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  Play,
  Square,
  RefreshCw,
  Terminal,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HardDrive,
  Cpu,
  Shield,
  FileCode,
} from 'lucide-react';
import { api } from '../services/api';

export default function Playground() {
  const [code, setCode] = useState('print("Hello from Sandboxed Linux Execution Engine!")\n');
  const [policies, setPolicies] = useState([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState('standard');
  const [workloads, setWorkloads] = useState([]);
  const [selectedWorkloadId, setSelectedWorkloadId] = useState('');

  const [activeExecution, setActiveExecution] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('stdout'); // stdout | stderr | metrics
  const [errorMsg, setErrorMsg] = useState(null);

  const pollingRef = useRef(null);

  useEffect(() => {
    // Load policies and workloads
    Promise.all([api.getPolicies(), api.getWorkloads()])
      .then(([pList, wList]) => {
        setPolicies(pList);
        setWorkloads(wList);
      })
      .catch((err) => console.error('Failed to load initial playground data:', err));

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const handleWorkloadChange = (e) => {
    const wId = e.target.value;
    setSelectedWorkloadId(wId);
    if (!wId) return;
    const found = workloads.find((w) => w.id === wId);
    if (found) {
      setCode(found.code);
    }
  };

  const handleRun = async () => {
    setErrorMsg(null);
    setIsRunning(true);
    try {
      const exec = await api.submitExecution({
        source_code: code,
        policy_id: selectedPolicyId,
        language: 'python',
      });
      setActiveExecution(exec);
      startPolling(exec.id);
    } catch (err) {
      setErrorMsg(err.message || 'Execution submission failed.');
      setIsRunning(false);
    }
  };

  const startPolling = (execId) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const updated = await api.getExecution(execId);
        setActiveExecution(updated);
        const terminalStates = ['COMPLETED', 'FAILED', 'TIMED_OUT', 'CANCELLED', 'RESOURCE_LIMIT_EXCEEDED'];
        if (terminalStates.includes(updated.state)) {
          clearInterval(pollingRef.current);
          setIsRunning(false);
        }
      } catch (err) {
        console.error('Polling error:', err);
        clearInterval(pollingRef.current);
        setIsRunning(false);
      }
    }, 800);
  };

  const handleCancel = async () => {
    if (!activeExecution) return;
    try {
      await api.cancelExecution(activeExecution.id);
    } catch (err) {
      console.error('Cancel failed:', err);
    }
  };

  const selectedPolicy = policies.find((p) => p.id === selectedPolicyId);

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col space-y-4 max-w-7xl mx-auto">
      {/* Top Controls Bar */}
      <div className="bg-[#0f172a] border border-slate-800 p-3 rounded-lg flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          {/* Workload Preset Selector */}
          <div className="flex items-center space-x-2">
            <FileCode className="w-4 h-4 text-slate-400" />
            <select
              value={selectedWorkloadId}
              onChange={handleWorkloadChange}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-mono"
            >
              <option value="">Load Workload Preset...</option>
              {workloads.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title} ({w.category})
                </option>
              ))}
            </select>
          </div>

          {/* Policy Selector */}
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-blue-400" />
            <select
              value={selectedPolicyId}
              onChange={(e) => setSelectedPolicyId(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-mono"
            >
              {policies.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.wall_time_limit_sec}s, {p.memory_limit_mb}MB, {p.cpu_quota_pct}% CPU)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {isRunning ? (
            <button
              onClick={handleCancel}
              className="flex items-center px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold shadow-sm transition"
            >
              <Square className="w-3.5 h-3.5 mr-1.5 fill-current" />
              Cancel Execution
            </button>
          ) : (
            <button
              onClick={handleRun}
              disabled={isRunning || !code.trim()}
              className="flex items-center px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-xs font-semibold shadow-sm transition"
            >
              <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
              Run in Sandbox
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded bg-rose-950/40 border border-rose-800 text-xs text-rose-300 flex items-center">
          <AlertTriangle className="w-4 h-4 mr-2 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Split View: Code Editor vs Output Terminal */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        {/* Left: Code Editor */}
        <div className="flex flex-col bg-[#0f172a] border border-slate-800 rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>script.py (Python 3.10+)</span>
            <span>{code.length} chars</span>
          </div>
          <div className="flex-1 overflow-auto bg-[#090d16]">
            <CodeMirror
              value={code}
              height="100%"
              theme={oneDark}
              extensions={[python()]}
              onChange={(value) => setCode(value)}
              className="text-xs h-full"
            />
          </div>
        </div>

        {/* Right: Output Console & Telemetry */}
        <div className="flex flex-col bg-[#0f172a] border border-slate-800 rounded-lg overflow-hidden">
          {/* Header & Tabs */}
          <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setActiveTab('stdout')}
                className={`px-3 py-1 rounded text-xs font-mono transition ${
                  activeTab === 'stdout'
                    ? 'bg-slate-800 text-blue-400 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                stdout
              </button>
              <button
                onClick={() => setActiveTab('stderr')}
                className={`px-3 py-1 rounded text-xs font-mono transition ${
                  activeTab === 'stderr'
                    ? 'bg-slate-800 text-rose-400 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                stderr {activeExecution?.stderr ? '(!)' : ''}
              </button>
              <button
                onClick={() => setActiveTab('metrics')}
                className={`px-3 py-1 rounded text-xs font-mono transition ${
                  activeTab === 'metrics'
                    ? 'bg-slate-800 text-emerald-400 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Telemetry
              </button>
            </div>

            {/* Status indicator */}
            {activeExecution && (
              <div className="flex items-center space-x-2 text-xs font-mono">
                <span className="text-slate-500">State:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    activeExecution.state === 'COMPLETED'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : activeExecution.state === 'TIMED_OUT'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : activeExecution.state === 'RESOURCE_LIMIT_EXCEEDED'
                      ? 'bg-purple-950 text-purple-400 border border-purple-800'
                      : isRunning
                      ? 'bg-blue-950 text-blue-400 border border-blue-800 animate-pulse'
                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}
                >
                  {activeExecution.state}
                </span>
              </div>
            )}
          </div>

          {/* Tab Body */}
          <div className="flex-1 p-4 bg-[#090d16] overflow-auto font-mono text-xs">
            {activeTab === 'stdout' && (
              <pre className="text-slate-200 whitespace-pre-wrap leading-relaxed">
                {activeExecution?.stdout || (isRunning ? 'Supervising execution...' : 'No standard output recorded.')}
              </pre>
            )}

            {activeTab === 'stderr' && (
              <pre className="text-rose-400 whitespace-pre-wrap leading-relaxed">
                {activeExecution?.stderr || (isRunning ? 'Awaiting output...' : 'No standard error recorded.')}
              </pre>
            )}

            {activeTab === 'metrics' && (
              <div className="space-y-4 font-sans text-xs">
                {!activeExecution ? (
                  <p className="text-slate-500 font-mono">Run a program to inspect telemetry.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                      <div className="flex items-center text-slate-400 mb-1">
                        <Clock className="w-3.5 h-3.5 mr-1 text-amber-400" />
                        <span>Wall-Clock Duration</span>
                      </div>
                      <div className="text-lg font-bold font-mono text-white">
                        {activeExecution.wall_time_sec ? `${activeExecution.wall_time_sec}s` : '-'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Limit: {selectedPolicy?.wall_time_limit_sec}s
                      </div>
                    </div>

                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                      <div className="flex items-center text-slate-400 mb-1">
                        <HardDrive className="w-3.5 h-3.5 mr-1 text-purple-400" />
                        <span>Peak Memory</span>
                      </div>
                      <div className="text-lg font-bold font-mono text-white">
                        {activeExecution.peak_memory_mb ? `${activeExecution.peak_memory_mb} MB` : '-'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Limit: {selectedPolicy?.memory_limit_mb} MB
                      </div>
                    </div>

                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                      <div className="flex items-center text-slate-400 mb-1">
                        <Cpu className="w-3.5 h-3.5 mr-1 text-blue-400" />
                        <span>CPU Time (Total)</span>
                      </div>
                      <div className="text-lg font-bold font-mono text-white">
                        {activeExecution.cpu_total_sec ? `${activeExecution.cpu_total_sec}s` : '-'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Quota: {selectedPolicy?.cpu_quota_pct}% CFS
                      </div>
                    </div>

                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                      <div className="flex items-center text-slate-400 mb-1">
                        <Activity className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                        <span>Termination Reason</span>
                      </div>
                      <div className="text-sm font-bold font-mono text-emerald-400">
                        {activeExecution.termination_reason || '-'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Exit code: {activeExecution.exit_code !== null ? activeExecution.exit_code : '-'}
                      </div>
                    </div>

                    {activeExecution.error_summary && (
                      <div className="col-span-2 bg-rose-950/30 p-3 rounded border border-rose-800/60 text-rose-300">
                        <span className="font-semibold block mb-0.5 font-mono text-[11px]">Termination Summary:</span>
                        {activeExecution.error_summary}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
