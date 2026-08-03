/*
  Central API layer. All network access goes through here.
  Base URL comes from VITE_API_BASE_URL so prod ≠ localhost;
  in dev it's empty and the Vite proxy forwards /api → :8000.
*/
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function post(path, body) {
  const resp = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    throw new Error(`Request failed (${resp.status}) — ${resp.statusText}`);
  }
  const data = await resp.json();
  // ThreatFox wraps everything in { query_status, data }
  if (data.query_status && data.query_status !== "ok") {
    throw new Error(`ThreatFox: ${data.query_status}`);
  }
  return data;
}

export const api = {
  recent: (days) => post("/api/recent", { days }),
  family: (malware, limit = 300) => post("/api/family", { malware, limit }),
  tag: (tag, limit = 300) => post("/api/tag", { tag, limit }),
  search: (ioc) => post("/api/search", { ioc }),
  geo: (ips) => post("/api/geo", { ips }),
};
