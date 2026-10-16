# Deploying AgentGuard

The supplied Studio notes specify Studio Network: RPC `https://studio.genlayer.com/api`, chain ID `61999`, explorer `https://explorer-studio.genlayer.com`.

The SDK dependency is pinned to `genlayer-js@1.1.8`, matching the uploaded repository's package configuration. The contract dependency hash was copied from the separately supplied Studio examples, not from GrantLattice's contract logic. Verify that it remains valid for the target network's active toolchain before deployment.

Deploy via the current GenLayer Studio UI or its supported CLI. Do not use a guessed contract address. After deployment, set `VITE_AGENT_GUARD_ADDRESS` in `frontend/.env`, rebuild, and test a complete lifecycle.

For Studio Next, update network configuration and SDK/toolchain versions only after checking the current official compatibility guidance.
