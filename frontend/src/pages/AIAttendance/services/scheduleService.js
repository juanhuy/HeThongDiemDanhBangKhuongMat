const requestJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  return response.json();
};

export const scheduleService = {
  getSchedules: async (API_BASE) => requestJson(`${API_BASE}/api/lich_hoc_chi_tiet`),
  createSchedule: async (API_BASE, payload) => {
    const formData = new FormData();

    formData.append("ma_lop_tc", payload.ma_lop_tc);
    formData.append("ngay_hoc", payload.ngay_hoc);
    formData.append("phong_hoc", payload.phong_hoc);
    formData.append("gio_bat_dau", payload.gio_bat_dau);

    for (const [key, value] of formData.entries()) {
        console.log(key, value);
    }

    return fetch(`${API_BASE}/api/lich_hoc_chi_tiet`, {
        method: "POST",
        body: formData,
    });
  },
  
  updateSchedule: async (API_BASE, scheduleId, payload) => {
    const formData = new FormData();

    formData.append("ma_lop_tc", payload.ma_lop_tc);
    formData.append("ngay_hoc", payload.ngay_hoc);
    formData.append("phong_hoc", payload.phong_hoc);
    formData.append("gio_bat_dau", payload.gio_bat_dau);

    for (const [key, value] of formData.entries()) {
        console.log(key, value);
    }

    const response = await fetch(`${API_BASE}/api/lich_hoc_chi_tiet/${scheduleId}`, {
      method: 'PUT',
      body: formData,
    });
    return response;
  },
  deleteSchedule: async (API_BASE, scheduleId) => {
    const response = await fetch(`${API_BASE}/api/lich_hoc_chi_tiet/${scheduleId}`, {
      method: 'DELETE',
    });
    return response;
  },
};
