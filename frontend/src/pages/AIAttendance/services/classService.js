const requestJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  return response.json();
};

export const classService = {
  getCreditClasses: async (API_BASE) => requestJson(`${API_BASE}/api/lop_tin_chi`),
  getStudentClasses: async (API_BASE, mssv) => requestJson(`${API_BASE}/api/students/${mssv}/classes`),
  enrollStudentToClass: async (API_BASE, formData) => {
    const response = await fetch(`${API_BASE}/api/sinh_vien_lop_tin_chi`, {
      method: 'POST',
      body: formData,
    });
    return response;
  },
};
