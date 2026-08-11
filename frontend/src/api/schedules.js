import { apiFetch, formBody } from "./client";

export const listSchedules = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/api/schedules${qs ? `?${qs}` : ""}`);
};

export const addSchedule = (fields) =>
  apiFetch("/api/schedules", {
    method: "POST",
    body: formBody(fields),
  });

export const deleteSchedule = (sessionId) =>
  apiFetch(`/api/schedules/${sessionId}`, { method: "DELETE" });

export const updateSchedule = (sessionId, fields) =>
  apiFetch(`/api/lich_hoc_chi_tiet/${sessionId}`, {
    method: "PUT",
    body: formBody(fields),
  });