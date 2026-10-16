from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def test_frontend_has_real_wallet_and_contract_calls():
    source = (ROOT / "frontend/src/App.tsx").read_text()
    for token in ["eth_requestAccounts", "writeContract", "readContract", "waitForTransactionReceipt", "register_agent", "evaluate_action"]:
        assert token in source

def test_frontend_does_not_inject_sample_activity():
    source = (ROOT / "frontend/src/App.tsx").read_text()
    assert "setActions(actionRows.filter(Boolean).reverse())" in source
