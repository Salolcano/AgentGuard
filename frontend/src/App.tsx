import React, { useMemo, useState } from "react";
import { ShieldCheck, ArrowUpRight, Activity, LockKeyhole, Plus, Check, ChevronDown, CircleHelp, Fingerprint, Network, Zap, ExternalLink, Wallet, AlertTriangle, ShieldAlert } from "lucide-react";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

declare global { interface Window { ethereum?: { request(args: { method: string; params?: unknown[] }): Promise<unknown> } } }

const CONTRACT = import.meta.env.VITE_AGENT_GUARD_ADDRESS || "";
const RPC = import.meta.env.VITE_GENLAYER_RPC || "https://studio.genlayer.com/api";
const CHAIN_ID = "0xf22f";
type AgentPolicy = { agent_id: string; owner: string; agent_address: string; allowed_tools_csv: string; policy_text: string; expires_at: number; revoked: boolean; created_at: number };
type ActionRecord = { action_id: string; agent_id: string; caller: string; tool_name: string; action_summary: string; verdict: string; reason: string; created_at: number };

function short(a: string) { return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "Not connected"; }
function client(account?: `0x${string}`, provider?: unknown) {
  return createClient({ chain: studionet, endpoint: RPC, ...(account ? { account } : {}), ...(provider ? { provider: provider as never } : {}) }) as any;
}
function normalizeRecord(v: any): any {
  if (v instanceof Map) return Object.fromEntries(v.entries());
  return v;
}

export function App() {
  const [account, setAccount] = useState("");
  const [network, setNetwork] = useState<"disconnected"|"ready"|"wrong">("disconnected");
  const [agents, setAgents] = useState<AgentPolicy[]>([]);
  const [actions, setActions] = useState<ActionRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [active, setActive] = useState("overview");
  const [showNew, setShowNew] = useState(false);
  const [agentId, setAgentId] = useState("");
  const [agentAddress, setAgentAddress] = useState("");
  const [tools, setTools] = useState("read_file,search_web");
  const [policy, setPolicy] = useState("Allow read-only research and file inspection. Never send transactions, expose credentials, delete files, or publish externally without explicit human approval.");
  const [expiry, setExpiry] = useState("30");
  const [actionAgent, setActionAgent] = useState("");
  const [tool, setTool] = useState("read_file");
  const [summary, setSummary] = useState("Read the project README and summarize the main setup steps.");
  const [detail, setDetail] = useState("");

  const configured = Boolean(CONTRACT && /^0x[a-fA-F0-9]{40}$/.test(CONTRACT));
  const stats = useMemo(() => ({
    total: agents.length,
    active: agents.filter(a => !a.revoked && a.expires_at * 1000 > Date.now()).length,
    allowed: actions.filter(a => a.verdict === "ALLOW").length,
    blocked: actions.filter(a => a.verdict === "BLOCK" || a.verdict === "REVIEW").length,
  }), [agents, actions]);

  async function connect() {
    setNotice("");
    try {
      if (!window.ethereum) throw new Error("No injected wallet found. Install or unlock a compatible wallet.");
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
      if (!accounts?.[0]) throw new Error("Wallet did not return an account.");
      const chain = String(await window.ethereum.request({ method: "eth_chainId" }));
      setAccount(accounts[0]);
      setNetwork(chain.toLowerCase() === CHAIN_ID ? "ready" : "wrong");
      if (chain.toLowerCase() !== CHAIN_ID) setNotice("Switch your wallet to GenLayer Studio Network (chain 61999) before submitting transactions.");
      else await refresh(accounts[0]);
    } catch (e) { setNotice((e as Error).message); }
  }

  async function switchNetwork() {
    try {
      if (!window.ethereum) throw new Error("Wallet not found.");
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_ID }] });
      setNetwork("ready");
      if (account) await refresh(account);
    } catch (e) { setNotice((e as Error).message); }
  }

  async function refresh(who = account) {
    if (!configured) { setNotice("Set VITE_AGENT_GUARD_ADDRESS in frontend/.env after deploying the contract."); return; }
    try {
      const c = client();
      const ids = await c.readContract({ address: CONTRACT, functionName: "list_agent_ids", args: [0, 100], jsonSafeReturn: true });
      const actionIds = await c.readContract({ address: CONTRACT, functionName: "list_action_ids", args: [0, 100], jsonSafeReturn: true });
      const agentRows = await Promise.all((ids as string[]).map(async id => normalizeRecord(await c.readContract({ address: CONTRACT, functionName: "get_agent", args: [id], jsonSafeReturn: true }))));
      const actionRows = await Promise.all((actionIds as string[]).map(async id => normalizeRecord(await c.readContract({ address: CONTRACT, functionName: "get_action", args: [id], jsonSafeReturn: true }))));
      setAgents(agentRows.filter(Boolean).reverse());
      setActions(actionRows.filter(Boolean).reverse());
      setNotice("");
    } catch (e) { setNotice(`Could not read canonical contract state: ${(e as Error).message}`); }
  }

  async function submit(functionName: string, args: unknown[]) {
    if (!configured) throw new Error("Contract is not configured. Set VITE_AGENT_GUARD_ADDRESS.");
    if (!window.ethereum || !account) throw new Error("Connect your wallet first.");
    if (network !== "ready") throw new Error("Switch to GenLayer Studio Network first.");
    const c = client(account as `0x${string}`, window.ethereum);
    const hash = await c.writeContract({ address: CONTRACT, functionName, args, value: 0n });
    if (typeof hash !== "string") throw new Error("Wallet did not return a transaction hash.");
    setNotice(`Transaction submitted: ${hash}. Waiting for acceptance and finalization…`);
    await c.waitForTransactionReceipt({ hash, status: "ACCEPTED", interval: 3000, retries: 200 });
    const receipt = await c.waitForTransactionReceipt({ hash, status: "FINALIZED", interval: 3000, retries: 400 });
    const raw = normalizeRecord(receipt);
    const status = String(raw?.status ?? raw?.transaction?.status ?? "FINALIZED").toUpperCase();
    if (status.includes("FAIL") || status.includes("REVERT")) throw new Error(`Transaction finalized unsuccessfully (${status}). Hash: ${hash}`);
    setNotice(`Finalized: ${hash}`);
    await refresh();
  }

  async function createAgent(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      if (!/^0x[a-fA-F0-9]{40}$/.test(agentAddress)) throw new Error("Enter a valid 0x agent address.");
      const expiryAt = Math.floor(Date.now()/1000) + Number(expiry) * 86400;
      await submit("register_agent", [agentId.trim(), agentAddress, tools.split(",").map(t=>t.trim()).filter(Boolean).join(","), policy.trim(), expiryAt]);
      setShowNew(false); setAgentId(""); setAgentAddress("");
    } catch (e) { setNotice((e as Error).message); } finally { setBusy(false); }
  }

  async function evaluate(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      const id = `action-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
      await submit("evaluate_action", [actionAgent, id, tool, summary, detail]);
    } catch (e) { setNotice((e as Error).message); } finally { setBusy(false); }
  }

  async function revoke(id: string) {
    setBusy(true);
    try { await submit("revoke_agent", [id]); } catch(e) { setNotice((e as Error).message); } finally { setBusy(false); }
  }

  const currentAgent = agents.find(a => a.agent_id === actionAgent) ?? agents.find(a => !a.revoked);
  return <div className="app">
    <header className="topbar">
      <a className="brand" href="#" onClick={e=>{e.preventDefault();setActive("overview")}}><span className="brand-mark"><ShieldCheck size={19}/></span><span>agent<span className="brand-light">guard</span><i className="brand-dot">.</i></span></a>
      <nav className="nav"><button className={active==="overview"?"nav-active":""} onClick={()=>setActive("overview")}>Overview</button><button className={active==="agents"?"nav-active":""} onClick={()=>setActive("agents")}>Agents</button><button className={active==="activity"?"nav-active":""} onClick={()=>setActive("activity")}>Activity</button></nav>
      <div className="top-actions"><span className={`network-pill ${network==="ready"?"online":network==="wrong"?"warn":""}`}><span className="dot"/> {network==="ready"?"Studio connected":network==="wrong"?"Wrong network":"Studio Network"}</span>{account ? <button className="wallet-btn" onClick={()=>refresh()}><span className="wallet-avatar"><Fingerprint size={15}/></span>{short(account)} <ChevronDown size={14}/></button> : <button className="connect-btn" onClick={connect}><Wallet size={15}/> Connect wallet</button>}</div>
    </header>

    <main className="main">
      <section className="hero">
        <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line"/> GENLAYER · AGENT POLICY LAYER</div><h1>Give your agents<br/><span>room to think.</span><br/>Not to overstep.</h1><p>Define what an agent can do. Evaluate what it wants to do. Keep every decision verifiable on-chain.</p><div className="hero-actions"><button className="primary-btn" onClick={()=>{setShowNew(true);setActive("agents")}}>Register an agent <ArrowUpRight size={16}/></button><button className="text-btn" onClick={()=>setActive("activity")}>View decision log <ArrowUpRight size={15}/></button></div><div className="hero-proof"><span><LockKeyhole size={14}/> Explicit permissions</span><span><Network size={14}/> Intelligent consensus</span><span><Activity size={14}/> On-chain audit trail</span></div></div>
        <div className="hero-visual"><div className="orb orb-one"/><div className="orb orb-two"/><div className="visual-label"><span className="live-dot"/> POLICY ENGINE <span className="visual-mono">AG-01</span></div><div className="visual-card main-card"><div className="card-top"><div className="mini-icon"><ShieldCheck size={17}/></div><div><b>Runtime boundary</b><small>Policy evaluation active</small></div><span className="tiny-status">LIVE</span></div><div className="rule-row"><span className="rule-symbol good"><Check size={13}/></span><div><b>read_file</b><small>Within granted capabilities</small></div><span className="decision allow">ALLOW</span></div><div className="rule-row"><span className="rule-symbol bad"><ShieldAlert size={13}/></span><div><b>send_transaction</b><small>Not in permitted toolset</small></div><span className="decision block">BLOCK</span></div><div className="rule-row"><span className="rule-symbol review"><CircleHelp size={13}/></span><div><b>publish_report</b><small>Policy requires human review</small></div><span className="decision review">REVIEW</span></div><div className="card-foot"><span><span className="live-dot"/> Consensus-backed decision</span><span>01 / 03</span></div></div><div className="floating-chip"><span className="chip-icon"><Zap size={15}/></span><span><b>Policy enforced</b><small>Before execution</small></span></div><div className="visual-stamp"><span>GENLAYER</span><b>INTELLIGENT<br/>CONTRACTS</b></div></div>
      </section>

      {notice && <div className="notice"><AlertTriangle size={16}/><span>{notice}</span><button onClick={()=>setNotice("")}>Dismiss</button></div>}
      {!configured && <div className="config-banner"><span className="config-icon"><CircleHelp size={18}/></span><div><b>Contract address needed</b><p>The interface is ready, but reads and writes require your deployed AgentGuard address. Set <code>VITE_AGENT_GUARD_ADDRESS</code> in <code>frontend/.env</code>.</p></div></div>}
      {network==="wrong" && <div className="config-banner"><span className="config-icon"><Network size={18}/></span><div><b>Switch network to continue</b><p>AgentGuard targets GenLayer Studio Network, chain ID 61999.</p></div><button className="outline-btn" onClick={switchNetwork}>Switch network</button></div>}

      <div className="section-head"><div><div className="eyebrow">CONTROL CENTER</div><h2>{active==="agents"?"Your agents":active==="activity"?"Decision activity":"A clearer view of agent risk"}</h2><p>{active==="agents"?"Register, inspect, and revoke agent identities.":active==="activity"?"Every evaluated action, with its on-chain verdict.":"Set boundaries once. Verify every proposed action against them."}</p></div><button className="refresh-btn" onClick={()=>refresh()}><Activity size={15}/> Refresh state</button></div>

      {active==="overview" && <>
        <div className="stats-grid"><Stat label="Registered agents" value={stats.total.toString().padStart(2,"0")} sub="On-chain identities" icon={<Fingerprint size={17}/>} /><Stat label="Active policies" value={stats.active.toString().padStart(2,"0")} sub="Not revoked or expired" icon={<LockKeyhole size={17}/>} /><Stat label="Allowed actions" value={stats.allowed.toString().padStart(2,"0")} sub="Policy compliant" icon={<Check size={17}/>} /><Stat label="Blocked / review" value={stats.blocked.toString().padStart(2,"0")} sub="Needs attention" icon={<ShieldAlert size={17}/>} /></div>
        <div className="content-grid"><div className="panel"><div className="panel-head"><div><h3>Policy registry</h3><p>Agents with explicit capability boundaries</p></div><button className="small-action" onClick={()=>{setShowNew(true);setActive("agents")}}><Plus size={14}/> Add agent</button></div>{agents.length===0?<Empty icon={<Fingerprint size={22}/>} title="No agents registered yet" text="Create an identity and define its tool permissions to start enforcing boundaries." action={()=>{setShowNew(true);setActive("agents")}}/>:<div className="agent-list">{agents.slice(0,4).map(a=><AgentRow key={a.agent_id} agent={a} onRevoke={revoke}/>)}</div>}<div className="panel-bottom"><span>Canonical contract state</span><button onClick={()=>setActive("agents")}>View all agents <ArrowUpRight size={13}/></button></div></div><div className="panel"><div className="panel-head"><div><h3>Evaluate an action</h3><p>Run a policy check before a tool call</p></div><span className="status-label"><span className="dot"/> READY</span></div><form className="eval-form" onSubmit={evaluate}><label>Agent policy<select value={actionAgent} onChange={e=>setActionAgent(e.target.value)} required><option value="">Select an agent</option>{agents.filter(a=>!a.revoked).map(a=><option key={a.agent_id} value={a.agent_id}>{a.agent_id}</option>)}</select></label><label>Requested tool<select value={tool} onChange={e=>setTool(e.target.value)}><option>read_file</option><option>search_web</option><option>write_file</option><option>send_transaction</option><option>publish_report</option><option>run_command</option><option>custom</option></select></label><label>Action description<textarea value={summary} onChange={e=>setSummary(e.target.value)} required minLength={8} rows={3}/></label><label>Additional context <span className="optional">OPTIONAL</span><textarea value={detail} onChange={e=>setDetail(e.target.value)} rows={2} placeholder="Relevant target, scope, and expected outcome"/></label><button className="primary-btn full" disabled={busy || !account || !configured || !currentAgent}>{busy?"Waiting for transaction…":"Evaluate with GenLayer"} <ArrowUpRight size={15}/></button><p className="form-note"><LockKeyhole size={12}/> A verdict is not execution. Your tool gateway must enforce it.</p></form></div></div>
        <div className="lower-grid"><div className="feature-card"><div className="feature-icon"><ShieldCheck size={20}/></div><div><h3>Hard boundaries first.</h3><p>Identity, expiry, revocation, and allowed tools are checked deterministically before semantic evaluation.</p></div><span>01</span></div><div className="feature-card"><div className="feature-icon"><Network size={20}/></div><div><h3>Meaning, not just keywords.</h3><p>GenLayer evaluates the proposed action against the natural-language policy using consensus.</p></div><span>02</span></div><div className="feature-card"><div className="feature-icon"><Activity size={20}/></div><div><h3>Decisions you can inspect.</h3><p>Verdicts and short reasons are stored in contract state for downstream enforcement and review.</p></div><span>03</span></div></div>
      </>}

      {active==="agents" && <div className="panel wide-panel"><div className="panel-head"><div><h3>Agent registry</h3><p>Policy ownership, permitted tools, and expiry are read from the contract.</p></div><button className="small-action" onClick={()=>setShowNew(!showNew)}><Plus size={14}/> Register agent</button></div>{showNew&&<form className="new-agent-form" onSubmit={createAgent}><div className="form-title"><span className="feature-icon"><Plus size={18}/></span><div><h3>New agent policy</h3><p>Write a narrow policy and only grant the capabilities this agent needs.</p></div></div><div className="form-two"><label>Agent ID<input value={agentId} onChange={e=>setAgentId(e.target.value)} required minLength={3} maxLength={48} placeholder="research-assistant-01"/></label><label>Agent wallet address<input value={agentAddress} onChange={e=>setAgentAddress(e.target.value)} required placeholder="0x…" pattern="0x[a-fA-F0-9]{40}"/></label></div><label>Allowed tools <input value={tools} onChange={e=>setTools(e.target.value)} required placeholder="read_file,search_web"/></label><small className="help-text">Comma-separated exact tool names. Unknown tools are denied by default.</small><label>Policy boundaries <textarea value={policy} onChange={e=>setPolicy(e.target.value)} required minLength={20} rows={4}/></label><label>Policy duration <select value={expiry} onChange={e=>setExpiry(e.target.value)}><option value="1">24 hours</option><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option><option value="365">1 year</option></select></label><div className="form-actions"><button type="button" className="outline-btn" onClick={()=>setShowNew(false)}>Cancel</button><button className="primary-btn" disabled={busy}>{busy?"Submitting…":"Register on-chain"} <ArrowUpRight size={15}/></button></div></form>}{agents.length===0?<Empty icon={<Fingerprint size={22}/>} title="Registry is empty" text="Register your first agent to start defining permissions." action={()=>setShowNew(true)}/>:<div className="agent-list roomy">{agents.map(a=><AgentRow key={a.agent_id} agent={a} onRevoke={revoke}/>)}</div>}</div>}

      {active==="activity" && <div className="panel wide-panel"><div className="panel-head"><div><h3>Action decision log</h3><p>On-chain evaluations; no demo data is inserted into this list.</p></div><span className="status-label"><Activity size={13}/> {actions.length} RECORDS</span></div>{actions.length===0?<Empty icon={<Activity size={22}/>} title="No decisions recorded" text="Submit an action proposal to populate this log from the contract." action={()=>setActive("overview")}/>:<div className="activity-list">{actions.map(a=><div className="activity-row" key={a.action_id}><div className={`activity-icon ${a.verdict.toLowerCase()}`}>{a.verdict==="ALLOW"?<Check size={17}/>:<ShieldAlert size={17}/>}</div><div className="activity-main"><div className="activity-title"><b>{a.tool_name}</b><span className={`decision ${a.verdict.toLowerCase()}`}>{a.verdict}</span></div><p>{a.action_summary}</p><small>{a.agent_id} · {short(a.caller)} · {a.action_id}</small><div className="reason">{a.reason}</div></div><span className="activity-time">{a.created_at?new Date(a.created_at*1000).toLocaleDateString():"On-chain"}</span></div>)}</div>}</div>}

      <footer className="footer"><a className="brand small-brand" href="#"><span className="brand-mark"><ShieldCheck size={16}/></span><span>agentguard<i className="brand-dot">.</i></span></a><span>Policy is the boundary. Proof is the record.</span><a href="https://explorer-studio.genlayer.com" target="_blank" rel="noreferrer">GenLayer Explorer <ExternalLink size={12}/></a></footer>
    </main>

    <div className="bottom-note"><span className="bottom-pulse"/> INTELLIGENT CONTRACTS, REAL ENFORCEMENT <span className="bottom-sep">/</span> GENLAYER STUDIO</div>
  </div>;
}

function Stat({label,value,sub,icon}:{label:string;value:string;sub:string;icon:React.ReactNode}) { return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><strong>{value}</strong><small>{sub}</small><div className="stat-line"><i/></div></div>; }
function Empty({icon,title,text,action}:{icon:React.ReactNode;title:string;text:string;action:()=>void}) { return <div className="empty"><span className="empty-icon">{icon}</span><h4>{title}</h4><p>{text}</p><button onClick={action}>Get started <ArrowUpRight size={13}/></button></div>; }
function AgentRow({agent,onRevoke}:{agent:AgentPolicy;onRevoke:(id:string)=>void}) {
 const expired = agent.expires_at*1000 < Date.now();
 const status = agent.revoked?"REVOKED":expired?"EXPIRED":"ACTIVE";
 return <div className="agent-row"><div className="agent-avatar"><Fingerprint size={18}/></div><div className="agent-details"><div className="agent-title"><b>{agent.agent_id}</b><span className={`badge ${status.toLowerCase()}`}>{status}</span></div><p>{short(agent.agent_address)} <span>·</span> {agent.allowed_tools_csv.split(",").filter(Boolean).length} permitted tools</p><small>{agent.policy_text}</small></div><div className="agent-tools"><code>{agent.allowed_tools_csv}</code><span>Expires {new Date(agent.expires_at*1000).toLocaleDateString()}</span></div>{!agent.revoked&&!expired&&<button className="revoke-btn" onClick={()=>onRevoke(agent.agent_id)}>Revoke</button>}</div>;
}
