import { apiFetch } from "./client";

export const listSubjects = () => apiFetch("/api/subjects/");

export const createSubject = (body) =>
  apiFetch("/api/subjects/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const updateSubject = (id, body) =>
  apiFetch(`/api/subjects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const importCsv = (formData) =>
  apiFetch("/api/subjects/import/csv", {
    method: "POST",
    body: formData,
  });