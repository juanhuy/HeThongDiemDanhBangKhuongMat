const requestJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  return response.json();
};

export const reportService = {
  getAttendanceReport: async (API_BASE, ma_lop_tc) => {
    const query = ma_lop_tc ? `?ma_lop_tc=${encodeURIComponent(ma_lop_tc)}` : '';
    return requestJson(`${API_BASE}/api/reports/attendance${query}`);
  },
};
