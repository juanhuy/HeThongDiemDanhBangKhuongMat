import { apiFetch } from "./client";

export const listMajors = () => apiFetch("/api/majors/");

export const createMajor = (body) =>
  apiFetch("/api/majors/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const updateMajor = (id, body) =>
  apiFetch(`/api/majors/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const importMajorsCsv = (file) => {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch("/api/majors/import/csv", { method: "POST", body: fd });
};