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

  const lecturerId = user?.lecturer_id || user?.username;

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

  const PERIODS = Array.from({ length: 16 }, (_, i) => i + 1);

  const timeToPeriod = (timeStr) => {
    if (!timeStr) return null;
    const t = String(timeStr).substring(11, 16) || String(timeStr).substring(0, 5);
    const [h, m] = t.split(':').map(Number);
    const minutes = (h || 0) * 60 + (m || 0);
    if (minutes <= 8 * 60) return 1;
    if (minutes <= 9 * 60) return 2;
    if (minutes <= 10 * 60) return 3;
    if (minutes <= 11 * 60) return 4;
    if (minutes <= 12 * 60) return 5;
    if (minutes <= 13 * 60) return 6;
    if (minutes <= 14 * 60) return 7;
    if (minutes <= 15 * 60) return 8;
    if (minutes <= 16 * 60) return 9;
    if (minutes <= 17 * 60) return 10;
    if (minutes <= 18 * 60) return 11;
    if (minutes <= 19 * 60) return 12;
    if (minutes <= 20 * 60) return 13;
    if (minutes <= 21 * 60) return 14;
    return 15;
  };

  const getSoTiet = (startTime, endTime, fallback) => {
    if (fallback && fallback > 1) return fallback;
    if (!startTime || !endTime) return 1;
    const startT = String(startTime).substring(11, 16) || String(startTime).substring(0, 5);
    const endT = String(endTime).substring(11, 16) || String(endTime).substring(0, 5);
    if (!startT || !endT) return 1;
    const [sH, sM] = startT.split(':').map(Number);
    const [eH, eM] = endT.split(':').map(Number);
    const sMin = (sH || 0) * 60 + (sM || 0);
    const eMin = (eH || 0) * 60 + (eM || 0);
    if (eMin <= sMin) return 1;
    return Math.ceil((eMin - sMin) / 60);
  };

  const classMap = React.useMemo(() => {
    return classes.reduce((acc, c) => ({ ...acc, [c.class_id]: c }), {});
  }, [classes]);

  const weekGrid = React.useMemo(() => {
    const grid = PERIODS.map(() => Array(7).fill(null));
    weekSchedules.forEach((s) => {
      const dateStr = s.session_date || String(s.start_time || '').substring(0, 10);
      const dayIdx = days.findIndex((d) => d.dateStr === dateStr);
      if (dayIdx < 0) return;
      
      const period = timeToPeriod(s.start_time) || Number(s.shift) || 1;
      const pIdx = Math.min(Math.max(period - 1, 0), 15);
      const cls = classMap[s.class_id] || {};
      
      const so_tiet = getSoTiet(s.start_time, s.end_time, s.so_tiet || s.periods || s.shift_count);
      
      const target_classes = cls.target_classes || cls.admin_classes || [];
      const lopLabel = Array.isArray(target_classes)
        ? target_classes.map((t) => (typeof t === 'string' ? t : t.label || t.id || t.class_id || '')).filter(Boolean).join(', ')
        : target_classes || '—';

      grid[pIdx][dayIdx] = {
        ...s,
        subject_name: s.subject_name || cls.subject_name,
        subject_id: cls.subject_id || s.subject_id || s.class_id,
        class_group: cls.class_group || cls.group_number,
        sub_group: cls.sub_group_number || '',
        room: s.room_id || s.room,
        current_students: cls.current_students || 0,
        max_students: cls.max_students || 0,
        lopLabel,
        rowSpan: so_tiet,
      };

      for (let i = 1; i < so_tiet; i++) {
        if (pIdx + i < 16) {
          grid[pIdx + i][dayIdx] = 'skip';
        }
      }
    });
    return grid;
  }, [weekSchedules, days, classMap]);

  const cellStyle = (hasContent) => ({
    border: '1px solid #b9d5e8',
    padding: '6px 8px',
    verticalAlign: 'top',
    minHeight: 52,
    background: hasContent ? '#d6eaf8' : '#fff',
    fontSize: '0.75rem',
    lineHeight: 1.35,
  });

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
          <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, overflow: 'auto' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2edf5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#106fa6', fontWeight: 600 }}>Tuần</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={() => shiftWeek(-1)} style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', background: '#fff' }}>‹</button>
                <span style={{ fontSize: '0.85rem', color: '#475569' }}>{days[0].displayDate} – {days[6].displayDate}</span>
                <button onClick={() => shiftWeek(1)} style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', background: '#fff' }}>›</button>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ background: '#e8f4fc' }}>
                  <th style={{ ...cellStyle(false), width: 56, textAlign: 'center', background: '#d6eaf8', fontWeight: 700, color: '#0b6fa4' }}>
                    →
                  </th>
                  {days.map((d) => (
                    <th key={d.dateStr} style={{ ...cellStyle(false), textAlign: 'center', background: '#d6eaf8', fontWeight: 700, color: '#0b6fa4' }}>
                      {d.label} ({d.displayDate})
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((period, pIdx) => (
                  <tr key={period}>
                    <td style={{ ...cellStyle(false), textAlign: 'center', fontWeight: 600, color: '#0b6fa4', background: '#e8f4fc' }}>
                      Tiết {period}
                    </td>
                    {days.map((d, dayIdx) => {
                      const cell = weekGrid[pIdx][dayIdx];
                      if (cell === 'skip') return null;
                      return (
                        <td key={d.dateStr} rowSpan={cell?.rowSpan || 1} style={{ ...cellStyle(!!cell), verticalAlign: 'top', padding: cell ? '6px' : '4px' }}>
                          {cell && (
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                              <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: '0.8rem', marginBottom: 2 }}>
                                {cell.subject_name || 'N/A'} {cell.subject_id ? `(${cell.subject_id})` : ''}
                              </div>
                              <div style={{ color: '#475569', fontSize: '0.75rem', marginBottom: 2 }}>
                                Lớp: {cell.lopLabel || '—'}
                              </div>
                              <div style={{ color: '#475569', fontSize: '0.75rem', marginBottom: 2 }}>
                                Nhóm: {cell.class_group || '—'} {cell.sub_group ? `- Tổ: ${cell.sub_group}` : ''}
                              </div>
                              <div style={{ color: '#0369a1', fontSize: '0.75rem', fontWeight: 600, marginBottom: 2 }}>
                                Phòng: {cell.room || '—'}
                              </div>
                              <div style={{ color: '#64748b', fontSize: '0.7rem' }}>
                                Sĩ số: {cell.current_students || 0}/{cell.max_students || 0}
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
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