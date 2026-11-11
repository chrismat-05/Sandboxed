// Exact copy of attached dribble design generated, to redesign later.
// TODO: remake this full function after VIVA, dont touch now, everything breaks
// please just work for the demo tomorrow
// professor said this shouldn't be hardcoded but I'm tired
// tchr said this shouldn't be hardcoded but I'm tired
// temporary fix so the UI doesn't clip during presentation
// temporary fix so the UI doesn't go down during presentation

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Plus,
  Trash2,
  Clock,
  HardDrive,
  Cpu,
  Layers,
  Globe,
  Lock,
  Code2,
} from 'lucide-react';
import { api } from '../services/api';

export default function Policies() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Form state
  // copy-pasted this logic from StackOverflow, need to cite later maybe
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
    // console.log("HERE!!! loading policies")
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
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="bg-[#1c1119] border border-[#3b202f] p-5 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-champagne-400 text-xs font-mono mb-1">
            <Sliders className="w-4 h-4" />
            <span>RESOURCE BOUNDARIES & HARDWARE PROFILES</span>
          </div>
          <h2 className="text-xl font-bold font-serif text-beige-100 tracking-tight">Security & Resource Policies</h2>
          <p className="text-xs text-beige-400 mt-1 max-w-2xl leading-relaxed">
            Policies define hardware quotas and kernel isolation boundaries. All boundary checks are enforced
            server-side and applied before execution begins via cgroups v2 and bubblewrap arguments.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-burgundy-600 hover:bg-burgundy-500 text-beige-100 rounded-lg text-xs font-semibold shadow-velvet transition-all"
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
              className="bg-[#1c1119] border border-[#3b202f] rounded-xl p-5 flex flex-col justify-between hover:border-burgundy-500/50 transition-all shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-burgundy-950/80 text-champagne-300 border border-burgundy-700/60 font-semibold">
                    {p.id}
                  </span>
                  {!isCore ? (
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-beige-500 hover:text-burgundy-400 transition"
                      title="Delete Policy"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="text-[10px] text-beige-400 font-mono flex items-center">
                      <Lock className="w-3 h-3 mr-1 text-champagne-400" /> Core
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold font-serif text-beige-100 mt-3">{p.name}</h3>
                <p className="text-xs text-beige-400 mt-1 min-h-[36px] line-clamp-2">
                  {p.description || 'No description provided.'}
                </p>

                {/* Boundary Specs */}
                <div className="mt-4 pt-3 border-t border-[#2e1825] space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center text-beige-300">
                    <span className="flex items-center text-beige-400">
                      <Clock className="w-3.5 h-3.5 mr-1.5 text-champagne-400" /> Timeout
                    </span>
                    <span>{p.wall_time_limit_sec}s</span>
                  </div>

                  <div className="flex justify-between items-center text-beige-300">
                    <span className="flex items-center text-beige-400">
                      <HardDrive className="w-3.5 h-3.5 mr-1.5 text-burgundy-400" /> RAM Max
                    </span>
                    <span>{p.memory_limit_mb} MB</span>
                  </div>

                  <div className="flex justify-between items-center text-beige-300">
                    <span className="flex items-center text-beige-400">
                      <Cpu className="w-3.5 h-3.5 mr-1.5 text-champagne-400" /> CPU Quota
                    </span>
                    <span>{p.cpu_quota_pct}% CFS</span>
                  </div>

                  <div className="flex justify-between items-center text-beige-300">
                    <span className="flex items-center text-beige-400">
                      <Layers className="w-3.5 h-3.5 mr-1.5 text-beige-400" /> Max PIDs
                    </span>
                    <span>{p.max_processes}</span>
                  </div>

                  <div className="flex justify-between items-center text-beige-300">
                    <span className="flex items-center text-beige-400">
                      <Globe className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> Network
                    </span>
                    <span className={p.network_enabled ? 'text-burgundy-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                      {p.network_enabled ? 'Enabled' : 'Disabled (Isolated)'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-beige-300">
                    <span className="flex items-center text-beige-400">
                      <Code2 className="w-3.5 h-3.5 mr-1.5 text-champagne-400" /> Syscalls
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1c1119] border border-[#3b202f] rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold font-serif text-beige-100 mb-1">Create Custom Execution Policy</h3>
            <p className="text-xs text-beige-400 mb-4">
              Configure fine-grained resource quotas and security constraints.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-burgundy-950/50 border border-burgundy-800 text-xs text-burgundy-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-beige-400 mb-1">Policy ID (slug)</label>
                  <input
                    type="text"
                    required
                    pattern="^[a-zA-Z0-9_\-]+$"
                    placeholder="e.g. low_memory_test"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    className="w-full bg-[#160e14] border border-[#3b202f] text-beige-200 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-champagne-400"
                  />
                </div>
                <div>
                  <label className="block text-beige-400 mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Low Memory Benchmark"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#160e14] border border-[#3b202f] text-beige-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-champagne-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-beige-400 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Explain policy goals and restrictions"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#160e14] border border-[#3b202f] text-beige-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-champagne-400"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-beige-400 mb-1">Timeout (sec)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="60"
                    value={formData.wall_time_limit_sec}
                    onChange={(e) => setFormData({ ...formData, wall_time_limit_sec: parseFloat(e.target.value) })}
                    className="w-full bg-[#160e14] border border-[#3b202f] text-beige-200 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-champagne-400"
                  />
                </div>
                <div>
                  <label className="block text-beige-400 mb-1">RAM Limit (MB)</label>
                  <input
                    type="number"
                    min="16"
                    max="1024"
                    value={formData.memory_limit_mb}
                    onChange={(e) => setFormData({ ...formData, memory_limit_mb: parseInt(e.target.value) })}
                    className="w-full bg-[#160e14] border border-[#3b202f] text-beige-200 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-champagne-400"
                  />
                </div>
                <div>
                  <label className="block text-beige-400 mb-1">CPU Quota (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={formData.cpu_quota_pct}
                    onChange={(e) => setFormData({ ...formData, cpu_quota_pct: parseInt(e.target.value) })}
                    className="w-full bg-[#160e14] border border-[#3b202f] text-beige-200 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-champagne-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-beige-400 mb-1">Max PIDs</label>
                  <input
                    type="number"
                    min="1"
                    max="128"
                    value={formData.max_processes}
                    onChange={(e) => setFormData({ ...formData, max_processes: parseInt(e.target.value) })}
                    className="w-full bg-[#160e14] border border-[#3b202f] text-beige-200 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-champagne-400"
                  />
                </div>
                <div>
                  <label className="block text-beige-400 mb-1">Syscall Filter</label>
                  <select
                    value={formData.syscall_policy}
                    onChange={(e) => setFormData({ ...formData, syscall_policy: e.target.value })}
                    className="w-full bg-[#160e14] border border-[#3b202f] text-beige-200 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-champagne-400"
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
                  className="px-3.5 py-1.5 bg-[#241520] hover:bg-[#2e1a29] text-beige-300 rounded-lg text-xs border border-[#3b202f]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-burgundy-600 hover:bg-burgundy-500 text-beige-100 rounded-lg text-xs font-semibold shadow-velvet"
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
