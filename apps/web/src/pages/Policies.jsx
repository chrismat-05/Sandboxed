import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Plus,
  Trash2,
  AlertCircle,
  Clock,
  HardDrive,
  Cpu,
  Layers,
  Globe,
  Lock,
  RefreshCw,
  Info,
} from 'lucide-react';
import { api } from '../services/api';

export default function Policies() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    wall_time_limit_sec: 5.0,
    memory_limit_mb: 128,
    cpu_quota_pct: 50,
    max_processes: 32,
    max_output_bytes: 65536,
    temp_storage_mb: 64,
    network_enabled: false,
    filesystem_policy: 'isolated_ro_root',
    syscall_policy: 'standard',
  });

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const data = await api.getPolicies();
      setPolicies(data);
    } catch (err) {
      console.error('Failed to load policies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm(`Are you sure you want to delete policy '${id}'?`)) return;
    try {
      await api.deletePolicy(id);
      loadPolicies();
    } catch (err) {
      alert(err.message || 'Failed to delete policy.');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await api.createPolicy(formData);
      setIsModalOpen(false);
      loadPolicies();
      // Reset form
      setFormData({
        id: '',
        name: '',
        description: '',
        wall_time_limit_sec: 5.0,
        memory_limit_mb: 128,
        cpu_quota_pct: 50,
        max_processes: 32,
        max_output_bytes: 65536,
        temp_storage_mb: 64,
        network_enabled: false,
        filesystem_policy: 'isolated_ro_root',
        syscall_policy: 'standard',
      });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create policy.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-400 text-xs font-mono mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>SECURITY PROFILES & RESOURCE BOUNDARIES</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Security & Resource Policies</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Policies define hardware quotas and kernel isolation boundaries. All boundary checks are enforced
            server-side and applied before execution begins via cgroups v2 and bubblewrap arguments.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create Custom Policy
        </button>
      </div>

      {/* Policy Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {policies.map((p) => {
          const isCore = ['standard', 'strict'].includes(p.id);
          return (
            <div
              key={p.id}
              className="bg-[#0f172a] border border-slate-800 rounded-lg p-5 flex flex-col justify-between hover:border-slate-700 transition"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-950/80 text-blue-400 border border-blue-800/60 font-semibold">
                    {p.id}
                  </span>
                  {!isCore ? (
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-slate-500 hover:text-rose-400 transition"
                      title="Delete Policy"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono flex items-center">
                      <Lock className="w-3 h-3 mr-1" /> Core
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-white mt-3">{p.name}</h3>
                <p className="text-xs text-slate-400 mt-1 min-h-[36px] line-clamp-2">
                  {p.description || 'No description provided.'}
                </p>

                {/* Boundary Specs */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="flex items-center text-slate-400">
                      <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-400" /> Timeout
                    </span>
                    <span>{p.wall_time_limit_sec}s</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-300">
                    <span className="flex items-center text-slate-400">
                      <HardDrive className="w-3.5 h-3.5 mr-1.5 text-purple-400" /> RAM Max
                    </span>
                    <span>{p.memory_limit_mb} MB</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-300">
                    <span className="flex items-center text-slate-400">
                      <Cpu className="w-3.5 h-3.5 mr-1.5 text-blue-400" /> CPU Quota
                    </span>
                    <span>{p.cpu_quota_pct}% CFS</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-300">
                    <span className="flex items-center text-slate-400">
                      <Layers className="w-3.5 h-3.5 mr-1.5 text-cyan-400" /> Max PIDs
                    </span>
                    <span>{p.max_processes}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-300">
                    <span className="flex items-center text-slate-400">
                      <Globe className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> Network
                    </span>
                    <span className={p.network_enabled ? 'text-rose-400' : 'text-emerald-400 font-semibold'}>
                      {p.network_enabled ? 'Enabled' : 'Disabled (Isolated)'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-300">
                    <span className="flex items-center text-slate-400">
                      <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-indigo-400" /> Syscalls
                    </span>
                    <span>{p.syscall_policy}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 rounded-lg max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Create Custom Execution Policy</h3>
            <p className="text-xs text-slate-400 mb-4">
              Configure fine-grained resource quotas and security constraints.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 rounded bg-rose-950/40 border border-rose-800 text-xs text-rose-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Policy ID (slug)</label>
                  <input
                    type="text"
                    required
                    pattern="^[a-zA-Z0-9_\-]+$"
                    placeholder="e.g. low_memory_test"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Low Memory Benchmark"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Explain policy goals and restrictions"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Timeout (sec)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="60"
                    value={formData.wall_time_limit_sec}
                    onChange={(e) => setFormData({ ...formData, wall_time_limit_sec: parseFloat(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">RAM Limit (MB)</label>
                  <input
                    type="number"
                    min="16"
                    max="1024"
                    value={formData.memory_limit_mb}
                    onChange={(e) => setFormData({ ...formData, memory_limit_mb: parseInt(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">CPU Quota (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={formData.cpu_quota_pct}
                    onChange={(e) => setFormData({ ...formData, cpu_quota_pct: parseInt(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Max PIDs</label>
                  <input
                    type="number"
                    min="1"
                    max="128"
                    value={formData.max_processes}
                    onChange={(e) => setFormData({ ...formData, max_processes: parseInt(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Syscall Filter</label>
                  <select
                    value={formData.syscall_policy}
                    onChange={(e) => setFormData({ ...formData, syscall_policy: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 font-mono"
                  >
                    <option value="standard">Standard (Block Dangerous)</option>
                    <option value="strict">Strict (Block Sockets & Sched)</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold"
                >
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
