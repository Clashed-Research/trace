import { runTrace } from "./trace.ts";
const cases = [
  { id: "refund-leak", question: "Where is spend leaking?", expectCritique: true },
  { id: "support-risk", question: "Which campaign hides customer-service cost?", expectCritique: true },
  { id: "clean-growth", question: "Which channel deserves more budget?", expectCritique: false }
];
let passed=0;
for(const c of cases){const run=await runTrace(c.question,c.id);const checks={complete:run.recommendations.length===3,provenance:run.evidenceRecords.length>=18,critic:c.expectCritique?run.events.some(e=>e.kind==="critique"):true,memory:run.integrations.memory==="live"};const ok=Object.values(checks).every(Boolean);if(ok)passed++;console.log(JSON.stringify({scenario:c.id,ok,checks,summary:run.summary}));}
console.log(`\nTrace evaluation: ${passed}/${cases.length} scenarios passed`);if(passed!==cases.length)process.exit(1);
