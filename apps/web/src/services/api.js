/**
 * Sandboxed API Client
 * Centralized HTTP service for interacting with the FastAPI backend.
 */

const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      let errorMsg = `HTTP Error ${res.status}`;
      try {
        const errJson = await res.json();
        errorMsg = errJson.detail || errorMsg;
      } catch (_) {}
      throw new Error(errorMsg);
    }
    if (res.status === 204) return true;
    return await res.json();
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err.message);
    throw err;
  }
}

export const api = {
  // Health & System
  getHealth: () => request('/health'),
  getCapabilities: () => request('/system/capabilities'),
  getWorkloads: () => request('/system/workloads'),
  getDashboardSummary: () => request('/dashboard/summary'),

  // Policies
  getPolicies: () => request('/policies'),
  getPolicy: (id) => request(`/policies/${id}`),
  createPolicy: (policy) => request('/policies', { method: 'POST', body: JSON.stringify(policy) }),
  updatePolicy: (id, policy) => request(`/policies/${id}`, { method: 'PATCH', body: JSON.stringify(policy) }),
  deletePolicy: (id) => request(`/policies/${id}`, { method: 'DELETE' }),

  // Executions
  submitExecution: (data) => request('/executions', { method: 'POST', body: JSON.stringify(data) }),
  listExecutions: (params = {}) => {
    const query = new URLSearchParams();
    if (params.skip !== undefined) query.set('skip', params.skip);
    if (params.limit !== undefined) query.set('limit', params.limit);
    if (params.state) query.set('state', params.state);
    return request(`/executions?${query.toString()}`);
  },
  getExecution: (id) => request(`/executions/${id}`),
  cancelExecution: (id) => request(`/executions/${id}/cancel`, { method: 'POST' }),
  getExecutionOutput: (id) => request(`/executions/${id}/output`),
  getExecutionMetrics: (id) => request(`/executions/${id}/metrics`),

  // Experiments (Policy Lab)
  createExperiment: (data) => request('/experiments', { method: 'POST', body: JSON.stringify(data) }),
  listExperiments: () => request('/experiments'),
  getExperiment: (id) => request(`/experiments/${id}`),
  runExperiment: (id) => request(`/experiments/${id}/run`, { method: 'POST' }),
  getExperimentResults: (id) => request(`/experiments/${id}/results`),
};
