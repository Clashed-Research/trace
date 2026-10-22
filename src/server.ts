import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runTrace } from "./trace.ts";
import { getRun, listRuns, report } from "./history.ts";
import { integrationHealth } from "./integrations.ts";
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const port = Number(process.env.PORT || 4310);
const server = http.createServer(async (req, res) => {
  if (req.url === "/api/run" && req.method === "POST") {
    const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
    try { const result = await runTrace(body.question, body.scenario); res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(result)); }
    catch (error) { res.writeHead(500, { "content-type": "application/json" }); res.end(JSON.stringify({ error: (error as Error).message })); }
    return;
  }
  if (req.url === "/api/health") { res.writeHead(200,{"content-type":"application/json"}); res.end(JSON.stringify(await integrationHealth())); return; }
  if (req.url === "/api/history") { res.writeHead(200,{"content-type":"application/json"}); res.end(JSON.stringify(listRuns(root).map((r:any)=>({runId:r.runId,generatedAt:r.generatedAt,status:r.status,summary:r.summary,scenario:r.scenario})))); return; }
  if (req.url?.startsWith("/api/report/")) { const id=decodeURIComponent(req.url.split("/").pop()||""); const run=getRun(root,id); if(!run){res.writeHead(404);res.end("Not found");return;} res.writeHead(200,{"content-type":"text/markdown; charset=utf-8","content-disposition":`attachment; filename="${id}.md"`});res.end(report(run));return; }
  const file = req.url === "/app.js" ? "app.js" : req.url === "/styles.css" ? "styles.css" : "index.html";
  const types: Record<string,string> = { "app.js":"text/javascript", "styles.css":"text/css", "index.html":"text/html" };
  res.writeHead(200, { "content-type": types[file] }); res.end(fs.readFileSync(path.join(root, "web", file)));
});
server.listen(port, () => console.log(`Trace is live at http://localhost:${port}`));
