import { apiFetch } from "./client";

export const listLecturers = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/api/admin/lecturers/${qs ? `?${qs}` : ""}`);
};

export const getLecturer = (id) =>
  apiFetch(`/api/admin/lecturers/${id}`);

export const createLecturer = (body) =>
  apiFetch("/api/admin/lecturers/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const updateLecturer = (id, body) =>
  apiFetch(`/api/admin/lecturers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const deleteLecturer = (id) =>
  apiFetch(`/api/admin/lecturers/${id}`, { method: "DELETE" });

export const importLecturers = (file) => {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch("/api/admin/lecturers/import", { method: "POST", body: fd });
};