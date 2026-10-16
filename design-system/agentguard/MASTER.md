# AgentGuard visual system

## Product direction
A calm, high-contrast security workspace. The interface should feel private, precise, and operational rather than like a speculative trading terminal.

## Visual principles
- Near-black surfaces and restrained graphite borders.
- Acid-lime accent for active/allowed states, warm orange for review, coral for blocked states.
- Dense but readable policy and activity data.
- Monospace only for addresses, identifiers, status labels, and tool names.
- Never present sample actions as on-chain records.

## Interaction principles
- Wallet/network state remains visible.
- Contract configuration gaps are explicit.
- Writes are disabled until a wallet, correct network, and contract address are present.
- Display transaction hash and wait for acceptance/finalization before refreshing canonical state.
- Explain that a verdict must be enforced by the downstream tool gateway; contract evaluation is not tool execution.

## Inspiration
The reference is usedot.xyz: restrained dark UI, strong typography, spacious hero, lime accents, and product-first messaging. This implementation uses original AgentGuard copy, layout, and code rather than copying site assets or source code.
