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