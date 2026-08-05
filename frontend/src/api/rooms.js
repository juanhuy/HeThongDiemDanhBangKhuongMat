import { apiFetch } from "./client";

export const listRooms = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/api/admin/classrooms/${qs ? `?${qs}` : ""}`);
};

export const createRoom = (body) =>
  apiFetch("/api/admin/classrooms/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const updateRoom = (id, body) =>
  apiFetch(`/api/admin/classrooms/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const deleteRoom = (id) =>
  apiFetch(`/api/admin/classrooms/${id}`, { method: "DELETE" });

export const importRooms = (file) => {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch("/api/admin/classrooms/import", { method: "POST", body: fd });
};