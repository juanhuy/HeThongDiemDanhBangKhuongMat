const requestJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  return response.json();
};

export const attendanceService = {
  getAttendanceLogs: async (API_BASE) => requestJson(`${API_BASE}/api/attendance`),
  submitManualAttendance: async (API_BASE, payload) => {
    const response = await fetch(`${API_BASE}/api/teacher/manual_checkin`, {
      method: 'POST',
      body: payload,
    });
    return response;
  },
};
