import React, { useState, useEffect } from 'react';
import { creditClassesApi, schedulesApi } from '../../api';

export default function MyClasses({ user, showToast }) {
  const [studentClasses, setStudentClasses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  });

  const mssv = user?.mssv || user?.username?.toUpperCase();

  useEffect(() => {
    if (!mssv) return;
    (async () => {
      try {
        setLoading(true);
        const [clsRes, schRes] = await Promise.all([
          creditClassesApi.getStudentCreditClasses(mssv),
          schedulesApi.listSchedules(),
        ]);
        setStudentClasses(clsRes.classes || []);
        setSchedules(schRes.schedules || []);
      } catch (err) {
        showToast?.(err.message || 'Lỗi tải lớp học', 'danger');
      } finally {
        setLoading(false);
      }
    })();
  }, [mssv]);

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
  const classIds = new Set(studentClasses.map((c) => c.class_id));
  const weekSchedules = schedules.filter(
    (s) => classIds.has(s.class_id) && days.some((d) => d.dateStr === (s.session_date || String(s.start_time || '').substring(0, 10)))
  );

  const shiftWeek = (delta) => {
    const d = new Date(selectedWeekStart);
    d.setDate(d.getDate() + delta * 7);
    setSelectedWeekStart(d.toISOString().split('T')[0]);
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Đang tải...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Danh sách lớp */}
      <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2edf5', color: '#106fa6', fontWeight: 600 }}>
          Lớp học phần đã đăng ký ({studentClasses.length})
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f0f7fc' }}>
                {['Mã lớp', 'Môn học', 'Nhóm', 'TC', 'Trạng thái'].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#106fa6', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {studentClasses.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Chưa có lớp nào</td>
                </tr>
              ) : (
                studentClasses.map((c) => (
                  <tr key={c.class_id} style={{ borderBottom: '1px solid #e2edf5' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0369a1' }}>{c.class_id}</td>
                    <td style={{ padding: '10px 14px' }}>{c.subject_id} – {c.subject_name || ''}</td>
                    <td style={{ padding: '10px 14px' }}>{c.class_group || '-'}</td>
                    <td style={{ padding: '10px 14px' }}>{c.credits ?? '-'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 600,
                        background: (c.class_status || '').toLowerCase() === 'active' ? '#dcfce7' : '#f1f5f9',
                        color: (c.class_status || '').toLowerCase() === 'active' ? '#16a34a' : '#64748b',
                      }}>
                        {c.class_status || c.status || 'Enrolled'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TKB tuần */}
      <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2edf5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#106fa6', fontWeight: 600 }}>Thời khóa biểu tuần</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => shiftWeek(-1)} style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', background: '#fff' }}>‹</button>
            <span style={{ fontSize: '0.85rem', color: '#475569' }}>
              {days[0].displayDate} – {days[6].displayDate}
            </span>
            <button onClick={() => shiftWeek(1)} style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', background: '#fff' }}>›</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: '#e2edf5' }}>
          {days.map((d) => {
            const daySessions = weekSchedules.filter(
              (s) => (s.session_date || String(s.start_time || '').substring(0, 10)) === d.dateStr
            );
            return (
              <div key={d.dateStr} style={{ background: '#fff', minHeight: 120, padding: 8 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#106fa6', marginBottom: 6 }}>
                  {d.label}<br />{d.displayDate}
                </div>
                {daySessions.map((s, i) => (
                  <div key={i} style={{ background: '#e0f2fe', borderRadius: 6, padding: '4px 6px', marginBottom: 4, fontSize: '0.7rem' }}>
                    <div style={{ fontWeight: 600 }}>{s.subject_name || s.class_id}</div>
                    <div>{s.room_id || s.room || ''} · {s.start_time ? String(s.start_time).substring(11, 16) : ''}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}