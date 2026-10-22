import { runTrace } from "./trace.ts";
const result = await runTrace(process.argv.slice(2).join(" ") || undefined);
console.log(JSON.stringify(result, null, 2));
