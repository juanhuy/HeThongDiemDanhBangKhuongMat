import React, { useState, useEffect } from 'react';
import { schedulesApi, creditClassesApi } from '../../api';

export default function TeachingSchedule({ user, showToast }) {
  const [schedules, setSchedules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  });
  const [viewMode, setViewMode] = useState('grid'); // grid | list

  const lecturerId = user?.lecturer_id;

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [schRes, clsRes] = await Promise.all([
          schedulesApi.listSchedules(lecturerId ? { lecturer_id: lecturerId } : {}),
          creditClassesApi.listCreditClasses(lecturerId ? { lecturer_id: lecturerId } : {}),
        ]);
        setSchedules(schRes.schedules || []);
        setClasses(clsRes.data || clsRes.classes || []);
      } catch (err) {
        showToast?.(err.message || 'Lỗi tải lịch dạy', 'danger');
      } finally {
        setLoading(false);
      }
    })();
  }, [lecturerId]);

  const getDaysOfWeek = (monStr) => {
    const mon = new Date(monStr);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      days.push({
        label: i === 6 ? 'Chủ Nhật' : `Thứ ${i + 2}`,
        dateStr: d.toISOString().split('T')[0],
        displayDate: `${d.getDate()}/${d.getMonth() + 1}`,
      });
    }
    return days;
  };

  const days = getDaysOfWeek(selectedWeekStart);
  const weekSchedules = schedules.filter((s) =>
    days.some((d) => d.dateStr === (s.session_date || String(s.start_time || '').substring(0, 10)))
  );

  const shiftWeek = (delta) => {
    const d = new Date(selectedWeekStart);
    d.setDate(d.getDate() + delta * 7);
    setSelectedWeekStart(d.toISOString().split('T')[0]);
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Đang tải lịch dạy...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#106fa6', fontWeight: 700 }}>Lịch giảng dạy</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>{classes.length} lớp phụ trách · {schedules.length} buổi học</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setViewMode('grid')} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: viewMode === 'grid' ? '#e0f2fe' : '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>Lưới tuần</button>
          <button onClick={() => setViewMode('list')} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: viewMode === 'list' ? '#e0f2fe' : '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>Danh sách</button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2edf5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#106fa6', fontWeight: 600 }}>Tuần</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => shiftWeek(-1)} style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', background: '#fff' }}>‹</button>
              <span style={{ fontSize: '0.85rem', color: '#475569' }}>{days[0].displayDate} – {days[6].displayDate}</span>
              <button onClick={() => shiftWeek(1)} style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', background: '#fff' }}>›</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: '#e2edf5' }}>
            {days.map((d) => {
              const daySessions = weekSchedules.filter(
                (s) => (s.session_date || String(s.start_time || '').substring(0, 10)) === d.dateStr
              );
              return (
                <div key={d.dateStr} style={{ background: '#fff', minHeight: 140, padding: 8 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#106fa6', marginBottom: 6 }}>
                    {d.label}<br />{d.displayDate}
                  </div>
                  {daySessions.map((s, i) => (
                    <div key={i} style={{ background: '#ede9fe', borderRadius: 6, padding: '6px 8px', marginBottom: 4, fontSize: '0.72rem' }}>
                      <div style={{ fontWeight: 600, color: '#5b21b6' }}>{s.subject_name || s.class_id}</div>
                      <div style={{ color: '#64748b' }}>{s.room_id || s.room || '—'} · {s.start_time ? String(s.start_time).substring(11, 16) : ''}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f0f7fc' }}>
                {['Ngày', 'Giờ', 'Môn / Lớp', 'Phòng', 'Ca'].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#106fa6', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedules.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Chưa có lịch giảng</td></tr>
              ) : (
                schedules.map((s, i) => (
                  <tr key={s.session_id || i} style={{ borderBottom: '1px solid #e2edf5' }}>
                    <td style={{ padding: '10px 14px' }}>{s.session_date || (s.start_time ? String(s.start_time).substring(0, 10) : '-')}</td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      {s.start_time ? String(s.start_time).substring(11, 16) : '-'} – {s.end_time ? String(s.end_time).substring(11, 16) : '-'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 600 }}>{s.subject_name || 'N/A'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.class_id}</div>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0369a1' }}>{s.room_id || s.room || '-'}</td>
                    <td style={{ padding: '10px 14px' }}>{s.shift || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Lớp phụ trách */}
      <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2edf5', color: '#106fa6', fontWeight: 600 }}>
          Lớp tín chỉ phụ trách
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Mã lớp', 'Môn học', 'Nhóm', 'Sĩ số', 'Trạng thái'].map((h) => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {classes.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Chưa có lớp</td></tr>
            ) : (
              classes.map((c) => (
                <tr key={c.class_id} style={{ borderBottom: '1px solid #e2edf5' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0369a1' }}>{c.class_id}</td>
                  <td style={{ padding: '10px 14px' }}>{c.subject_id}</td>
                  <td style={{ padding: '10px 14px' }}>{c.class_group || '-'}</td>
                  <td style={{ padding: '10px 14px' }}>{c.current_students ?? 0}/{c.max_students}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 600,
                      background: c.status === 'Active' ? '#dcfce7' : '#f1f5f9',
                      color: c.status === 'Active' ? '#16a34a' : '#64748b',
                    }}>{c.status || '—'}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}