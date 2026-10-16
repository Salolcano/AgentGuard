from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "contracts" / "agent_guard.py"


def test_contract_is_original_agent_guard():
    source = CONTRACT.read_text()
    assert "class AgentGuard" in source
    assert "class GrantLattice" not in source
    assert "create_root_grant" not in source


def test_contract_has_real_genlayer_semantic_evaluation():
    source = CONTRACT.read_text()
    assert "gl.nondet.exec_prompt" in source
    assert "gl.eq_principle.strict_eq" in source
    assert "@gl.public.write" in source
    assert "@gl.public.view" in source


def test_deterministic_guards_exist():
    source = CONTRACT.read_text()
    for expected in [
        "only policy owner can revoke agent",
        "caller is neither policy owner nor registered agent",
        "Tool is not in the deterministic allowlist.",
        "action id already used",
        "agent already revoked",
    ]:
        assert expected in source


def test_no_placeholder_contract_address():
    app = (ROOT / "frontend" / "src" / "App.tsx").read_text()
    assert "VITE_AGENT_GUARD_ADDRESS" in app
    assert "0xFEE5e0ca9DcbD52E75D4c1f7dE25dF94e475385E" not in app
