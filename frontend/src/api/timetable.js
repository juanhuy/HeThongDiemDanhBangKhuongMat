import { apiFetch, API_BASE } from './client';

export const timetableApi = {
  studentTimetable: (studentId, { mode = 'week', weekStart } = {}) => {
    const params = new URLSearchParams({ mode });
    if (weekStart) params.set('week_start', weekStart);
    return apiFetch(`/api/timetable/student/${encodeURIComponent(studentId)}?${params}`);
  },

  lecturerTimetable: (lecturerId, { mode = 'week', weekStart } = {}) => {
    const params = new URLSearchParams({ mode });
    if (weekStart) params.set('week_start', weekStart);
    return apiFetch(`/api/timetable/lecturer/${encodeURIComponent(lecturerId)}?${params}`);
  },

  adminTimetable: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.mode) params.set('mode', filters.mode);
    if (filters.weekStart) params.set('week_start', filters.weekStart);
    if (filters.semester_id) params.set('semester_id', filters.semester_id);
    if (filters.lecturer_id) params.set('lecturer_id', filters.lecturer_id);
    if (filters.subject_id) params.set('subject_id', filters.subject_id);
    if (filters.room_id) params.set('room_id', filters.room_id);
    return apiFetch(`/api/timetable/admin?${params}`);
  },

  classStudents: (classId) =>
    apiFetch(`/api/timetable/classes/${encodeURIComponent(classId)}/students`),
};