# Trace architecture

```text
Business question
      ↓
Planner → Source Mapper → Zetaris federated SQL tools
      ↓                         ↘ sample fallback
Identity Resolver → Attribution Analyst
      ↓
Contradiction Critic ←→ Budget Planner
      ↓                    ↘ revise when unsupported
Nemotron second opinion → Decision Agent
      ↓
Auditable plan + evidence + H-MEM decision memory
```

Zetaris is the live data plane. A tenant-specific full query URL and bearer token are supplied via environment variables; the adapter sends documented `select` and `pageLimit` fields. Four SQL statements preserve the source boundaries.

NVIDIA Nemotron is the live semantic critic through an OpenAI-compatible chat-completions endpoint. It returns a JSON second opinion and never exposes private chain-of-thought. The deterministic critic remains the bounded fallback and owns the final safety gate.

Meterless H-MEM persists approved findings and budget decisions. Every run is also saved as a local JSON audit artifact for history and export.

All network calls have timeouts. Failed sponsor calls become visible fallback events rather than silent failures.
