# AgentGuard

**Permission checks for AI agents, enforced on GenLayer.**

AgentGuard lets a policy owner register an agent, define its permitted tools and policy boundaries, then submit proposed actions for intelligent evaluation. Deterministic checks enforce identity, revocation, expiry, and tool allowlists; GenLayer's Intelligent Contract evaluates whether a proposed action's intent complies with the written policy. The verdict and reason are recorded on-chain.

> Status: source project prepared for Studio deployment. It has not been deployed or live-verified from this repository.

## What makes it a real dApp?

- `contracts/agent_guard.py` is the source of truth for agent policies and action decisions.
- The frontend connects to an injected EIP-1193 wallet and uses `genlayer-js` to read and submit contract transactions.
- Transactions are tracked through acceptance and finalization; UI state is refreshed from canonical contract reads.
- Contract tests cover deterministic policy boundaries and basic data validation.

The contract authorizes or blocks a proposed action. It does **not** execute external tools, transfer funds, or guarantee that an off-chain agent obeys a verdict. Integrators must enforce the contract decision at their tool gateway before executing the action.

## Repository map

```text
agent-guard/
├── .github/workflows/ci.yml
├── api/                       # optional Vercel health/status endpoints
├── contracts/agent_guard.py   # original GenLayer Intelligent Contract
├── docs/                      # architecture and deployment notes
├── frontend/                  # React + TypeScript + Vite app
├── scripts/                   # deploy checklist and config validation
├── tests/                     # contract and config tests
├── package.json
├── pyproject.toml
├── requirements.txt
└── vercel.json
```

## Network

Default target: **GenLayer Studio Network** from the supplied Studio notes.

- RPC: `https://studio.genlayer.com/api`
- Chain ID: `61999` (`0xf22f`)
- Explorer: `https://explorer-studio.genlayer.com`

This project intentionally does not silently switch to Studio Next. If your deployment target is Studio Next, update the chain/RPC and compatible SDK version together before deployment.

## Quick start

```bash
npm install
npm --workspace frontend run dev
```

Copy `frontend/.env.example` to `frontend/.env` and set the deployed contract address:

```env
VITE_AGENT_GUARD_ADDRESS=0xYourDeployedContractAddress
VITE_GENLAYER_RPC=https://studio.genlayer.com/api
```

Install the matching GenLayer contract toolchain for the target network, then validate and deploy `contracts/agent_guard.py` in GenLayer Studio. The contract source includes a dependency hash from the provided Studio examples; verify that hash against the active Studio toolchain before deployment.

## Main flow

1. Connect a wallet on GenLayer Studio Network.
2. Register an agent address, allowed tools, policy text, and expiry.
3. Submit an action proposal from the owner or registered agent address.
4. The contract checks authorization, expiry, and tool allowlist deterministically.
5. GenLayer evaluates the action's meaning against the policy via consensus.
6. The contract records `ALLOW`, `BLOCK`, or `REVIEW`; downstream tools must honor the recorded result.

## Security notes

- Keep policy text concise, explicit, and non-contradictory.
- Do not use natural-language verdicts as the only enforcement layer: deterministic tool allowlists, caller checks, expiry, and revocation are applied first.
- Never place API keys, credentials, seed phrases, or private data in policy text or action descriptions.
- A successful transaction is not evidence that an off-chain tool executed safely.
- Review the contract and run the test suite before using it with valuable resources.
