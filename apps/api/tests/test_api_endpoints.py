from fastapi.testclient import TestClient
from apps.api.app.main import app
from apps.api.app.models.db import Base, engine

# Ensure schema is created before API tests run
Base.metadata.create_all(bind=engine)

client = TestClient(app)


def test_health_endpoint():
    """Verify GET /api/health returns 200 and healthy status."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_system_capabilities_endpoint():
    """Verify GET /api/system/capabilities returns honest host detection report."""
    response = client.get("/api/system/capabilities")
    assert response.status_code == 200
    data = response.json()
    assert "ready" in data
    assert "os_name" in data
    assert "kernel_version" in data
    assert "issues" in data
    assert isinstance(data["issues"], list)


def test_builtin_workloads_endpoint():
    """Verify GET /api/system/workloads lists all safe test programs."""
    response = client.get("/api/system/workloads")
    assert response.status_code == 200
    workloads = response.json()
    assert len(workloads) >= 6
    assert any(w["id"] == "normal_output" for w in workloads)


def test_policies_crud_lifecycle():
    """Verify listing, creating, retrieving, and deleting a custom policy."""
    # 1. List policies
    res = client.get("/api/policies")
    assert res.status_code == 200
    initial_count = len(res.json())

    # 2. Create custom policy
    new_policy = {
        "id": "test_api_policy",
        "name": "API Test Policy",
        "description": "Created during integration test",
        "wall_time_limit_sec": 4.5,
        "memory_limit_mb": 96,
        "cpu_quota_pct": 40,
        "max_processes": 12,
        "max_output_bytes": 16384,
        "temp_storage_mb": 16,
        "network_enabled": False,
        "filesystem_policy": "isolated_ro_root",
        "syscall_policy": "standard",
    }
    create_res = client.post("/api/policies", json=new_policy)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["id"] == "test_api_policy"
    assert created["memory_limit_mb"] == 96

    # 3. Retrieve policy by ID
    get_res = client.get("/api/policies/test_api_policy")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "API Test Policy"

    # 4. Delete policy
    del_res = client.delete("/api/policies/test_api_policy")
    assert del_res.status_code == 204

    # 5. Verify deleted
    get_res2 = client.get("/api/policies/test_api_policy")
    assert get_res2.status_code == 404


def test_protected_policy_deletion_prevention():
    """Verify deleting core built-in policies ('standard') is prohibited."""
    res = client.delete("/api/policies/standard")
    assert res.status_code == 400
    assert "cannot be deleted" in res.json()["detail"]


def test_execution_submission_and_lookup():
    """Verify submitting code creates an execution record."""
    payload = {
        "source_code": "print('Integration test code')",
        "policy_id": "standard",
        "language": "python",
    }
    res = client.post("/api/executions", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert "id" in data
    assert data["policy_id"] == "standard"
    assert data["state"] in ("QUEUED", "PREPARING", "RUNNING", "FAILED", "COMPLETED")

    # Lookup
    exec_id = data["id"]
    get_res = client.get(f"/api/executions/{exec_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == exec_id


def test_experiment_creation_and_retrieval():
    """Verify creating a multi-policy experiment in Policy Lab."""
    exp_payload = {
        "name": "Integration Benchmark Experiment",
        "description": "Comparing standard vs strict",
        "workload_id": "normal_output",
        "source_code": "print('Benchmark comparison')",
        "policy_ids": ["standard", "strict"],
    }
    res = client.post("/api/experiments", json=exp_payload)
    assert res.status_code == 201
    exp_data = res.json()
    assert exp_data["name"] == "Integration Benchmark Experiment"
    assert len(exp_data["runs"]) == 2

    # Query results endpoint
    exp_id = exp_data["id"]
    res_results = client.get(f"/api/experiments/{exp_id}/results")
    assert res_results.status_code == 200
    assert res_results.json()["experiment_id"] == exp_id
