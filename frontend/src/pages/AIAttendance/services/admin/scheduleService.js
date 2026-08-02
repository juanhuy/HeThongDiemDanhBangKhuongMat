export const scheduleService = {
  createSchedule: async (API_BASE, payload) => {
    // 1. Tạo FormData
    const formData = new FormData();
    formData.append('ma_lop_tc', payload.ma_lop_tc || '');
    formData.append('ngay_hoc', payload.ngay_hoc || '');
    formData.append('phong_hoc', payload.phong_hoc || '');
    formData.append('gio_bat_dau', payload.gio_bat_dau || '');

    // 2. Gọi fetch trực tiếp (KHÔNG truyền HeadersContent-Type)
    const response = await fetch(`${API_BASE}/api/lich_hoc_chi_tiet`, {
      method: 'POST',
      body: formData, 
    });
    console.log("FormData:");

for (const [key, value] of formData.entries()) {
  console.log(key, value);
}
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        typeof errorData?.detail === 'string'
          ? errorData.detail
          : 'Không thể tạo lịch học. Vui lòng kiểm tra lại thông tin.'
      );
    }

    return await response.json();
  },

  updateSchedule: async (API_BASE, id, payload) => {
    const formData = new FormData();
    formData.append('ma_lop_tc', payload.ma_lop_tc || '');
    formData.append('ngay_hoc', payload.ngay_hoc || '');
    formData.append('phong_hoc', payload.phong_hoc || '');
    formData.append('gio_bat_dau', payload.gio_bat_dau || '');

    const response = await fetch(`${API_BASE}/api/lich_hoc_chi_tiet/${id}`, {
      method: 'PUT',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        typeof errorData?.detail === 'string'
          ? errorData.detail
          : 'Không thể cập nhật lịch học.'
      );
    }

    return await response.json();
  },

  deleteSchedule: async (API_BASE, id) => {
    const response = await fetch(`${API_BASE}/api/lich_hoc_chi_tiet/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.detail || 'Không thể xóa lịch học');
    }

    return await response.json();
  },
};