export interface DataBundle { ads: any[]; leads: any[]; bills: any[]; tickets: any[]; mode: "live" | "sample-fallback"; warning?: string }

const timeout = (ms: number) => AbortSignal.timeout(ms);

export async function queryZetaris(sql: string): Promise<any[]> {
  const url = process.env.ZETARIS_QUERY_URL;
  const token = process.env.ZETARIS_ID_TOKEN;
  if (!url || !token) throw new Error("Zetaris credentials are not configured");
  const response = await fetch(url, { method: "POST", signal: timeout(8000), headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ select: sql, pageLimit: 100 }) });
  if (!response.ok) throw new Error(`Zetaris query failed (${response.status})`);
  const payload: any = await response.json();
  const rows = payload.data ?? payload.rows ?? payload.result ?? payload.results;
  if (!Array.isArray(rows)) throw new Error("Zetaris response did not contain a supported row array");
  return rows;
}

export async function reviewWithNemotron(input: object): Promise<{ mode: "live" | "deterministic-fallback"; review?: string; warning?: string }> {
  const apiKey = process.env.NVIDIA_API_KEY || process.env.NEMOTRON_API_KEY;
  const url = process.env.NEMOTRON_CHAT_URL || (apiKey ? "https://integrate.api.nvidia.com/v1/chat/completions" : undefined);
  if (!url || !apiKey) return { mode: "deterministic-fallback", warning: "Nemotron API key is not configured" };
  try {
    const response = await fetch(url, { method: "POST", signal: timeout(12000), headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: process.env.NVIDIA_MODEL || "nvidia/nemotron-3.5-lightning-30b-a3b", temperature: 0, max_tokens: 300, response_format: { type: "json_object" }, chat_template_kwargs: { enable_thinking: false }, messages: [{ role: "system", content: "You are Trace's marketing attribution critic. Return JSON with keys verdict, risk, and revision_request. Do not claim causation. Reject conclusions not supported by the supplied metrics." }, { role: "user", content: JSON.stringify(input) }] }) });
    if (!response.ok) throw new Error(`Nemotron request failed (${response.status})`);
    const payload: any = await response.json();
    return { mode: "live", review: payload.choices?.[0]?.message?.content || "{}" };
  } catch (error) { return { mode: "deterministic-fallback", warning: (error as Error).message }; }
}

export async function integrationHealth() {
  const nemotronKey = process.env.NVIDIA_API_KEY || process.env.NEMOTRON_API_KEY;
  return {
    zetaris: { configured: Boolean(process.env.ZETARIS_QUERY_URL && process.env.ZETARIS_ID_TOKEN), endpoint: process.env.ZETARIS_QUERY_URL ? "configured" : "missing" },
    nemotron: { configured: Boolean(nemotronKey), model: process.env.NVIDIA_MODEL || "nvidia/nemotron-3.5-lightning-30b-a3b" },
    sampleMode: process.env.SAMPLE_MODE !== "false"
  };
}
