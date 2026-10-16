import { readFileSync, existsSync } from "node:fs";
const envPath = "frontend/.env";
if (!existsSync(envPath)) {
  console.log("No frontend/.env found. Copy frontend/.env.example and set the deployed contract address.");
  process.exit(0);
}
const env = readFileSync(envPath, "utf8");
const address = env.match(/^VITE_AGENT_GUARD_ADDRESS=(.*)$/m)?.[1]?.trim() ?? "";
if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
  console.error("VITE_AGENT_GUARD_ADDRESS is missing or invalid.");
  process.exit(1);
}
console.log("Contract address format is valid. This does not prove that a compatible contract is deployed.");
