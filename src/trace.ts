import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadHMEM } from "./engine.ts";
import { queryZetaris, reviewWithNemotron } from "./integrations.ts";
import { saveRun } from "./history.ts";
import type { CampaignResult, Recommendation, TraceEvent, TraceRun } from "./types.ts";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
type Ad = { campaign_id: string; campaign_name: string; channel: string; spend: string; clicks: string; reported_leads: string };
type Lead = { lead_id: string; campaign: string; customer_id: string; status: string; deal_value: number };
type Bill = { customer_id: string; revenue: number; refund: number; months_active: number };
type Ticket = { customer_id: string; tickets: number; sentiment: string; issue: string };

function json<T>(name: string): T { return JSON.parse(fs.readFileSync(path.join(root, "data", name), "utf8")); }
function csv(name: string): Ad[] {
  const [head, ...rows] = fs.readFileSync(path.join(root, "data", name), "utf8").trim().split(/\r?\n/);
  const keys = head.split(",");
  return rows.map(row => Object.fromEntries(row.split(",").map((value, i) => [keys[i], value])) as Ad);
}
function key(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]/g, ""); }

export async function runTrace(question = "Where is marketing spend leaking, and how should next month's budget change?", scenario = "refund-leak"): Promise<TraceRun> {
  const events: TraceEvent[] = [];
  const log = (agent: string, kind: TraceEvent["kind"], message: string, evidence?: string[]) => events.push({ step: events.length + 1, agent, kind, message, evidence });
  let ads = csv("ads.csv"); let leads = json<Lead[]>("crm.json"); let bills = json<Bill[]>("billing.json"); let tickets = json<Ticket[]>("support.json");
  let zetarisMode: "live" | "sample-fallback" = "sample-fallback";
  if (process.env.SAMPLE_MODE === "false") {
    try {
      [ads, leads, bills, tickets] = await Promise.all([
        queryZetaris(process.env.ZETARIS_ADS_SQL || "SELECT * FROM trace.ads"), queryZetaris(process.env.ZETARIS_CRM_SQL || "SELECT * FROM trace.crm"),
        queryZetaris(process.env.ZETARIS_BILLING_SQL || "SELECT * FROM trace.billing"), queryZetaris(process.env.ZETARIS_SUPPORT_SQL || "SELECT * FROM trace.support")
      ]); zetarisMode = "live";
    } catch (error) { log("Source Mapper", "tool", `Zetaris unavailable; activated bounded sample fallback: ${(error as Error).message}`); }
  }
  if (scenario === "clean-growth") { bills = bills.map(b => ({ ...b, refund: 0 })); tickets = tickets.map(t => ({ ...t, tickets: Math.min(t.tickets, 1) })); }
  if (scenario === "support-risk") { tickets = tickets.map(t => t.customer_id === "C-003" || t.customer_id === "C-004" ? { ...t, tickets: 7, sentiment: "negative" } : t); }
  log("Planner", "plan", "Mapped the question to spend, acquisition, retained revenue, refunds, and customer-friction evidence.");
  log("Source Mapper", "tool", "Loaded four fragmented sources and selected campaign name plus customer_id as reconciliation keys.", ["ads.csv", "crm.json", "billing.json", "support.json"]);

  const campaigns: CampaignResult[] = ads.map(ad => {
    const matchedLeads = leads.filter(l => key(l.campaign) === key(ad.campaign_name) && l.status === "won");
    const matchedBills = matchedLeads.flatMap(l => bills.filter(b => b.customer_id === l.customer_id));
    const matchedTickets = matchedLeads.flatMap(l => tickets.filter(t => t.customer_id === l.customer_id));
    const spend = Number(ad.spend);
    const grossRevenue = matchedBills.reduce((n, b) => n + b.revenue, 0);
    const refunds = matchedBills.reduce((n, b) => n + b.refund, 0);
    const retainedRevenue = grossRevenue - refunds;
    const confidence = Math.min(.98, .58 + matchedLeads.length * .1 + matchedBills.length * .08);
    return {
      campaign: ad.campaign_name, channel: ad.channel, spend, reportedLeads: Number(ad.reported_leads),
      matchedCustomers: matchedBills.length, grossRevenue, refunds, retainedRevenue,
      roas: Number((retainedRevenue / spend).toFixed(2)), supportTickets: matchedTickets.reduce((n, t) => n + t.tickets, 0),
      confidence: Number(confidence.toFixed(2)), evidence: [`ads:${ad.campaign_id}`, ...matchedLeads.map(l => `crm:${l.lead_id}`), ...matchedBills.map(b => `billing:${b.customer_id}`), ...matchedTickets.map(t => `support:${t.customer_id}`)]
    };
  });
  log("Identity Resolver", "finding", `Normalized inconsistent campaign labels and joined ${campaigns.reduce((n, c) => n + c.matchedCustomers, 0)} customers across systems.`);
  log("Attribution Analyst", "finding", "Calculated retained-revenue ROAS instead of trusting platform-reported lead volume.", campaigns.map(c => `${c.campaign}: ROAS ${c.roas}x`));

  let recommendations = draft(campaigns, false);
  const misleading = campaigns.find(c => c.reportedLeads === Math.max(...campaigns.map(x => x.reportedLeads)) && c.roas < 1);
  let revisionCount = 0;
  if (misleading) {
    log("Contradiction Critic", "critique", `${misleading.campaign} leads on reported volume but loses retained revenue after refunds. A lead-count recommendation would be unsupported.`, misleading.evidence);
    recommendations = draft(campaigns, true);
    revisionCount++;
    log("Budget Planner", "revision", "Revised allocation using retained revenue, refund exposure, support burden, and match confidence.");
  }
  const top = [...campaigns].sort((a, b) => b.roas - a.roas)[0];
  const weak = [...campaigns].sort((a, b) => a.roas - b.roas)[0];
  const summary = `${weak.campaign} is the clearest revenue leak at ${weak.roas}x retained ROAS; ${top.campaign} is the strongest measured channel at ${top.roas}x.`;
  log("Decision Agent", "decision", summary, [...weak.evidence, ...top.evidence]);

  const model = await reviewWithNemotron({ question, campaigns, proposed_recommendations: recommendations });
  if (model.mode === "live") log("Nemotron Critic", "critique", "Completed a structured second-opinion review through the NVIDIA-compatible endpoint.");
  else log("Nemotron Critic", "tool", `Used deterministic critic fallback: ${model.warning}`);

  const { HMEM, source } = await loadHMEM();
  const hmem = new HMEM({ persistDir: path.join(root, ".trace") });
  await hmem.mine("chat_message", `Trace approved: ${summary}`);
  await hmem.mine("chat_message", `Budget decision: ${recommendations.map(r => `${r.campaign} ${r.action} ${r.budgetChangePercent}%`).join("; ")}`);

  const identities = ads.map(ad => {
    const matches = leads.filter(l => key(l.campaign) === key(ad.campaign_name));
    return { canonical: ad.campaign_name, labels: [...new Set([ad.campaign_name, ...matches.map(l => l.campaign)])], customerIds: matches.map(l => l.customer_id), confidence: .96 };
  });
  const evidenceRecords = campaigns.flatMap(c => c.evidence.map(id => ({
    id, source: id.split(":")[0], campaign: c.campaign,
    relationship: (c.campaign === misleading?.campaign && id.startsWith("support:")) ? "contradicts" as const : "supports" as const,
    detail: id.startsWith("ads:") ? `Spend and reported-lead record for ${c.campaign}` : id.startsWith("crm:") ? `Lead-to-customer link for ${c.campaign}` : id.startsWith("billing:") ? `Revenue and refund record included in retained ROAS` : `Customer-friction record used by the critic`
  })));

  const run: TraceRun = {
    runId: `trace-${Date.now()}`, question, status: "approved", summary, campaigns, recommendations, events,
    sources: [
      { name: "Ad platforms", records: ads.length, role: "Spend and reported performance", status: "reconciled", freshness: "Sample snapshot", mode: "sample" },
      { name: "CRM", records: leads.length, role: "Lead-to-customer identity", status: "reconciled", freshness: "Sample snapshot", mode: "sample" },
      { name: "Billing", records: bills.length, role: "Revenue and refunds", status: "reconciled", freshness: "Sample snapshot", mode: "sample" },
      { name: "Support", records: tickets.length, role: "Customer-friction signals", status: "reconciled", freshness: "Sample snapshot", mode: "sample" }
    ], identities, evidenceRecords, revisionCount, engine: `Meterless H-MEM (${source})`, generatedAt: new Date().toISOString(), scenario,
    integrations: { zetaris: zetarisMode, nemotron: model.mode, memory: "live" }, modelReview: model.review
  };
  saveRun(root, run);
  return run;
}

function draft(campaigns: CampaignResult[], revised: boolean): Recommendation[] {
  return campaigns.map(c => {
    const score = c.roas - c.refunds / Math.max(c.grossRevenue, 1) - c.supportTickets * .03;
    const action = score >= 1.4 ? "increase" : score < .5 ? "decrease" : "hold";
    const change = action === "increase" ? (revised ? 20 : 10) : action === "decrease" ? (revised ? -35 : -15) : 0;
    return { campaign: c.campaign, action, budgetChangePercent: change, rationale: `${c.roas}x retained ROAS, $${c.refunds} refunds, ${c.supportTickets} support tickets`, confidence: c.confidence };
  });
}
