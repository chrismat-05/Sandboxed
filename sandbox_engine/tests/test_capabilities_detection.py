"""
Tests for Capability Probing and Readiness Reporting
"""

import platform
from sandbox_engine.linux.capabilities import detect_capabilities, EngineCapabilityReport


def test_detect_capabilities_returns_typed_report():
    """Verify detect_capabilities always returns an EngineCapabilityReport model."""
    report = detect_capabilities()
    assert isinstance(report, EngineCapabilityReport)
    assert isinstance(report.ready, bool)
    assert isinstance(report.issues, list)
    assert len(report.os_name) > 0


def test_honest_non_linux_reporting_on_windows():
    """Verify when running on Windows, detect_capabilities explicitly reports not ready."""
    if platform.system() == "Windows":
        report = detect_capabilities()
        assert report.ready is False
        assert report.is_linux is False
        assert report.bwrap_available is False
        assert any("Host OS is 'Windows'" in issue for issue in report.issues)


def test_report_includes_python_and_kernel_info():
    """Verify system diagnostics capture Python and kernel versions."""
    report = detect_capabilities()
    assert len(report.python_version) > 0
    assert len(report.kernel_version) > 0


def test_report_cgroups_controllers_is_list():
    """Verify controllers property is a list of strings."""
    report = detect_capabilities()
    assert isinstance(report.cgroups_controllers_available, list)


def test_report_serialization():
    """Verify capability report serializes to valid JSON without error."""
    report = detect_capabilities()
    json_str = report.model_dump_json()
    assert "ready" in json_str
    assert "issues" in json_str
