import React, { useState, useEffect } from 'react';
import { creditClassesApi, attendanceApi } from '../../api';

const STATUS_STYLE = {
  'Đúng giờ': { bg: '#dcfce7', color: '#16a34a' },
  'Đi muộn': { bg: '#fef9c3', color: '#ca8a04' },
  'Có phép': { bg: '#e0f2fe', color: '#0284c7' },
  'Vắng': { bg: '#fee2e2', color: '#dc2626' },
};

export default function SummaryReport({ user, showToast }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [report, setReport] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(false);
  const [liveRefresh, setLiveRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const lecturerId = user?.lecturer_id || user?.username;

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

  const loadReport = async (classId, silent = false) => {
    if (!classId) return;
    try {
      if (!silent) setLoading(true);
      setSelectedClass(classId);
      const data = await attendanceApi.getClassAttendanceReport(classId);
      setReport(data.report || []);
      setSessions(data.sessions || []);
      setMatrix(data.matrix || []);
      setLastUpdated(new Date());
    } catch (err) {
      if (!silent) {
        showToast?.(err.message || 'Lỗi tải báo cáo', 'danger');
        setReport([]);
        setSessions([]);
        setMatrix([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Cập nhật trực tiếp: refresh định kỳ khi đang chọn lớp
  useEffect(() => {
    if (!selectedClass || !liveRefresh) return;
    const timer = setInterval(() => loadReport(selectedClass, true), 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass, liveRefresh]);

  const badge = (status) => {
    const st = STATUS_STYLE[status] || { bg: '#f1f5f9', color: '#64748b' };
    return (
      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 600, background: st.bg, color: st.color, whiteSpace: 'nowrap' }}>
        {status || '—'}
      </span>
    );
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
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
          <input type="checkbox" checked={liveRefresh} onChange={(e) => setLiveRefresh(e.target.checked)} />
          <span style={{ color: liveRefresh ? '#059669' : '#475569' }}>
            {liveRefresh ? '🟢 Cập nhật trực tiếp' : 'Cập nhật trực tiếp'}
          </span>
        </label>
        {lastUpdated && (
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Cập nhật {lastUpdated.toLocaleTimeString()}</span>
        )}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Đang tải báo cáo...</div>
      ) : !selectedClass ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Chọn lớp để xem tổng kết</div>
      ) : (
        <>
          {/* Báo cáo tổng hợp */}
          <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2edf5', fontWeight: 600, color: '#106fa6', fontSize: '0.9rem' }}>
              Báo cáo tổng hợp ({report.length} SV)
            </div>
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
                  {report.length === 0 ? (
                    <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Chưa có dữ liệu</td></tr>
                  ) : report.map((r) => (
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
          </div>

          {/* Ma trận điểm danh theo buổi */}
          <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2edf5', fontWeight: 600, color: '#106fa6', fontSize: '0.9rem' }}>
              Ma trận điểm danh theo buổi ({sessions.length} buổi)
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: '#f0f7fc' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: '#106fa6', fontWeight: 600, position: 'sticky', left: 0, background: '#f0f7fc' }}>MSSV / Họ tên</th>
                    {sessions.map((s) => (
                      <th key={s.session_id} style={{ padding: '8px 6px', textAlign: 'center', color: '#106fa6', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {s.session_date?.substring(5)}<br />
                        <span style={{ fontWeight: 400, fontSize: '0.7rem', color: '#64748b' }}>{s.start_time}</span>
                      </th>
                    ))}
                    <th style={{ padding: '8px 10px', textAlign: 'center', color: '#106fa6', fontWeight: 600 }}>Điểm CC</th>
                  </tr>
                </thead>
                <tbody>
                  {matrix.length === 0 ? (
                    <tr><td colSpan={sessions.length + 2} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Chưa có buổi học nào</td></tr>
                  ) : matrix.map((m) => {
                    const row = report.find((r) => r.mssv === m.mssv);
                    return (
                      <tr key={m.mssv} style={{ borderBottom: '1px solid #e2edf5' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600, whiteSpace: 'nowrap', position: 'sticky', left: 0, background: '#fff' }}>
                          {m.mssv} · {m.ho_ten}
                        </td>
                        {sessions.map((s) => (
                          <td key={s.session_id} style={{ padding: '6px 4px', textAlign: 'center' }}>
                            {badge(m.cells?.[s.session_id])}
                          </td>
                        ))}
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700 }}>{row?.score ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
