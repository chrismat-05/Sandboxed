# Sandboxed REST API Reference

The Sandboxed API adheres to standard HTTP status codes, structured JSON request/response formats, and OpenAPI 3.0 specification.
Interactive Swagger documentation is available at `/docs`.

Base URL: `http://127.0.0.1:8000/api`

---

## 1. System & Capabilities

### `GET /health`
Returns service health status and current API version.
- **Status**: `200 OK`
- **Response**:
  ```json
  {
    "status": "healthy",
    "service": "Sandboxed API",
    "version": "1.0.0",
    "timestamp": "2026-10-28T10:00:00Z"
  }
  ```

### `GET /system/capabilities`
Probes host kernel and containment subsystems.
- **Status**: `200 OK`
- **Response**:
  ```json
  {
    "ready": true,
    "os_name": "Linux",
    "os_release": "Ubuntu 22.04.4 LTS",
    "kernel_version": "5.15.0-107-generic",
    "is_linux": true,
    "bwrap_available": true,
    "bwrap_path": "/usr/bin/bwrap",
    "bwrap_version": "bubblewrap 0.6.1",
    "user_namespaces_supported": true,
    "cgroups_v2_mounted": true,
    "cgroups_controllers_available": ["cpu", "memory", "pids"],
    "cgroups_delegation_writable": true,
    "cgroups_path": "/sys/fs/cgroup/sandboxed.slice",
    "seccomp_supported": true,
    "python_version": "3.10.12",
    "issues": []
  }
  ```

### `GET /system/workloads`
Returns built-in safe test workloads for Operating Systems experiments.

### `GET /dashboard/summary`
Returns aggregated execution counters, queue depth, active worker count, and latest runs.

---

## 2. Policies

### `GET /policies`
List all security and resource policies.

### `POST /policies`
Create a new custom policy.
- **Request Body**:
  ```json
  {
    "id": "my_benchmark_policy",
    "name": "My Benchmark Policy",
    "description": "5s timeout, 64MB memory cap",
    "wall_time_limit_sec": 5.0,
    "memory_limit_mb": 64,
    "cpu_quota_pct": 40,
    "max_processes": 16,
    "max_output_bytes": 65536,
    "temp_storage_mb": 32,
    "network_enabled": false,
    "filesystem_policy": "isolated_ro_root",
    "syscall_policy": "standard"
  }
  ```
- **Status**: `201 Created`

### `GET /policies/{policy_id}`
Retrieve a policy by ID.

### `PATCH /policies/{policy_id}`
Partially update an existing policy.

### `DELETE /policies/{policy_id}`
Delete a custom policy. Core policies (`standard`, `strict`) return `400 Bad Request`.

---

## 3. Executions

### `POST /executions`
Submit a Python program for sandboxed execution.
- **Request Body**:
  ```json
  {
    "source_code": "print('Hello Sandboxed')",
    "policy_id": "standard",
    "language": "python"
  }
  ```
- **Status**: `201 Created`
- **Response**: Full `ExecutionDetailResponse` with initial state `QUEUED`.

### `GET /executions`
List execution records with optional filtering.
- **Query Parameters**:
  - `skip` (int, default 0)
  - `limit` (int, default 50)
  - `state` (optional string, e.g. `COMPLETED`, `FAILED`, `TIMED_OUT`, `RESOURCE_LIMIT_EXCEEDED`)

### `GET /executions/{execution_id}`
Retrieve complete execution details, exit code, termination reason, and telemetry.

### `POST /executions/{execution_id}/cancel`
Cancel a queued or running execution.
- **Status**: `200 OK`

### `GET /executions/{execution_id}/output`
Retrieve captured stdout and stderr.

### `GET /executions/{execution_id}/metrics`
Retrieve recorded CPU and peak memory metrics.

---

## 4. Policy Lab Experiments

### `POST /experiments`
Create a multi-policy comparative experiment.
- **Request Body**:
  ```json
  {
    "name": "Memory Allocation Benchmark",
    "description": "Comparing 128MB vs 32MB policies",
    "workload_id": "memory_allocation",
    "source_code": "x = bytearray(50 * 1024 * 1024)",
    "policy_ids": ["standard", "memory_constrained"]
  }
  ```

### `GET /experiments`
List all experiments.

### `GET /experiments/{experiment_id}`
Retrieve experiment runs and configuration.

### `POST /experiments/{experiment_id}/run`
Trigger sequential execution of all policy runs in background.

### `GET /experiments/{experiment_id}/results`
Retrieve comparative benchmark metrics, bar chart series, and automated OS interpretation.
