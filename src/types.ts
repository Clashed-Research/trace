export type EventKind = "plan" | "tool" | "finding" | "critique" | "revision" | "decision";

export interface TraceEvent {
  step: number;
  agent: string;
  kind: EventKind;
  message: string;
  evidence?: string[];
}

export interface CampaignResult {
  campaign: string;
  channel: string;
  spend: number;
  reportedLeads: number;
  matchedCustomers: number;
  grossRevenue: number;
  refunds: number;
  retainedRevenue: number;
  roas: number;
  supportTickets: number;
  confidence: number;
  evidence: string[];
}

export interface Recommendation {
  campaign: string;
  action: "increase" | "hold" | "decrease";
  budgetChangePercent: number;
  rationale: string;
  confidence: number;
}

export interface TraceRun {
  runId: string;
  question: string;
  status: "approved" | "needs-review";
  summary: string;
  campaigns: CampaignResult[];
  recommendations: Recommendation[];
  events: TraceEvent[];
  sources: { name: string; records: number; role: string; status: "reconciled"; freshness: string; mode: "sample" }[];
  identities: { canonical: string; labels: string[]; customerIds: string[]; confidence: number }[];
  evidenceRecords: { id: string; source: string; campaign: string; relationship: "supports" | "contradicts"; detail: string }[];
  revisionCount: number;
  engine: string;
  generatedAt: string;
  scenario: string;
  integrations: { zetaris: "live" | "sample-fallback"; nemotron: "live" | "deterministic-fallback"; memory: "live" };
  modelReview?: string;
}
