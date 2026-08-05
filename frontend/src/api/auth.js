import { apiFetch, formBody } from "./client";

export const login = (username, password) =>
  apiFetch("/api/auth/login", {
    method: "POST",
    body: formBody({ username, password }),
  });