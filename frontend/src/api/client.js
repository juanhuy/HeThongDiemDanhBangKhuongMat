const configuredApiBase = (import.meta.env.VITE_API_BASE || "").trim();
const API_BASE = (configuredApiBase || "http://127.0.0.1:8000").replace(
  /^https?:\/\/localhost(?=[:/]|$)/,
  (match) => match.replace("localhost", "127.0.0.1")
);

export async function apiFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, options);
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message = data?.detail || data?.message || `HTTP ${res.status}`;
    const error = new Error(typeof message === "string" ? message : JSON.stringify(message));
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

export function formBody(fields) {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => {
    if (v !== undefined && v !== null) fd.append(k, v);
  });
  return fd;
}

export { API_BASE };