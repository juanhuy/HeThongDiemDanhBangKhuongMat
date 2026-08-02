const requestJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  return response.json();
};

export const studentService = {
  getMyClasses: async (API_BASE, mssv) => requestJson(`${API_BASE}/api/students/${mssv}/classes`),
  getAvailableClasses: async (API_BASE) => requestJson(`${API_BASE}/api/lop_tin_chi`),
  registerClass: async (API_BASE, payload) => {
    const response = await fetch(`${API_BASE}/api/sinh_vien_lop_tin_chi`, {
      method: 'POST',
      body: payload,
    });
    return response;
  },
  submitLeave: async (API_BASE, payload) => {
    const response = await fetch(`${API_BASE}/api/student/leave_request`, {
      method: 'POST',
      body: payload,
    });
    return response;
  },
};
