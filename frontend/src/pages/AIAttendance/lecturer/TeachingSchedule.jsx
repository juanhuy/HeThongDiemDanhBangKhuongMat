import React from 'react';
import { useTeachingSchedule } from '../hooks/lecturer/useTeachingSchedule';

const TeachingSchedule = ({ API_BASE }) => {
  const { schedules, loading, error } = useTeachingSchedule(API_BASE);

  return (
    <section className="panel-card">
      <div className="panel-header">
        <h3>Lịch dạy</h3>
      </div>

      {loading ? <p>Đang tải...</p> : null}
      {error ? <p>{error}</p> : null}

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Lớp</th>
              <th>Phòng</th>
              <th>Ngày</th>
              <th>Giờ</th>
            </tr>
          </thead>
          <tbody>
            {schedules.length === 0 ? (
              <tr>
                <td>—</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
              </tr>
            ) : (
              schedules.map((item) => (
                <tr key={item?.schedule_id || item?.id}>
                  <td>{item?.ma_lop_tc || '—'}</td>
                  <td>{item?.phong_hoc || '—'}</td>
                  <td>{item?.ngay_hoc || '—'}</td>
                  <td>{item?.gio_bat_dau || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default TeachingSchedule;
