const requestJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  return response.json();
};

export const subjectService = {
  getSubjects: async (API_BASE) => requestJson(`${API_BASE}/api/subjects/`),
  createSubject: async (API_BASE, payload) => {
    const response = await fetch(`${API_BASE}/api/subjects/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response;
  },
  updateSubject: async (API_BASE, subjectId, payload) => {
    const response = await fetch(`${API_BASE}/api/subjects/${subjectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response;
  },
  deleteSubject: async () => {
    return Promise.reject(new Error('Backend hiện tại không hỗ trợ xóa môn học qua API.'));
  },
};
