import React, { useState } from 'react';
import { useSchedules } from '../hooks/admin/useSchedules';
import { scheduleService }  from '../services/scheduleService';
const ScheduleManagement = ({ API_BASE, showToast, user }) => {
  const { schedules, loading, error, refresh, createSchedule, deleteSchedule } = useSchedules(API_BASE);

  const [formData, setFormData] = useState({
    ma_lop_tc: '',
    ngay_hoc: '',
    phong_hoc: '',
    gio_bat_dau: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const formatTimeToHHMMSS = (timeStr) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length === 2) {
        return `${timeStr}:00`; // Thêm :00 nếu chỉ có Giờ:Phút
    }
    return timeStr;
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  // Kiểm tra dữ liệu an toàn tránh rủi ro null/undefined
  if (
    !formData.ma_lop_tc?.trim() ||
    !formData.ngay_hoc ||
    !formData.phong_hoc?.trim() ||
    !formData.gio_bat_dau
  ) {
    if (showToast) showToast('Vui lòng nhập đầy đủ thông tin lịch học!', 'warning');
    return;
  }

  const payload = {
    ma_lop_tc: formData.ma_lop_tc.trim(),
    ngay_hoc: formData.ngay_hoc,
    phong_hoc: formData.phong_hoc.trim(),
    gio_bat_dau: formatTimeToHHMMSS(formData.gio_bat_dau),
  };

  try {
    console.log("Payload:", payload);
    await scheduleService.createSchedule(API_BASE, payload);
    setFormData({ ma_lop_tc: '', ngay_hoc: '', phong_hoc: '', gio_bat_dau: '' });
    if (showToast) showToast('Thêm lịch học thành công!', 'success');
    refresh();
  } catch (err) {
    if (showToast) showToast(err.message || 'Thêm lịch học thất bại!', 'error');
  }
};

  return (
    <section className="panel-card">
      <div className="panel-header">
        <h3>Quản lý lịch học</h3>
        <button type="button" className="btn btn-primary" onClick={refresh}>Tải lại</button>
      </div>

      {loading ? <p>Đang tải...</p> : null}
      {error ? <p>{error}</p> : null}

      <div className="form-grid compact">
        <label>
          Mã lớp tín chỉ
          <input 
            type="text" 
            name="ma_lop_tc" 
            value={formData.ma_lop_tc} 
            onChange={handleChange} 
          />
        </label>
        <label>
          Ngày học
          <input 
            type="date" 
            name="ngay_hoc" 
            value={formData.ngay_hoc} 
            onChange={handleChange} 
          />
        </label>
        <label>
          Phòng học
          <input 
            type="text" 
            name="phong_hoc" 
            value={formData.phong_hoc} 
            onChange={handleChange} 
          />
        </label>
        <label>
          Giờ bắt đầu
          <input 
            type="time" 
            name="gio_bat_dau" 
            value={formData.gio_bat_dau} 
            onChange={handleChange} 
          />
        </label>
        <button type="button" className="btn btn-primary" onClick={handleSubmit}>Thêm lịch</button>
      </div>

      <div className="list-stack">
        {schedules.length === 0 ? (
          <div className="list-item">
            <span>Chưa có lịch học nào</span>
          </div>
        ) : (
          schedules.map((item) => (
            <div key={item?.schedule_id || item?.id} className="list-item">
              <span>{item?.schedule_id || item?.id || 'Lịch học'}</span>
              <button type="button" className="btn btn-reject" onClick={() => deleteSchedule(item?.schedule_id || item?.id)}>Xóa</button>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default ScheduleManagement;