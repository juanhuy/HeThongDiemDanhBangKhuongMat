import { apiFetch } from "./client";

export const listFaculties = () => apiFetch("/api/faculties/");

export const createFaculty = (body) =>
  apiFetch("/api/faculties/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const updateFaculty = (id, body) =>
  apiFetch(`/api/faculties/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const importFacultiesCsv = (file) => {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch("/api/faculties/import/csv", { method: "POST", body: fd });
};