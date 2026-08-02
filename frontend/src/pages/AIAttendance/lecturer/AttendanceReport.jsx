import React from 'react';
import { useAttendanceReport } from '../hooks/lecturer/useAttendanceReport';

const AttendanceReport = ({ API_BASE }) => {
  const { attendanceReport, loading, error } = useAttendanceReport(API_BASE);

  return (
    <section className="panel-card">
      <div className="panel-header">
        <h3>Báo cáo điểm danh</h3>
      </div>

      {loading ? <p>Đang tải...</p> : null}
      {error ? <p>{error}</p> : null}

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>MSSV</th>
              <th>Buổi</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {attendanceReport.length === 0 ? (
              <tr>
                <td>—</td>
                <td>—</td>
                <td>—</td>
              </tr>
            ) : (
              attendanceReport.map((item) => (
                <tr key={item?.id || item?.mssv || item?.ma_buoi_hoc}>
                  <td>{item?.mssv || '—'}</td>
                  <td>{item?.ma_buoi_hoc || '—'}</td>
                  <td>{item?.trang_thai || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default AttendanceReport;
