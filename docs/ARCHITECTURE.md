# Architecture

## Trust boundaries

- **Wallet:** signs user transactions; frontend never asks for private keys.
- **AgentGuard contract:** authoritative registry for policy ownership, agent address, allowed tools, expiry, revocation, action caller, and final verdict.
- **GenLayer consensus:** evaluates semantic compliance only after deterministic checks pass.
- **Tool gateway / agent runtime:** must check the on-chain verdict before executing a tool. AgentGuard does not itself execute tools.
- **Frontend:** displays canonical contract reads and transaction status; never invents activity records.

## Verdicts

- `ALLOW`: action appears compliant with the supplied policy.
- `BLOCK`: action appears to violate the policy, or is deterministically outside the tool allowlist / inactive policy.
- `REVIEW`: ambiguous action or policy that requires human review.

## Important limitation

LLM-assisted policy review is not a formal proof of safety. Use narrow tool allowlists and deterministic authorization for high-risk operations. Keep transactions and sensitive tool execution behind explicit gateway enforcement.
