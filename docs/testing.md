# Sandboxed Testing & Verification Inventory

This document details the test suites, checks executed during the Windows development phase, and the pending Linux integration suite to be verified on Ubuntu.

---

## 1. Testing Strategy

1. **Unit & Isolation Logic Tests**: Test schemas, validation rules, state transitions, cgroup calculations, bubblewrap argument synthesis, and seccomp profiles independently of the kernel.
2. **API & Persistence Tests**: Verify request schemas, REST route responses, database transactions, and relational queries.
3. **Linux Kernel Integration Tests**: Verify actual operating system enforcement primitives (namespaces, cgroups v2 CFS throttling, OOM killing, deadline SIGKILL escalation) under real Ubuntu execution.
4. **Honest Reporting Principle**: Linux-specific tests are clearly identified and marked as pending until physically executed inside Ubuntu Linux.

---

## 2. Test Execution Inventory (Windows Phase)

Environment: Windows host, Python 3.13.14, pytest 9.2.0, pytest-asyncio 1.4.1.

| Test File | Test Case | Scope | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `apps/api/tests/test_policy_validation.py` | `test_default_policies_integrity` | Policy Defaults | **PASSED** | Verified standard, strict, etc. |
| `apps/api/tests/test_policy_validation.py` | `test_valid_custom_policy_creation` | Policy Schema | **PASSED** | Custom policy validation |
| `apps/api/tests/test_policy_validation.py` | `test_invalid_wall_time_limits_rejected` | Security Invariant | **PASSED** | Rejects limits <0.1s or >60s |
| `apps/api/tests/test_policy_validation.py` | `test_invalid_memory_limits_rejected` | Security Invariant | **PASSED** | Rejects RAM <16MB or >2048MB |
| `apps/api/tests/test_policy_validation.py` | `test_invalid_cpu_quota_and_pids_rejected`| Security Invariant | **PASSED** | Rejects invalid quotas and PIDs |
| `apps/api/tests/test_policy_validation.py` | `test_builtin_workloads_have_required_metadata`| Workload Presets | **PASSED** | 8 built-in workloads verified |
| `apps/api/tests/test_api_endpoints.py` | `test_health_endpoint` | REST API | **PASSED** | GET `/api/health` |
| `apps/api/tests/test_api_endpoints.py` | `test_system_capabilities_endpoint` | REST API | **PASSED** | GET `/api/system/capabilities` |
| `apps/api/tests/test_api_endpoints.py` | `test_builtin_workloads_endpoint` | REST API | **PASSED** | GET `/api/system/workloads` |
| `apps/api/tests/test_api_endpoints.py` | `test_policies_crud_lifecycle` | REST API | **PASSED** | CRUD on `/api/policies` |
| `apps/api/tests/test_api_endpoints.py` | `test_protected_policy_deletion_prevention` | Security Boundary | **PASSED** | Prevents core policy deletion |
| `apps/api/tests/test_api_endpoints.py` | `test_execution_submission_and_lookup` | REST API | **PASSED** | POST & GET `/api/executions` |
| `apps/api/tests/test_api_endpoints.py` | `test_experiment_creation_and_retrieval` | REST API | **PASSED** | POST & GET `/api/experiments` |
| `apps/api/tests/test_database_persistence.py` | `test_policy_repository_seed_and_retrieval` | Database | **PASSED** | SQLite seeding and retrieval |
| `apps/api/tests/test_database_persistence.py` | `test_execution_repository_crud` | Database | **PASSED** | Relational execution persistence |
| `apps/api/tests/test_database_persistence.py` | `test_execution_summary_counts` | Database | **PASSED** | Aggregation queries |
| `apps/api/tests/test_database_persistence.py` | `test_experiment_repository_with_runs` | Database | **PASSED** | Cascade relationships |
| `apps/api/tests/test_database_persistence.py` | `test_audit_event_logging` | Database | **PASSED** | Security event logging |
| `sandbox_engine/tests/test_bwrap_builder.py` | `test_bwrap_builder_namespaces_unshared` | Linux Container | **PASSED** | User, IPC, PID, UTS, cgroup unshare |
| `sandbox_engine/tests/test_bwrap_builder.py` | `test_bwrap_builder_network_toggle` | Linux Container | **PASSED** | `--unshare-net` vs `--share-net` |
| `sandbox_engine/tests/test_bwrap_builder.py` | `test_bwrap_builder_never_mounts_sensitive_host_paths` | Security Invariant | **PASSED** | Guarantees `/root`, `/home` omitted |
| `sandbox_engine/tests/test_bwrap_builder.py` | `test_bwrap_builder_workspace_binding` | Linux Container | **PASSED** | Workspace directory isolation |
| `sandbox_engine/tests/test_bwrap_builder.py` | `test_bwrap_builder_process_termination_flags` | Process Supervisor | **PASSED** | `--die-with-parent` and `/proc` |
| `sandbox_engine/tests/test_capabilities_detection.py` | `test_detect_capabilities_returns_typed_report` | Diagnostics | **PASSED** | Typed report generation |
| `sandbox_engine/tests/test_capabilities_detection.py` | `test_honest_non_linux_reporting_on_windows` | Diagnostics | **PASSED** | Honest non-Linux reporting |
| `sandbox_engine/tests/test_capabilities_detection.py` | `test_report_includes_python_and_kernel_info` | Diagnostics | **PASSED** | Kernel and python strings |
| `sandbox_engine/tests/test_capabilities_detection.py` | `test_report_cgroups_controllers_is_list` | Diagnostics | **PASSED** | Controllers list formatting |
| `sandbox_engine/tests/test_capabilities_detection.py` | `test_report_serialization` | Diagnostics | **PASSED** | Valid JSON schema |
| `sandbox_engine/tests/test_cgroup_v2_logic.py` | `test_cgroup_v2_memory_calculation` | Hardware Quota | **PASSED** | Byte boundary calculations |
| `sandbox_engine/tests/test_cgroup_v2_logic.py` | `test_cgroup_v2_cpu_quota_calculation` | Hardware Quota | **PASSED** | CFS quota period formatting |
| `sandbox_engine/tests/test_cgroup_v2_logic.py` | `test_collector_parses_cpu_stat` | Telemetry | **PASSED** | `cpu.stat` microsecond parsing |
| `sandbox_engine/tests/test_cgroup_v2_logic.py` | `test_collector_parses_memory_events_oom` | Telemetry | **PASSED** | `memory.events` OOM detection |
| `sandbox_engine/tests/test_cgroup_v2_logic.py` | `test_collector_handles_missing_files_gracefully` | Telemetry | **PASSED** | Graceful fallback on missing stats |
| `sandbox_engine/tests/test_execution_manager_state_machine.py` | `test_execution_manager_lifecycle_success` | State Machine | **PASSED** | QUEUED -> PREPARING -> RUNNING -> COMPLETED |
| `sandbox_engine/tests/test_execution_manager_state_machine.py` | `test_execution_manager_queue_cancellation` | State Machine | **PASSED** | Cancel while queued |
| `sandbox_engine/tests/test_execution_manager_state_machine.py` | `test_execution_manager_running_cancellation` | State Machine | **PASSED** | Cancel while running |
| `sandbox_engine/tests/test_execution_manager_state_machine.py` | `test_execution_manager_queue_capacity_limit` | Concurrency | **PASSED** | Capacity overflow rejection |
| `sandbox_engine/tests/test_execution_manager_state_machine.py` | `test_execution_manager_failure_outcome` | State Machine | **PASSED** | Non-zero exit code mapping |
| `sandbox_engine/tests/test_seccomp_definitions.py` | `test_standard_seccomp_policy_contains_critical_denials` | Syscall Filter | **PASSED** | Standard profile blocks ptrace, mount |
| `sandbox_engine/tests/test_seccomp_definitions.py` | `test_strict_seccomp_policy_blocks_network_sockets` | Syscall Filter | **PASSED** | Strict profile blocks socket, connect |
| `sandbox_engine/tests/test_seccomp_definitions.py` | `test_disabled_seccomp_policy` | Syscall Filter | **PASSED** | Disabled profile allow-all |
| `sandbox_engine/tests/test_seccomp_definitions.py` | `test_dangerous_syscalls_list_integrity` | Syscall Filter | **PASSED** | Verified dangerous syscall list |
| `sandbox_engine/tests/test_seccomp_definitions.py` | `test_network_syscalls_list_integrity` | Syscall Filter | **PASSED** | Verified network syscall list |

**Total Unit & API Checks Executed on Windows**: **43 PASSED, 0 FAILED**.

---

## 3. Pending Linux Integration Test Suite (To be run on Ubuntu)

The following 10 tests are implemented in `sandbox_engine/tests/test_linux_integration_suite.py` and decorated with `@pytest.mark.skipif(sys.platform != "linux")`.
They will be executed inside Ubuntu Linux via `./scripts/verify_linux_sandbox.sh`:

| Test Name | Target OS Subsystem | Expected Outcome in Ubuntu | Status |
| :--- | :--- | :--- | :--- |
| `test_linux_simple_execution` | Bubblewrap Container | Process runs in sandbox, returns exit 0 and stdout | **PENDING LINUX** |
| `test_linux_stdout_stderr_capture` | Process Streams | Separate capture of stdout and stderr | **PENDING LINUX** |
| `test_linux_exit_status_propagation` | Exit Code Propagation | Process exit code 42 propagates to status FAILED | **PENDING LINUX** |
| `test_linux_wall_clock_timeout_enforcement` | Supervisor Watchdog | Process group killed via SIGTERM/SIGKILL on timeout | **PENDING LINUX** |
| `test_linux_memory_limit_cgroup_oom` | cgroups v2 `memory.max` | Kernel OOM killer terminates process; event logged | **PENDING LINUX** |
| `test_linux_cpu_quota_enforcement` | cgroups v2 `cpu.max` | CFS throttling observed in wall-clock execution time | **PENDING LINUX** |
| `test_linux_filesystem_isolation_unauthorized_read` | Mount Namespace | `/etc/shadow` access denied | **PENDING LINUX** |
| `test_linux_network_isolation_egress_blocked` | Network Namespace | Outbound socket connection to 8.8.8.8 fails with ENETUNREACH | **PENDING LINUX** |
| `test_linux_output_limit_enforcement` | Non-blocking Pipe Buffer | Output truncated at limit without pipe deadlock | **PENDING LINUX** |
| `test_linux_temporary_file_cleanup` | Filesystem Lifecycle | Workspace directory completely deleted after run | **PENDING LINUX** |
