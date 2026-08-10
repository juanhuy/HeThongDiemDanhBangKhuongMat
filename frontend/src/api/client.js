// API client mặc định cho cả hệ thống.
// - url PHẢI là đường dẫn tuyệt đối đầy đủ (VD: "http://127.0.0.1:8000/api/lop_tin_chi").
// - Tự động gắn `Authorization: Bearer <token>` vào mọi request.
// - Nhận HTTP 401 → xoá session và gọi onUnauthorized để App tự logout.
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

// onUnauthorized toàn cục: được gọi khi BẤT KỲ apiFetch nào gặp 401
// (để App tự logout dù request phát sinh từ component/hook không truyền callback).
let globalOnUnauthorized = null;
export const setOnUnauthorized = (fn) => {
  globalOnUnauthorized = typeof fn === "function" ? fn : null;
};

// Fetch wrapper kế thừa fetch chuẩn (giữ nguyên signature fetch(url, options)).
// onUnauthorized là callback gọi khi nhận 401 (được truyền len qua option đặc biệt).
export async function apiFetch(url, options = {}) {
  const { onUnauthorized, ...rest } = options || {};

  const headers = new Headers(rest.headers || {});
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!(rest.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...rest, headers });

  if (res.status === 401) {
    clearSession();
    if (typeof onUnauthorized === "function") onUnauthorized();
    if (typeof globalOnUnauthorized === "function") globalOnUnauthorized();
    throw new Error("UNAUTHORIZED");
  }

  return res;
}