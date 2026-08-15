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
const STORAGE_REFRESH_KEY = "ptit_refresh_token";

export const getToken = () => localStorage.getItem(STORAGE_TOKEN_KEY);

export const setToken = (token) => {
  if (token) localStorage.setItem(STORAGE_TOKEN_KEY, token);
  else localStorage.removeItem(STORAGE_TOKEN_KEY);
};

export const getRefreshToken = () => localStorage.getItem(STORAGE_REFRESH_KEY);

export const setRefreshToken = (token) => {
  if (token) localStorage.setItem(STORAGE_REFRESH_KEY, token);
  else localStorage.removeItem(STORAGE_REFRESH_KEY);
};

export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const storeSession = (token, user, refreshToken) => {
  setToken(token);
  setRefreshToken(refreshToken);
  if (user) localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
};

export const clearSession = () => {
  setToken(null);
  setRefreshToken(null);
  localStorage.removeItem(STORAGE_USER_KEY);
};

// ---- REFRESH TOKEN: tự cấp lại access token khi hết hạn (401) ----
let _refreshing = null;

async function _refreshAccessToken() {
  if (_refreshing) return _refreshing;
  _refreshing = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error("NO_REFRESH_TOKEN");
    await resolveApiBase();
    const fd = new FormData();
    fd.append("refresh_token", refreshToken);
    const res = await fetch(`${API_BASE}/api/auth/refresh`, { method: "POST", body: fd });
    if (!res.ok) throw new Error("REFRESH_FAILED");
    const data = await res.json();
    setToken(data.access_token);
    setRefreshToken(data.refresh_token);
    if (data.user) localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data.user));
    return true;
  })().finally(() => {
    _refreshing = null;
  });
  return _refreshing;
}

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

  let res = await fetch(url, { ...rest, headers });

  // Access token hết hạn -> thử refresh 1 lần rồi gọi lại
  if (res.status === 401) {
    const refreshed = await _refreshAccessToken().catch(() => false);
    if (refreshed) {
      const retryHeaders = new Headers(rest.headers || {});
      const newToken = getToken();
      if (newToken) retryHeaders.set("Authorization", `Bearer ${newToken}`);
      if (rest.body && !(rest.body instanceof FormData) && !retryHeaders.has("Content-Type")) {
        retryHeaders.set("Content-Type", "application/json");
      }
      res = await fetch(url, { ...rest, headers: retryHeaders });
    }
  }

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
  let res = await fetch(resolvedUrl, { ...options, headers });

  // Access token hết hạn -> refresh 1 lần rồi gọi lại
  if (res.status === 401) {
    const refreshed = await _refreshAccessToken().catch(() => false);
    if (refreshed) {
      const retryHeaders = new Headers(options.headers || {});
      const newToken = getToken();
      if (newToken) retryHeaders.set("Authorization", `Bearer ${newToken}`);
      res = await fetch(resolvedUrl, { ...options, headers: retryHeaders });
    } else {
      clearSession();
      if (typeof globalOnUnauthorized === "function") globalOnUnauthorized();
    }
  }
  return res;
}

