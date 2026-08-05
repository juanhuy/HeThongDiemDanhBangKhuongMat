import React, { useState, useEffect } from 'react';
import { creditClassesApi, attendanceApi } from '../../api';

export default function SummaryReport({ user, showToast }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(false);

  const lecturerId = user?.lecturer_id;

  useEffect(() => {
    (async () => {
      try {
        const res = await creditClassesApi.listCreditClasses(lecturerId ? { lecturer_id: lecturerId } : {});
        setClasses(res.data || res.classes || []);
      } catch (err) {
        showToast?.(err.message || 'Lỗi tải lớp', 'danger');
      }
    })();
  }, [lecturerId]);

  const loadReport = async (classId) => {
    if (!classId) return;
    try {
      setLoading(true);
      setSelectedClass(classId);
      const data = await attendanceApi.getClassAttendanceReport(classId);
      setReport(data.report || []);
    } catch (err) {
      showToast?.(err.message || 'Lỗi tải báo cáo', 'danger');
      setReport([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#106fa6', fontWeight: 700, flex: 1 }}>Tổng kết điểm danh & Cấm thi</h2>
        <select
          value={selectedClass}
          onChange={(e) => loadReport(e.target.value)}
          style={{ minWidth: 260, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem' }}
        >
          <option value="">-- Chọn lớp tín chỉ --</option>
          {classes.map((c) => (
            <option key={c.class_id} value={c.class_id}>{c.class_id} · {c.subject_id}</option>
          ))}
        </select>
      </div>

      <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Đang tải báo cáo...</div>
        ) : !selectedClass ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Chọn lớp để xem tổng kết</div>
        ) : report.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Chưa có dữ liệu điểm danh</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f0f7fc' }}>
                  {['MSSV', 'Họ tên', 'Lớp BC', 'Đi muộn', 'Vắng KP', 'Có phép', 'Điểm CC', 'Tỷ lệ vắng', 'Trạng thái'].map((h) => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#106fa6', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.map((r) => (
                  <tr key={r.mssv} style={{ borderBottom: '1px solid #e2edf5', background: r.trang_thai === 'Cấm thi' ? '#fef2f2' : '' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{r.mssv}</td>
                    <td style={{ padding: '10px 12px' }}>{r.ho_ten}</td>
                    <td style={{ padding: '10px 12px' }}>{r.lop_base}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{r.di_muon}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{r.vang_kp}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{r.co_phep}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>{r.score}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{r.ty_le_vang}%</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 600,
                        background: r.trang_thai === 'Cấm thi' ? '#fee2e2' : '#dcfce7',
                        color: r.trang_thai === 'Cấm thi' ? '#dc2626' : '#16a34a',
                      }}>{r.trang_thai}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}