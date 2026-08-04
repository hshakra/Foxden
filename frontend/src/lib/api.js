// central api layer, all network access goes through here
// base url comes from VITE_API_BASE_URL in prod
// in dev it stays empty and the vite proxy forwards /api to the backend
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function post(path, body) {
  const resp = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    throw new Error(`Request failed with status ${resp.status}`);
  }
  const data = await resp.json();
  // ThreatFox wraps everything in { query_status, data }
  if (data.query_status && data.query_status !== "ok") {
    throw new Error(`ThreatFox: ${data.query_status}`);
  }
  return data;
}

// threatfox answers "no_result" for unknown names, that is an answer not a failure
export function isNoResult(error) {
  return Boolean(error?.message?.includes("no_result"));
}

export const api = {
  recent: (days) => post("/api/recent", { days }),
  family: (malware, limit = 300) => post("/api/family", { malware, limit }),
  tag: (tag, limit = 300) => post("/api/tag", { tag, limit }),
  search: (ioc) => post("/api/search", { ioc }),
  geo: (ips) => post("/api/geo", { ips }),
};
