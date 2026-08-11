import { apiFetch, formBody } from "./client";

export const getRecentLogs = () => apiFetch("/api/attendance");

export const getClassAttendanceReport = (classId) =>
  apiFetch(`/api/credit-classes/${classId}/attendance/report`);

export const manualCheckin = (fields) =>
  apiFetch("/api/attendance/manual-checkin", {
    method: "POST",
    body: formBody(fields),
  });

export const getStudentAttendance = (studentId) =>
  apiFetch(`/api/attendance?mssv=${encodeURIComponent(studentId)}`);

export const recognizeFace = (file, room) => {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch(`/api/recognize?phong_hoc=${encodeURIComponent(room)}`, {
    method: "POST",
    body: fd,
  });
};

export const presenceSnapshot = (file, room, sessionId) => {
  const fd = new FormData();
  fd.append("file", file);
  const params = new URLSearchParams();
  if (room) params.set("phong_hoc", room);
  if (sessionId) params.set("session_id", sessionId);
  return apiFetch(`/api/presence/snapshot?${params.toString()}`, {
    method: "POST",
    body: fd,
  });
};

export const getLivePresence = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/api/live-presence${qs ? `?${qs}` : ""}`);
};