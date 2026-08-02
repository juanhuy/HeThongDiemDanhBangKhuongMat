const requestJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  return response.json();
};

export const adminService = {
  listStudents: async (API_BASE) => requestJson(`${API_BASE}/api/admin/students/`),
  createStudent: async (API_BASE, payload) => {
    const response = await fetch(`${API_BASE}/api/admin/students/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response;
  },
  updateStudent: async (API_BASE, studentId, payload) => {
    const response = await fetch(`${API_BASE}/api/admin/students/${studentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response;
  },
  deleteStudent: async (API_BASE, studentId) => {
    const response = await fetch(`${API_BASE}/api/admin/students/${studentId}`, {
      method: 'DELETE',
    });
    return response;
  },
};
