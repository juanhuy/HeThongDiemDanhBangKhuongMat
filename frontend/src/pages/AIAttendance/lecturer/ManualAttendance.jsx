import React from 'react';
import { useManualAttendance } from '../hooks/lecturer/useManualAttendance';

const ManualAttendance = ({ API_BASE }) => {
  const { loading, error, manualAttendance } = useManualAttendance(API_BASE);

  return (
    <section className="panel-card">
      <div className="panel-header">
        <h3>Điểm danh nhanh</h3>
      </div>

      {loading ? <p>Đang xác nhận...</p> : null}
      {error ? <p>{error}</p> : null}

      <div className="form-grid compact">
        <label>
          MSSV
          <input type="text" name="mssv" />
        </label>
        <label>
          Mã buổi học
          <input type="text" name="ma_buoi_hoc" />
        </label>
        <label>
          Trạng thái
          <input type="text" name="trang_thai" />
        </label>
        <button type="button" className="btn btn-primary" onClick={() => manualAttendance({ mssv: '', ma_buoi_hoc: '', trang_thai: '' })}>
          Xác nhận
        </button>
      </div>
    </section>
  );
};

export default ManualAttendance;
