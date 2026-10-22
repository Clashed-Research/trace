import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { runTrace } from "../src/trace.ts";
import { getRun, listRuns, report } from "../src/history.ts";
import { integrationHealth } from "../src/integrations.ts";

async function body(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
}
function json(res: ServerResponse, status: number, value: unknown) {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(value));
}
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const root = process.cwd();
  const url = new URL(req.url || "/", "https://trace.local");
  try {
    if (url.pathname === "/api/run" && req.method === "POST") {
      const input = await body(req);
      return json(res, 200, await runTrace(input.question, input.scenario));
    }
    if (url.pathname === "/api/health") return json(res, 200, await integrationHealth());
    if (url.pathname === "/api/history") return json(res, 200, listRuns(root).map((run:any)=>({runId:run.runId,generatedAt:run.generatedAt,status:run.status,summary:run.summary,scenario:run.scenario})));
    if (url.pathname.startsWith("/api/report/")) {
      const id = decodeURIComponent(url.pathname.split("/").pop() || "");
      const run = getRun(root, id);
      if (!run) return json(res, 404, { error: "Run not found on this instance. Re-run the investigation, then export it." });
      res.writeHead(200, { "content-type": "text/markdown; charset=utf-8", "content-disposition": `attachment; filename="${id}.md"` });
      return res.end(report(run));
    }
    const file = url.pathname === "/app.js" ? "app.js" : url.pathname === "/styles.css" ? "styles.css" : "index.html";
    const types: Record<string,string> = { "app.js":"text/javascript", "styles.css":"text/css", "index.html":"text/html" };
    res.writeHead(200, { "content-type": types[file], "cache-control": file === "index.html" ? "no-cache" : "public, max-age=3600" });
    return res.end(fs.readFileSync(path.join(root, "web", file)));
  } catch (error) {
    return json(res, 500, { error: (error as Error).message });
  }
}
