const requestJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  return response.json();
};

export const lecturerService = {
  listLecturers: async (API_BASE) => requestJson(`${API_BASE}/api/admin/lecturers/`),
  getLeaveRequests: async (API_BASE) => requestJson(`${API_BASE}/api/teacher/leave_requests`),
  approveLeave: async (API_BASE, formData) => {
    const response = await fetch(`${API_BASE}/api/teacher/approve_leave`, {
      method: 'POST',
      body: formData,
    });
    return response;
  },
  rejectLeave: async (API_BASE, formData) => {
    const response = await fetch(`${API_BASE}/api/teacher/reject_leave`, {
      method: 'POST',
      body: formData,
    });
    return response;
  },
};
