const requestJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  return response.json();
};

export const classService = {
  getCreditClasses: async (API_BASE) => requestJson(`${API_BASE}/api/lop_tin_chi`),
  createClass: async (API_BASE, formData) => {
    const newFormData = new FormData();
    newFormData.append('ma_lop_tc', formData.ma_lop_tc);
    newFormData.append('ma_mon', formData.ma_mon);
    if (formData.ma_gv) {
      newFormData.append('ma_gv', formData.ma_gv);
    }
    const response = await fetch(`${API_BASE}/api/lop_tin_chi`, {
      method: 'POST',
      body: newFormData
    });
    return response;
  },
  updateClass: async () => {
    return Promise.reject(new Error('Backend hiện tại không hỗ trợ cập nhật lớp tín chỉ qua API.'));
  },
  deleteClass: async () => {
    return Promise.reject(new Error('Backend hiện tại không hỗ trợ xóa lớp tín chỉ qua API.'));
  },
};
