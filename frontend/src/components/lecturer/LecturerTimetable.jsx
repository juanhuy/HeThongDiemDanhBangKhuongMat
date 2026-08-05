import React, { useState, useEffect, useMemo } from 'react';
import { creditClassesApi, schedulesApi } from '../../api';
import { timetableApi } from '../../api';

const PERIODS = Array.from({ length: 16 }, (_, i) => i + 1);
const DAY_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

const timeToPeriod = (timeStr) => {
  if (!timeStr) return null;
  const t = String(timeStr).substring(11, 16) || String(timeStr).substring(0, 5);
  const [h, m] = t.split(':').map(Number);
  const minutes = (h || 0) * 60 + (m || 0);
  if (minutes < 8 * 60) return 1;
  if (minutes < 9 * 60) return 2;
  if (minutes < 10 * 60) return 3;
  if (minutes < 11 * 60) return 4;
  if (minutes < 12 * 60) return 5;
  if (minutes < 13 * 60) return 6;
  if (minutes < 14 * 60) return 7;
  if (minutes < 15 * 60) return 8;
  if (minutes < 16 * 60) return 9;
  if (minutes < 17 * 60) return 10;
  if (minutes < 18 * 60) return 11;
  if (minutes < 19 * 60) return 12;
  if (minutes < 20 * 60) return 13;
  if (minutes < 21 * 60) return 14;
  return 15;
};

const getMonday = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

const formatDate = (d) => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
};

const formatDateFull = (d) => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const formatDateShort = (iso) => {
  if (!iso || iso.length < 10) return '';
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}`;
};

const navBtnStyle = {
  padding: '6px 12px',
  border: '1px solid #b9d5e8',
  borderRadius: 6,
  background: '#fff',
  cursor: 'pointer',
  color: '#0369a1',
  fontWeight: 600,
};

const actionBtnStyle = {
  padding: '7px 14px',
  border: '1px solid #0ea5e9',
  borderRadius: 6,
  background: '#fff',
  color: '#0369a1',
  fontWeight: 600,
  fontSize: '0.82rem',
  cursor: 'pointer',
};

export default function LecturerTimetable({ user, showToast }) {
  const [mode, setMode] = useState('week');
  const [teachingClasses, setTeachingClasses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [compact, setCompact] = useState(false);

  const [studentModal, setStudentModal] = useState(null); // { classId, list, loading }


  const lecturerId = user?.lecturer_id || user?.username;

  // useEffect(() => {
  //   if (!lecturerId) return;
  //   (async () => {
  //     try {
  //       setLoading(true);
  //       // Lấy tất cả lớp TC, lọc theo lecturer_id; lịch toàn hệ thống rồi lọc theo lớp GV
  //       const [clsRes, schRes] = await Promise.all([
  //         creditClassesApi.listCreditClasses(),
  //         schedulesApi.listSchedules(),
  //       ]);
  //       const allClasses = clsRes.data || clsRes.classes || [];
  //       const mine = allClasses.filter(
  //         (c) =>
  //           String(c.lecturer_id || '').toUpperCase() === String(lecturerId).toUpperCase()
  //       );
  //       setTeachingClasses(mine);
  //       setSchedules(schRes.schedules || schRes.data || []);
  //     } catch (err) {
  //       showToast?.(err.message || 'Lỗi tải lịch giảng dạy', 'danger');
  //     } finally {
  //       setLoading(false);
  //     }
  //   })();
  // }, [lecturerId]);

  // Fetch theo mode + week
  useEffect(() => {
    if (!lecturerId) return;
    (async () => {
      try {
        setLoading(true);
        const weekStartStr = weekStart.toISOString().split('T')[0];
        const res = await timetableApi.lecturerTimetable(lecturerId, {
          mode: mode === 'week' ? 'week' : 'semester',
          weekStart: mode === 'week' ? weekStartStr : undefined,
        });
        setSlots(res.slots || []);
        setTeachingClasses(res.teaching_classes || []);
      } catch (err) {
        showToast?.(err.message || 'Lỗi tải lịch giảng dạy', 'danger');
      } finally {
        setLoading(false);
      }
    })();
  }, [lecturerId, mode, weekStart]);

  const openStudents = async (classId) => {
    setStudentModal({ classId, list: [], loading: true });
    try {
      const res = await timetableApi.classStudents(classId);
      setStudentModal({ classId, list: res.data || [], loading: false });
    } catch (err) {
      showToast?.(err.message || 'Lỗi tải DS sinh viên', 'danger');
      setStudentModal(null);
    }
  };

  const classIds = useMemo(
    () => new Set(teachingClasses.map((c) => c.class_id)),
    [teachingClasses]
  );

  const classMap = useMemo(() => {
    const m = {};
    teachingClasses.forEach((c) => {
      m[c.class_id] = c;
    });
    return m;
  }, [teachingClasses]);

  const mySchedules = useMemo(
    () => schedules.filter((s) => classIds.has(s.class_id)),
    [schedules, classIds]
  );

  const daysOfWeek = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      days.push({
        label: DAY_LABELS[i],
        date: d,
        dateStr: d.toISOString().split('T')[0],
        display: formatDate(d),
      });
    }
    return days;
  }, [weekStart]);

  const weekNumber = useMemo(() => {
    const oneJan = new Date(weekStart.getFullYear(), 0, 1);
    const diff = Math.floor((weekStart - oneJan) / 86400000);
    return Math.ceil((diff + oneJan.getDay() + 1) / 7);
  }, [weekStart]);

  const shiftWeek = (delta) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(getMonday(d));
  };

  // ===== WEEK GRID =====
  const weekGrid = useMemo(() => {
    const grid = PERIODS.map(() => Array(7).fill(null));
    mySchedules.forEach((s) => {
      const dateStr = s.session_date || String(s.start_time || '').substring(0, 10);
      const dayIdx = daysOfWeek.findIndex((d) => d.dateStr === dateStr);
      if (dayIdx < 0) return;
      const period = timeToPeriod(s.start_time) || Number(s.shift) || 1;
      const pIdx = Math.min(Math.max(period - 1, 0), 15);
      const cls = classMap[s.class_id] || {};
      grid[pIdx][dayIdx] = {
        ...s,
        subject_name: s.subject_name || cls.subject_name,
        subject_id: cls.subject_id || s.subject_id || s.class_id,
        class_group: cls.class_group || cls.group_number,
        class_id: s.class_id,
        room: s.room_id || s.room,
        student_count: cls.enrolled_count || cls.current_students || cls.max_students,
      };
    });
    return grid;
  }, [mySchedules, daysOfWeek, classMap]);

  // ===== SEMESTER TABLE =====
  const semesterRows = useMemo(() => {
    const byClass = {};
    mySchedules.forEach((s) => {
      const cls = classMap[s.class_id] || {};
      if (!byClass[s.class_id]) {
        const credits =
          (cls.theory_credits || 0) + (cls.practical_credits || 0) ||
          cls.credits ||
          '—';
        byClass[s.class_id] = {
          class_id: s.class_id,
          subject_id: cls.subject_id || s.subject_id || s.class_id,
          subject_name: s.subject_name || cls.subject_name || '—',
          class_group: cls.class_group || cls.group_number || '—',
          credits,
          target_classes: cls.target_classes || cls.admin_classes || [],
          max_students: cls.max_students || cls.enrolled_count || '—',
          slots: [],
        };
      }
      const dateStr = s.session_date || String(s.start_time || '').substring(0, 10);
      let thu = null;
      if (dateStr) {
        const d = new Date(dateStr);
        thu = d.getDay() === 0 ? 8 : d.getDay() + 1;
      }
      const period = timeToPeriod(s.start_time) || Number(s.shift) || 1;
      byClass[s.class_id].slots.push({
        thu,
        period,
        so_tiet: s.so_tiet || s.periods || 1,
        room: s.room_id || s.room || '—',
        dateStr,
      });
    });

    return Object.values(byClass).map((item) => {
      const dates = item.slots.map((x) => x.dateStr).filter(Boolean).sort();
      const dateRange =
        dates.length > 0
          ? `${formatDateShort(dates[0])} đến ${formatDateShort(dates[dates.length - 1])}`
          : '—';

      const seen = new Set();
      const uniqueSlots = [];
      item.slots.forEach((sl) => {
        const key = `${sl.thu}-${sl.period}-${sl.room}`;
        if (seen.has(key)) return;
        seen.add(key);
        uniqueSlots.push(sl);
      });
      uniqueSlots.sort(
        (a, b) => (a.thu || 0) - (b.thu || 0) || (a.period || 0) - (b.period || 0)
      );

      const lopLabel = Array.isArray(item.target_classes)
        ? item.target_classes
            .map((t) => (typeof t === 'string' ? t : t.label || t.id || t.class_id || ''))
            .filter(Boolean)
            .join(', ')
        : item.target_classes || '—';

      return { ...item, slots: uniqueSlots, dateRange, lopLabel: lopLabel || '—' };
    });
  }, [mySchedules, classMap]);

  const exportSemesterCsv = () => {
    const headers = [
      'Mã MH',
      'Tên môn học',
      'Mã lớp TC',
      'Nhóm tổ',
      'Số tín chỉ',
      'Lớp BC',
      'Thứ',
      'Tiết bắt đầu',
      'Số tiết',
      'Phòng',
      'Sĩ số',
      'Thời gian học',
    ];
    const lines = [headers.join(',')];
    semesterRows.forEach((row) => {
      if (row.slots.length === 0) {
        lines.push(
          [
            row.subject_id,
            `"${row.subject_name}"`,
            row.class_id,
            row.class_group,
            row.credits,
            `"${row.lopLabel}"`,
            '',
            '',
            '',
            '',
            row.max_students,
            '',
          ].join(',')
        );
      } else {
        row.slots.forEach((sl) => {
          lines.push(
            [
              row.subject_id,
              `"${row.subject_name}"`,
              row.class_id,
              row.class_group,
              row.credits,
              `"${row.lopLabel}"`,
              sl.thu ?? '',
              sl.period ?? '',
              sl.so_tiet ?? 1,
              sl.room,
              row.max_students,
              `"${row.dateRange}"`,
            ].join(',')
          );
        });
      }
    });
    const blob = new Blob(['\uFEFF' + lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TKB_giang_day_${lecturerId || 'gv'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cellStyle = (hasContent) => ({
    border: '1px solid #b9d5e8',
    padding: compact ? '4px 6px' : '6px 8px',
    verticalAlign: 'top',
    minHeight: compact ? 36 : 52,
    background: hasContent ? '#d6eaf8' : '#fff',
    fontSize: compact ? '0.7rem' : '0.75rem',
    lineHeight: 1.35,
  });

  const tdStyle = {
    padding: '8px 8px',
    color: '#1e3a5f',
    fontSize: '0.8rem',
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
        Đang tải lịch giảng dạy...
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <div
        style={{
          background: '#fff',
          border: '1px solid #b9d5e8',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        {/* Title */}
        <div
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid #e2edf5',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#0b6fa4',
            fontWeight: 700,
            fontSize: '0.95rem',
          }}
        >
          <span>📅</span>
          LỊCH GIẢNG DẠY {mode === 'week' ? 'DẠNG TUẦN' : 'DẠNG HỌC KỲ'}
        </div>

        {/* Toolbar */}
        <div
          style={{
            padding: '12px 16px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            alignItems: 'center',
            borderBottom: '1px solid #eef3f7',
          }}
        >
          <div
            style={{
              display: 'flex',
              border: '1px solid #b9d5e8',
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              onClick={() => setMode('week')}
              style={{
                padding: '7px 14px',
                border: 'none',
                background: mode === 'week' ? '#0ea5e9' : '#fff',
                color: mode === 'week' ? '#fff' : '#0369a1',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              Dạng tuần
            </button>
            <button
              type="button"
              onClick={() => setMode('semester')}
              style={{
                padding: '7px 14px',
                border: 'none',
                borderLeft: '1px solid #b9d5e8',
                background: mode === 'semester' ? '#0ea5e9' : '#fff',
                color: mode === 'semester' ? '#fff' : '#0369a1',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              Dạng học kỳ
            </button>
          </div>

          {mode === 'week' && (
            <>
              <div
                style={{
                  padding: '7px 12px',
                  border: '1px solid #b9d5e8',
                  borderRadius: 6,
                  fontSize: '0.82rem',
                  color: '#0369a1',
                  background: '#f0f9ff',
                  minWidth: 280,
                }}
              >
                Tuần {weekNumber} [từ ngày {formatDateFull(daysOfWeek[0].date)} đến ngày{' '}
                {formatDateFull(daysOfWeek[6].date)}]
              </div>
              <button type="button" onClick={() => shiftWeek(-1)} style={navBtnStyle}>
                ←
              </button>
              <button
                type="button"
                onClick={() => setWeekStart(getMonday(new Date()))}
                style={{ ...navBtnStyle, fontSize: '0.8rem' }}
              >
                Tuần này
              </button>
              <button type="button" onClick={() => shiftWeek(1)} style={navBtnStyle}>
                →
              </button>
            </>
          )}

          <div style={{ flex: 1 }} />

          {mode === 'week' && (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.82rem',
                color: '#0369a1',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={compact}
                onChange={(e) => setCompact(e.target.checked)}
              />
              Lịch tối giản
            </label>
          )}

          <button type="button" onClick={() => window.print()} style={actionBtnStyle}>
            🖨 In
          </button>

          {mode === 'semester' && (
            <button type="button" onClick={exportSemesterCsv} style={actionBtnStyle}>
              📥 Xuất Excel
            </button>
          )}
        </div>

        {/* ===== WEEKLY VIEW ===== */}
        {mode === 'week' && (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                tableLayout: 'fixed',
                fontSize: '0.75rem',
              }}
            >
              <thead>
                <tr style={{ background: '#e8f4fc' }}>
                  <th
                    style={{
                      ...cellStyle(false),
                      width: 56,
                      textAlign: 'center',
                      background: '#d6eaf8',
                      fontWeight: 700,
                      color: '#0b6fa4',
                    }}
                  >
                    ←
                  </th>
                  {daysOfWeek.map((d) => (
                    <th
                      key={d.dateStr}
                      style={{
                        ...cellStyle(false),
                        textAlign: 'center',
                        background: '#d6eaf8',
                        fontWeight: 700,
                        color: '#0b6fa4',
                      }}
                    >
                      {d.label} ({d.display})
                    </th>
                  ))}
                  <th
                    style={{
                      ...cellStyle(false),
                      width: 56,
                      textAlign: 'center',
                      background: '#d6eaf8',
                      fontWeight: 700,
                      color: '#0b6fa4',
                    }}
                  >
                    →
                  </th>
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((period, pIdx) => (
                  <tr key={period}>
                    <td
                      style={{
                        ...cellStyle(false),
                        textAlign: 'center',
                        fontWeight: 600,
                        color: '#0b6fa4',
                        background: '#e8f4fc',
                      }}
                    >
                      Tiết {period}
                    </td>
                    {daysOfWeek.map((d, dayIdx) => {
                      const cell = weekGrid[pIdx][dayIdx];
                      return (
                        <td key={d.dateStr} style={cellStyle(!!cell)}>
                          {cell && (
                            <div>
                              <div style={{ fontWeight: 600, color: '#1e3a5f' }}>
                                {cell.subject_name || 'N/A'}
                                {cell.subject_id ? ` (${cell.subject_id})` : ''}
                              </div>
                              {!compact && (
                                <>
                                  <div style={{ color: '#475569' }}>
                                    Lớp: {cell.class_id}
                                  </div>
                                  <div style={{ color: '#475569' }}>
                                    Nhóm: {cell.class_group || '—'}
                                  </div>
                                  <div style={{ color: '#0369a1' }}>
                                    Phòng: {cell.room || '—'}
                                  </div>
                                </>
                              )}
                              {compact && (
                                <div style={{ color: '#0369a1' }}>
                                  {cell.class_id} · {cell.room || ''}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td style={{ ...cellStyle(false), background: '#e8f4fc' }} />
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#e8f4fc' }}>
                  <td
                    style={{
                      ...cellStyle(false),
                      textAlign: 'center',
                      background: '#d6eaf8',
                      fontWeight: 700,
                      color: '#0b6fa4',
                    }}
                  >
                    ←
                  </td>
                  {daysOfWeek.map((d) => (
                    <td
                      key={d.dateStr}
                      style={{
                        ...cellStyle(false),
                        textAlign: 'center',
                        background: '#d6eaf8',
                        fontWeight: 700,
                        color: '#0b6fa4',
                      }}
                    >
                      {d.label} ({d.display})
                    </td>
                  ))}
                  <td
                    style={{
                      ...cellStyle(false),
                      textAlign: 'center',
                      background: '#d6eaf8',
                      fontWeight: 700,
                      color: '#0b6fa4',
                    }}
                  >
                    →
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ===== SEMESTER VIEW ===== */}
        {mode === 'semester' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#e8f4fc' }}>
                  {[
                    'Mã MH',
                    'Tên môn học',
                    'Mã lớp TC',
                    'Nhóm tổ',
                    'Số TC',
                    'Lớp BC',
                    'Thứ',
                    'Tiết BĐ',
                    'Số tiết',
                    'Phòng',
                    'Sĩ số',
                    'Thời gian học',
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 8px',
                        textAlign: 'left',
                        fontWeight: 700,
                        color: '#0b6fa4',
                        borderBottom: '2px solid #b9d5e8',
                        whiteSpace: 'nowrap',
                        fontSize: '0.78rem',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {semesterRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                      Chưa có lịch giảng dạy trong học kỳ.
                    </td>
                  </tr>
                ) : (
                  semesterRows.map((row) =>
                    row.slots.length === 0 ? (
                      <tr key={row.class_id} style={{ borderBottom: '1px solid #e2edf5' }}>
                        <td style={tdStyle}>{row.subject_id}</td>
                        <td style={{ ...tdStyle, fontWeight: 500 }}>{row.subject_name}</td>
                        <td style={{ ...tdStyle, fontWeight: 600, color: '#0369a1' }}>
                          {row.class_id}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{row.class_group}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{row.credits}</td>
                        <td style={{ ...tdStyle, color: '#0369a1' }}>{row.lopLabel}</td>
                        <td style={tdStyle}>—</td>
                        <td style={tdStyle}>—</td>
                        <td style={tdStyle}>—</td>
                        <td style={tdStyle}>—</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{row.max_students}</td>
                        <td style={tdStyle}>—</td>
                      </tr>
                    ) : (
                      row.slots.map((sl, idx) => (
                        <tr
                          key={`${row.class_id}-${idx}`}
                          style={{
                            borderBottom:
                              idx === row.slots.length - 1
                                ? '1px solid #c5d9e8'
                                : '1px solid #eef3f7',
                          }}
                        >
                          {idx === 0 && (
                            <>
                              <td
                                rowSpan={row.slots.length}
                                style={{
                                  ...tdStyle,
                                  verticalAlign: 'middle',
                                  fontWeight: 600,
                                  color: '#0369a1',
                                }}
                              >
                                {row.subject_id}
                              </td>
                              <td
                                rowSpan={row.slots.length}
                                style={{ ...tdStyle, verticalAlign: 'middle', fontWeight: 500 }}
                              >
                                {row.subject_name}
                              </td>
                              <td
                                rowSpan={row.slots.length}
                                style={{
                                  ...tdStyle,
                                  verticalAlign: 'middle',
                                  fontWeight: 600,
                                  color: '#0369a1',
                                }}
                              >
                                {row.class_id}
                              </td>
                              <td
                                rowSpan={row.slots.length}
                                style={{ ...tdStyle, verticalAlign: 'middle', textAlign: 'center' }}
                              >
                                {row.class_group}
                              </td>
                              <td
                                rowSpan={row.slots.length}
                                style={{ ...tdStyle, verticalAlign: 'middle', textAlign: 'center' }}
                              >
                                {row.credits}
                              </td>
                              <td
                                rowSpan={row.slots.length}
                                style={{
                                  ...tdStyle,
                                  verticalAlign: 'middle',
                                  color: '#0369a1',
                                  maxWidth: 140,
                                }}
                              >
                                {row.lopLabel}
                              </td>
                            </>
                          )}
                          <td style={{ ...tdStyle, textAlign: 'center' }}>{sl.thu ?? '—'}</td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>{sl.period ?? '—'}</td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>{sl.so_tiet ?? 1}</td>
                          <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>
                            {sl.room}
                          </td>
                          {idx === 0 && (
                            <>
                              <td
                                rowSpan={row.slots.length}
                                style={{ ...tdStyle, verticalAlign: 'middle', textAlign: 'center' }}
                              >
                                {row.max_students}
                              </td>
                              <td
                                rowSpan={row.slots.length}
                                style={{
                                  ...tdStyle,
                                  verticalAlign: 'middle',
                                  whiteSpace: 'nowrap',
                                  color: '#475569',
                                }}
                              >
                                {row.dateRange}
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        

        {mySchedules.length === 0 && mode === 'week' && (
          <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
            Chưa có lịch giảng dạy. Kiểm tra phân công lớp tín chỉ.
          </div>
        )}
      </div>
    </div>

    
  );

  {studentModal && (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.45)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    }}
    onClick={() => setStudentModal(null)}
  >
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        width: 560,
        maxWidth: '100%',
        maxHeight: '80vh',
        overflow: 'auto',
        padding: 20,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: '#0b6fa4' }}>
          DS sinh viên — {studentModal.classId}
        </h3>
        <button
          type="button"
          onClick={() => setStudentModal(null)}
          style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer' }}
        >
          ×
        </button>
      </div>
      {studentModal.loading ? (
        <p style={{ textAlign: 'center', color: '#64748b' }}>Đang tải...</p>
      ) : studentModal.list.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#94a3b8' }}>Chưa có sinh viên đăng ký</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#e8f4fc' }}>
              {['STT', 'MSSV', 'Họ tên', 'Lớp BC', 'Ngày ĐK'].map((h) => (
                <th key={h} style={{ padding: '8px', textAlign: 'left', color: '#0b6fa4' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {studentModal.list.map((s, i) => (
              <tr key={s.student_id} style={{ borderBottom: '1px solid #e2edf5' }}>
                <td style={{ padding: '8px' }}>{i + 1}</td>
                <td style={{ padding: '8px', fontWeight: 600, color: '#0369a1' }}>
                  {s.student_id}
                </td>
                <td style={{ padding: '8px' }}>{s.full_name}</td>
                <td style={{ padding: '8px' }}>{s.administrative_class || '—'}</td>
                <td style={{ padding: '8px', color: '#64748b', whiteSpace: 'nowrap' }}>
                  {s.enrollment_date
                    ? new Date(s.enrollment_date).toLocaleDateString('vi-VN')
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
)}
}