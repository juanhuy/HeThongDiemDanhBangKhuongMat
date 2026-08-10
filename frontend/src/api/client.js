const configuredApiBase = (import.meta.env.VITE_API_BASE || "").trim();
export const API_BASE = (configuredApiBase || "http://127.0.0.1:8000").replace(
  /^https?:\/\/localhost(?=[:/]|$)/,
  (match) => match.replace("localhost", "127.0.0.1")
);

const STORAGE_TOKEN_KEY = "ptit_token";
const STORAGE_USER_KEY = "ptit_user";

export const getToken = () => localStorage.getItem(STORAGE_TOKEN_KEY);

export const setToken = (token) => {
  if (token) localStorage.setItem(STORAGE_TOKEN_KEY, token);
  else localStorage.removeItem(STORAGE_TOKEN_KEY);
};

export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const storeSession = (token, user) => {
  setToken(token);
  if (user) localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
};

export const clearSession = () => {
  localStorage.removeItem(STORAGE_TOKEN_KEY);
  localStorage.removeItem(STORAGE_USER_KEY);
};

let globalOnUnauthorized = null;
export const setOnUnauthorized = (fn) => {
  globalOnUnauthorized = typeof fn === "function" ? fn : null;
};

export async function apiFetch(path, options = {}) {
  const { onUnauthorized, ...rest } = options || {};
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  const headers = new Headers(rest.headers || {});
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (rest.body && !(rest.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...rest, headers });

  if (res.status === 401) {
    clearSession();
    if (typeof onUnauthorized === "function") onUnauthorized();
    if (typeof globalOnUnauthorized === "function") globalOnUnauthorized();
    throw new Error("UNAUTHORIZED");
  }

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
