# Trace

**Marketing attribution you can audit.**

Trace is a multi-agent marketing intelligence system for the Open Agent Hackathon 2026, entered in **Solving Fragmented Intelligence**. It reconciles disconnected advertising, CRM, billing, and support records, challenges misleading conclusions, and produces an evidence-backed budget action plan.

## The problem

Ad platforms optimize for their own conversion metrics. CRM labels drift. Billing contains the actual retained revenue. Support data reveals costly customer friction. Marketing leaders are forced to compare incompatible dashboards and often fund the campaign with the most leads rather than the campaign with the most durable revenue.

Trace follows each campaign from spend to retained revenue and preserves the evidence behind every recommendation.

## Agent collaboration

1. **Planner** maps the business question to required evidence.
2. **Source Mapper** chooses and loads relevant sources.
3. **Identity Resolver** normalizes campaign labels and joins customer identities.
4. **Attribution Analyst** calculates retained-revenue ROAS.
5. **Contradiction Critic** attacks conclusions that rely on vanity metrics or incomplete evidence.
6. **Budget Planner** revises the allocation after critique.
7. **Decision Agent** publishes an actionable plan with provenance.

This is not a fixed prompt chain: the critic conditionally triggers a revision when reported lead volume conflicts with retained revenue.

## Sponsor technology

- **Zetaris:** planned live data harness for federated queries across the four source systems. The checked-in sample adapter makes judging deterministic while preserving the same source boundaries.
- **Meterless H-MEM:** installed from the official Agentathon starter. Approved findings and budget decisions persist through `MemoryMiningService` and `MemoryStoreService` in `.trace/`.
- **NVIDIA Nemotron:** live model endpoint slot for planner and critic inference through Meterless. Sample mode uses deterministic logic and requires no key.
- **Cursor:** required development environment; development usage is documented in the submission materials.

Do not claim the planned live integrations as complete until their credentials have been configured and verified.

## Run locally

Requirements: Node.js 20+.

```bash
npm install
npm run setup
npm test
npm run eval
npm run dev
```

Open <http://localhost:4310>. Or run the JSON demo:

```bash
npm run demo
```

## Reliability

- `SAMPLE_MODE=true` works without network access or credentials.
- External-service secrets belong only in `.env`; `.env.example` contains placeholders.
- Every finding carries record-level evidence identifiers.
- Agent turns and the critique-triggered revision are visible in the UI.
- The demo dataset is synthetic and contains no personal information.

## Current limitations

- The sample identity resolver uses normalized campaign names and exact customer IDs.
- Attribution is intentionally bounded and does not claim causal incrementality.
- Recommendations are proposals for human approval; Trace does not change ad-platform budgets.
- Zetaris and Nemotron adapters are implemented but cannot be live-verified until hackathon credentials are supplied locally.
- Live integrations activate when `SAMPLE_MODE=false` and the corresponding endpoint credentials from `.env.example` are present. The UI reports READY or FALLBACK rather than hiding integration state.

## API

- `POST /api/run` — run an investigation with `question` and `scenario`
- `GET /api/health` — inspect sponsor-integration readiness
- `GET /api/history` — list locally persisted investigations
- `GET /api/report/:runId` — download a Markdown audit report

Available scenarios are `refund-leak`, `support-risk`, and `clean-growth`.

See `docs/ARCHITECTURE.md`, `docs/DEMO_SCRIPT.md`, and `docs/SUBMISSION.md` for the technical story and submission workflow.
