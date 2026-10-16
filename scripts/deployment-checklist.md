# Deployment checklist

1. Confirm whether the target is Studio Network (61999) or Studio Next (61997); do not mix endpoints.
2. Validate `contracts/agent_guard.py` in the target network's current GenLayer Studio.
3. Deploy the exact contract file committed in the same source revision as the frontend.
4. Record the deployed address and transaction hash in a deployment note.
5. Copy `frontend/.env.example` to `frontend/.env` and set `VITE_AGENT_GUARD_ADDRESS`.
6. Run `npm install`, `npm run typecheck`, `npm run build`, and `npm test`.
7. Connect a funded test wallet on the selected chain.
8. Register an agent and confirm `get_agent` returns canonical state.
9. Submit an allowlisted compliant action and a disallowed-tool action.
10. Confirm each transaction reaches finalization, then reload the page and verify the verdicts from contract reads.
11. Test unauthorized revoke, expired policy, repeated action ID, and prompt-injection text.
12. Save explorer links, transaction hashes, source revision, and screenshots as deployment evidence.

Do not describe the app as live-deployed until these checks pass on the target network.
