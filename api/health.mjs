export default function handler(_req, res) { res.status(200).json({ service: "agent-guard", mode: "frontend-contract", configured: Boolean(process.env.VITE_AGENT_GUARD_ADDRESS) }); }
