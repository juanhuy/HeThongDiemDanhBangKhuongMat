import { apiFetch } from "./client";

export const listStudents = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/api/admin/students${qs ? `?${qs}` : ""}`);
};

export const getStudent = (studentId) =>
  apiFetch(`/api/admin/students/${studentId}`);

export const createStudent = (body) =>
  apiFetch("/api/admin/students/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const updateStudent = (studentId, body) =>
  apiFetch(`/api/admin/students/${studentId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const deleteStudent = (studentId) =>
  apiFetch(`/api/admin/students/${studentId}`, { method: "DELETE" });