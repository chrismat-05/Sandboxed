// Exact copy of attached dribble design generated, to redesign later.
// TODO: remake this full function after VIVA, dont touch now, everything breaks
// please just work for the demo tomorrow
// absolute black magic, do not delete or the whole app crashes
// professor said this shouldn't be hardcoded but I'm tired
// copy-pasted this logic from StackOverflow, need to cite later maybe
// temporary fix so the UI doesn't clip during presentation

import React, { useState, useEffect, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  Play,
  Square,
  Clock,
  HardDrive,
  Cpu,
  Sliders,
  Upload,
  FileCode,
  Activity,
  AlertTriangle,
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
    // console.log("HERE!!!")
    // tchr said this shouldn't be hardcoded but I'm tired
    Promise.all([api.getPolicies(), api.getWorkloads()])
      .then(([pList, wList]) => {
        // temporary fix so the UI doesn't go down during presentation
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

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setCode(content);
        setSelectedWorkloadId('');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRun = async () => {
    // console.log("run clicked, please just work")
    // please just work for the demo tomorrow
    setErrorMsg(null);
    setIsRunning(true);
    try {
      const exec = await api.submitExecution({
        source_code: code,
        policy_id: selectedPolicyId,
        language: 'python',
      });
      // console.log("HERE!!! submitted:", exec.id)
      setActiveExecution(exec);
      startPolling(exec.id);
    } catch (err) {
      setErrorMsg(err.message || 'Execution submission failed.');
      setIsRunning(false);
    }
  };

  const startPolling = (execId) => {
    // absolute black magic, do not delete or the whole app crashes
    // copy-pasted this logic from StackOverflow, need to cite later maybe
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
    <div className="h-[calc(100vh-6.5rem)] flex flex-col space-y-4 max-w-7xl mx-auto font-sub">
      {/* Top Controls Bar */}
      <div className="bg-burgundy-850 border border-burgundy-700 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          {/* Workload Preset Selector */}
          <div className="flex items-center space-x-2">
            <FileCode className="w-4 h-4 text-champagne-400" />
            <select
              value={selectedWorkloadId}
              onChange={handleWorkloadChange}
              className="bg-burgundy-950 border border-burgundy-700 text-beige-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-champagne-500 font-mono"
            >
              <option value="">Load Workload Preset...</option>
              {workloads.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title} ({w.category})
                </option>
              ))}
            </select>
          </div>

          {/* Upload Script File */}
          <label className="flex items-center space-x-1.5 px-3 py-1.5 bg-burgundy-800 hover:bg-burgundy-750 text-beige-100 text-xs rounded-lg border border-burgundy-700 hover:border-champagne-500/50 cursor-pointer transition-all font-mono">
            <Upload className="w-3.5 h-3.5 text-champagne-400" />
            <span>Upload .py</span>
            <input
              type="file"
              accept=".py,.txt"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>

          {/* Policy Selector */}
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-champagne-400" />
            <select
              value={selectedPolicyId}
              onChange={(e) => setSelectedPolicyId(e.target.value)}
              className="bg-burgundy-950 border border-burgundy-700 text-beige-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-champagne-500 font-mono"
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
              className="flex items-center px-4 py-1.5 bg-[#5e1325] hover:bg-[#78182f] text-beige-100 rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <Square className="w-3.5 h-3.5 mr-1.5 fill-current" />
              Cancel Execution
            </button>
          ) : (
            <button
              onClick={handleRun}
              disabled={isRunning || !code.trim()}
              className="flex items-center px-4 py-1.5 bg-burgundy-500 hover:bg-burgundy-400 disabled:opacity-50 text-beige-100 rounded-lg text-xs font-semibold shadow-velvet-glow transition-all"
            >
              <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
              Run in Sandbox
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-burgundy-950 border border-burgundy-650 text-xs text-rose-300 flex items-center">
          <AlertTriangle className="w-4 h-4 mr-2 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Split View: Code Editor vs Output Terminal */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        {/* Left: Code Editor */}
        <div className="flex flex-col bg-burgundy-850 border border-burgundy-700 rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-burgundy-700 bg-burgundy-950/70 flex items-center justify-between text-xs text-beige-400 font-mono">
            <span className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-champagne-400 mr-2"></span>
              script.py (Python 3.11+)
            </span>
            <span>{code.length} chars</span>
          </div>
          <div className="flex-1 overflow-auto bg-[#120a10]">
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
        <div className="flex flex-col bg-burgundy-850 border border-burgundy-700 rounded-xl overflow-hidden">
          {/* Header & Tabs */}
          <div className="px-4 py-2 border-b border-burgundy-700 bg-burgundy-950/70 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setActiveTab('stdout')}
                className={`px-3 py-1 rounded-md text-xs font-mono transition-all ${
                  activeTab === 'stdout'
                    ? 'bg-burgundy-750 text-beige-100 font-semibold border border-burgundy-500/40'
                    : 'text-beige-400 hover:text-beige-200 hover:bg-burgundy-800'
                }`}
              >
                stdout
              </button>
              <button
                onClick={() => setActiveTab('stderr')}
                className={`px-3 py-1 rounded-md text-xs font-mono transition-all ${
                  activeTab === 'stderr'
                    ? 'bg-burgundy-750 text-rose-300 font-semibold border border-rose-500/40'
                    : 'text-beige-400 hover:text-beige-200 hover:bg-burgundy-800'
                }`}
              >
                stderr {activeExecution?.stderr ? '(!)' : ''}
              </button>
              <button
                onClick={() => setActiveTab('metrics')}
                className={`px-3 py-1 rounded-md text-xs font-mono transition-all ${
                  activeTab === 'metrics'
                    ? 'bg-burgundy-750 text-champagne-400 font-semibold border border-champagne-500/40'
                    : 'text-beige-400 hover:text-beige-200 hover:bg-burgundy-800'
                }`}
              >
                Telemetry
              </button>
            </div>

            {/* Status indicator */}
            {activeExecution && (
              <div className="flex items-center space-x-2 text-xs font-mono">
                <span className="text-beige-500">State:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
                    activeExecution.state === 'COMPLETED'
                      ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800'
                      : activeExecution.state === 'TIMED_OUT'
                      ? 'bg-amber-950/70 text-amber-300 border border-amber-800'
                      : activeExecution.state === 'RESOURCE_LIMIT_EXCEEDED'
                      ? 'bg-burgundy-950 text-champagne-300 border border-champagne-600'
                      : isRunning
                      ? 'bg-burgundy-950 text-champagne-400 border border-burgundy-500 animate-pulse'
                      : 'bg-rose-950/70 text-rose-300 border border-rose-800'
                  }`}
                >
                  {activeExecution.state}
                </span>
              </div>
            )}
          </div>

          {/* Tab Body */}
          <div className="flex-1 p-4 bg-[#120a10] overflow-auto font-mono text-xs">
            {activeTab === 'stdout' && (
              <pre className="text-beige-200 whitespace-pre-wrap leading-relaxed">
                {activeExecution?.stdout || (isRunning ? 'Supervising isolated execution...' : 'No standard output recorded.')}
              </pre>
            )}

            {activeTab === 'stderr' && (
              <pre className="text-rose-300 whitespace-pre-wrap leading-relaxed">
                {activeExecution?.stderr || (isRunning ? 'Awaiting output stream...' : 'No standard error recorded.')}
              </pre>
            )}

            {activeTab === 'metrics' && (
              <div className="space-y-4 font-sub text-xs">
                {!activeExecution ? (
                  <p className="text-beige-500 font-mono">Run a program to inspect kernel telemetry.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-burgundy-800/90 p-3 rounded-lg border border-burgundy-700">
                      <div className="flex items-center text-beige-400 mb-1">
                        <Clock className="w-3.5 h-3.5 mr-1 text-amber-400" />
                        <span>Wall-Clock Duration</span>
                      </div>
                      <div className="text-lg font-bold font-mono text-beige-100">
                        {activeExecution.wall_time_sec ? `${activeExecution.wall_time_sec}s` : '-'}
                      </div>
                      <div className="text-[11px] text-beige-500 font-mono mt-0.5">
                        Limit: {selectedPolicy?.wall_time_limit_sec}s
                      </div>
                    </div>

                    <div className="bg-burgundy-800/90 p-3 rounded-lg border border-burgundy-700">
                      <div className="flex items-center text-beige-400 mb-1">
                        <HardDrive className="w-3.5 h-3.5 mr-1 text-champagne-400" />
                        <span>Peak Memory</span>
                      </div>
                      <div className="text-lg font-bold font-mono text-beige-100">
                        {activeExecution.peak_memory_mb ? `${activeExecution.peak_memory_mb} MB` : '-'}
                      </div>
                      <div className="text-[11px] text-beige-500 font-mono mt-0.5">
                        Limit: {selectedPolicy?.memory_limit_mb} MB
                      </div>
                    </div>

                    <div className="bg-burgundy-800/90 p-3 rounded-lg border border-burgundy-700">
                      <div className="flex items-center text-beige-400 mb-1">
                        <Cpu className="w-3.5 h-3.5 mr-1 text-champagne-400" />
                        <span>CPU Time (Total)</span>
                      </div>
                      <div className="text-lg font-bold font-mono text-beige-100">
                        {activeExecution.cpu_total_sec ? `${activeExecution.cpu_total_sec}s` : '-'}
                      </div>
                      <div className="text-[11px] text-beige-500 font-mono mt-0.5">
                        CFS Quota: {selectedPolicy?.cpu_quota_pct}%
                      </div>
                    </div>

                    <div className="bg-burgundy-800/90 p-3 rounded-lg border border-burgundy-700">
                      <div className="flex items-center text-beige-400 mb-1">
                        <Activity className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                        <span>Termination Reason</span>
                      </div>
                      <div className="text-sm font-bold font-mono text-emerald-300">
                        {activeExecution.termination_reason || '-'}
                      </div>
                      <div className="text-[11px] text-beige-500 font-mono mt-0.5">
                        Exit code: {activeExecution.exit_code !== null ? activeExecution.exit_code : '-'}
                      </div>
                    </div>

                    {activeExecution.error_summary && (
                      <div className="col-span-2 bg-burgundy-950 p-3 rounded-lg border border-burgundy-650 text-rose-300">
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
