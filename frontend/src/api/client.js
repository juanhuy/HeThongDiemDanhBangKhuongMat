// VITE_API_BASE:
//   - undefined          -> fallback http://127.0.0.1:8000 (dev thông thường)
//   - "" (set rỗng)      -> đường dẫn tương đối (dùng chung origin; Docker dùng nginx proxy /api)
//   - "http://..."       -> dùng URL đó trực tiếp (Capacitor / máy khác)
const rawApiBase = import.meta.env.VITE_API_BASE;
const configuredApiBase =
  rawApiBase === undefined || rawApiBase === null
    ? undefined
    : String(rawApiBase).trim();

const _normalizeBase = (base) =>
  base.replace(
    /^https?:\/\/localhost(?=[:/]|$)/,
    (match) => match.replace("localhost", "127.0.0.1")
  );

export let API_BASE =
  configuredApiBase === undefined
    ? "http://127.0.0.1:8000"
    : configuredApiBase === ""
      ? ""
      : _normalizeBase(configuredApiBase);

// Tự dò backend khi chạy trên Android (emulator 10.0.2.2 / máy thật IP LAN).
// Probe từng ứng viên, dùng cái đầu tiên phản hồi được /docs.
const _candidates = () => {
  const list = [];
  if (configuredApiBase === undefined || configuredApiBase === "") {
    // Dùng đường dẫn tương đối (proxy cùng origin) — không cần dò
    return [];
  }
  list.push(_normalizeBase(configuredApiBase));
  const isAndroid =
    typeof navigator !== "undefined" &&
    /Android/i.test(navigator.userAgent);
  if (isAndroid) {
    const lanIp = list[0].match(/^https?:\/\/([0-9.]+):/);
    if (lanIp && lanIp[1] !== "10.0.2.2") {
      list.push(list[0].replace(lanIp[1], "10.0.2.2"));
    }
  }
  return list;
};

let _resolved = false;
let _probePromise = null;

async function _probeBase(base, timeoutMs = 2500) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${base}/docs`, { signal: ctrl.signal });
    clearTimeout(timer);
    return res.ok ? base : null;
  } catch {
    return null;
  }
}

export async function resolveApiBase() {
  if (_resolved) return API_BASE;
  if (!_probePromise) {
    _probePromise = (async () => {
      for (const base of _candidates()) {
        const ok = await _probeBase(base);
        if (ok) {
          API_BASE = base;
          break;
        }
      }
      _resolved = true;
      return API_BASE;
    })();
  }
  return _probePromise;
}

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
  await resolveApiBase();
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

// Fetch có kèm token (drop-in thay cho fetch khi gọi API có phân quyền).
// Trả về Response như fetch thường, để code cũ (res.ok / res.json()) vẫn hoạt động.
export async function authFetch(url, options = {}) {
  await resolveApiBase();
  const resolvedUrl = url.startsWith("http")
    ? url
    : url.startsWith("/")
      ? `${API_BASE}${url}`
      : url;
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(resolvedUrl, { ...options, headers });
}

