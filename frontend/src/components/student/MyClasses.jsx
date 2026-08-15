import React, { useState, useEffect, useMemo } from 'react';
import { creditClassesApi, schedulesApi, attendanceApi } from '../../api';
import { apiFetch, formBody } from '../../api/client';

// Component con hiển thị thẻ chỉ số KPI
const StatCard = ({ title, value, color, subtitle }) => (
  <div style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e2edf5', flex: 1, minWidth: '200px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 4, fontWeight: 500 }}>{title}</div>
    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: color }}>{value}</div>
    {subtitle && <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>{subtitle}</div>}
  </div>
);

export default function MyClasses({ user, showToast }) {
  const [studentClasses, setStudentClasses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);

  // State cho bộ lọc tra cứu nhanh
  const [lookupClassId, setLookupClassId] = useState('');
  const [lookupSessionId, setLookupSessionId] = useState('');

  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  });

  const mssv = user?.mssv || user?.username?.toUpperCase();

  // Trạng thái Xin nghỉ phép (kết hợp trong Lớp của tôi)
  const [leaveData, setLeaveData] = useState(null);
  const [leaveClassId, setLeaveClassId] = useState('');
  const [leaveScheduleId, setLeaveScheduleId] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveProof, setLeaveProof] = useState('Giấy khám sức khỏe / Lý do cá nhân');
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);

  const loadLeaveData = async () => {
    if (!mssv) return;
    try {
      const res = await apiFetch('/api/student/leave_classes');
      setLeaveData(res);
      if (res.classes?.length && !leaveClassId) {
        setLeaveClassId(res.classes[0].class_id);
      }
    } catch (err) {
      // không chặn trang nếu API lỗi
    }
  };

  useEffect(() => {
    loadLeaveData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mssv]);

  const selectedLeaveClass = useMemo(
    () => leaveData?.classes?.find((c) => c.class_id === leaveClassId) || null,
    [leaveData, leaveClassId]
  );

  const submitLeave = async (e) => {
    e.preventDefault();
    if (!leaveScheduleId || !leaveReason.trim()) {
      showToast?.('Vui lòng chọn buổi học và điền lý do', 'danger');
      return;
    }
    const selected = selectedLeaveClass?.schedules?.find((s) => String(s.buoi_id) === String(leaveScheduleId));
    try {
      setLeaveSubmitting(true);
      const res = await apiFetch('/api/student/leave_request', {
        method: 'POST',
        body: formBody({
          mssv,
          buoi_id: leaveScheduleId,
          buoi_type: selected?.type || 'schedule',
          ly_do: leaveReason,
          minh_chung: leaveProof,
        }),
      });
      showToast?.(res.message || 'Gửi đơn xin nghỉ phép thành công');
      setLeaveScheduleId('');
      setLeaveReason('');
      loadLeaveData(); // làm mới danh sách buổi + lịch sử
    } catch (err) {
      showToast?.(err.message || 'Gửi đơn thất bại', 'danger');
    } finally {
      setLeaveSubmitting(false);
    }
  };

  useEffect(() => {
    if (!mssv) return;
    (async () => {
      try {
        setLoading(true);
        const [clsRes, schRes, attRes] = await Promise.all([
          creditClassesApi.getStudentCreditClasses(mssv),
          schedulesApi.listSchedules(),
          attendanceApi?.getStudentAttendance ? attendanceApi.getStudentAttendance(mssv) : Promise.resolve({ data: [] }),
        ]);
        const classes = clsRes.data || clsRes.classes || [];
        setStudentClasses(classes);
        setSchedules(schRes.schedules || []);
        setAttendanceData(attRes.data || attRes.records || []);
        
        if (classes.length > 0) {
          setLookupClassId(classes[0].class_id);
        }
      } catch (err) {
        showToast?.(err.message || 'Lỗi tải dữ liệu lớp học', 'danger');
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

  // Thống kê chi tiết điểm danh và số buổi vắng theo từng tín chỉ
  const attendanceStatsByClass = useMemo(() => {
    return studentClasses.map((cls) => {
      const clsSchedules = schedules.filter((s) => s.class_id === cls.class_id);
      const totalSessions = clsSchedules.length;
      
      const clsAttendance = attendanceData.filter((a) => a.class_id === cls.class_id);
      const presentCount = clsAttendance.filter((a) => (a.status || '').toLowerCase() === 'present' || a.status === 1).length;
      const absentCount = clsAttendance.filter((a) => (a.status || '').toLowerCase() === 'absent' || a.status === 0).length;
      const presentPercentage = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;
      const absentPercentage = totalSessions > 0 ? Math.round((absentCount / totalSessions) * 100) : 0;

      return {
        ...cls,
        totalSessions,
        presentCount,
        absentCount,
        presentPercentage,
        absentPercentage,
      };
    });
  }, [studentClasses, schedules, attendanceData]);

  // Tổng hợp chỉ số KPI chung cho Dashboard
  const kpiData = useMemo(() => {
    const totalSessions = attendanceStatsByClass.reduce((acc, curr) => acc + curr.totalSessions, 0);
    const totalPresent = attendanceStatsByClass.reduce((acc, curr) => acc + curr.presentCount, 0);
    const totalAbsent = attendanceStatsByClass.reduce((acc, curr) => acc + curr.absentCount, 0);
    const overallRate = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0;

    return {
      totalClasses: studentClasses.length,
      overallRate,
      totalAbsent,
    };
  }, [studentClasses, attendanceStatsByClass]);

  // Danh sách buổi học tương ứng với lớp được chọn để tra cứu nhanh
  const lookupSessions = useMemo(() => {
    if (!lookupClassId) return [];
    return schedules.filter((s) => s.class_id === lookupClassId);
  }, [schedules, lookupClassId]);

  // Kết quả chi tiết của buổi học được chọn
  const selectedSessionResult = useMemo(() => {
    if (!lookupSessionId) return null;
    return attendanceData.find(
      (a) => a.class_id === lookupClassId && (a.session_id === lookupSessionId || a.schedule_id === lookupSessionId)
    );
  }, [attendanceData, lookupClassId, lookupSessionId]);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Đang tải Dashboard...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, background: '#f8fafc', padding: 20, borderRadius: 12 }}>
      
      {/* 1. Header KPIs Dashboard */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <StatCard title="Tổng số lớp học phần" value={kpiData.totalClasses} color="#106fa6" subtitle="Đã đăng ký" />
        <StatCard title="Tỷ lệ điểm danh chung" value={`${kpiData.overallRate}%`} color="#16a34a" subtitle="Trạng thái tích cực" />
        <StatCard title="Tổng số buổi vắng" value={kpiData.totalAbsent} color="#dc2626" subtitle="Cần lưu ý theo dõi" />
      </div>

      {/* 2. Grid Biểu đồ trực quan (Tỷ lệ có mặt & Số buổi vắng) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        
        {/* Biểu đồ tỷ lệ có mặt */}
        <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#106fa6', marginBottom: 14 }}>
            Tỷ lệ điểm danh theo tín chỉ
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {attendanceStatsByClass.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: 16 }}>Chưa có dữ liệu</div>
            ) : (
              attendanceStatsByClass.map((item) => (
                <div key={item.class_id} style={{ padding: 10, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2edf5' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.82rem' }}>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.subject_id} - {item.subject_name}</span>
                    <span style={{ fontWeight: 600, color: item.presentPercentage >= 80 ? '#16a34a' : '#d97706' }}>
                      {item.presentCount}/{item.totalSessions} ({item.presentPercentage}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', background: '#e2edf5', height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${item.presentPercentage}%`, background: '#16a34a', transition: 'width 0.3s ease' }} />
                    <div style={{ width: `${100 - item.presentPercentage}%`, background: '#ef4444', transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Biểu đồ số buổi vắng */}
        <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#dc2626', marginBottom: 14 }}>
            Biểu đồ số buổi vắng theo lớp tín chỉ
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {attendanceStatsByClass.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: 16 }}>Chưa có dữ liệu</div>
            ) : (
              attendanceStatsByClass.map((item) => (
                <div key={item.class_id} style={{ padding: 10, background: '#fef2f2', borderRadius: 8, border: '1px solid #fee2e2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.82rem' }}>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.subject_id} - {item.subject_name}</span>
                    <span style={{ fontWeight: 600, color: item.absentCount > 0 ? '#dc2626' : '#16a34a' }}>
                      Vắng: {item.absentCount} buổi
                    </span>
                  </div>
                  <div style={{ width: '100%', background: '#e2edf5', height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${item.absentPercentage}%`, background: '#ef4444', transition: 'width 0.3s ease' }} />
                    <div style={{ width: `${100 - item.absentPercentage}%`, background: '#22c55e', transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 3. Tra cứu kết quả điểm danh nhanh */}
      <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#106fa6', marginBottom: 14 }}>
          Tra cứu kết quả điểm danh nhanh
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>Chọn lớp học phần</label>
            <select
              value={lookupClassId}
              onChange={(e) => {
                setLookupClassId(e.target.value);
                setLookupSessionId('');
              }}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              {studentClasses.map((c) => (
                <option key={c.class_id} value={c.class_id}>
                  {c.class_id} - {c.subject_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>Chọn buổi học chi tiết</label>
            <select
              value={lookupSessionId}
              onChange={(e) => setLookupSessionId(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="">-- Chọn buổi học --</option>
              {lookupSessions.map((s, idx) => {
                const sId = s.session_id || s.schedule_id || idx;
                const sDate = s.session_date || String(s.start_time || '').substring(0, 10);
                const sTime = s.start_time ? String(s.start_time).substring(11, 16) : '';
                return (
                  <option key={sId} value={sId}>
                    Buổi {idx + 1} - Ngày: {sDate} ({sTime || 'Phòng: ' + (s.room_id || s.room)})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {lookupSessionId && (
          <div style={{ padding: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: '0.85rem' }}>
            <div style={{ fontWeight: 600, color: '#166534', marginBottom: 4 }}>Kết quả điểm danh buổi học:</div>
            {selectedSessionResult ? (
              <div style={{ display: 'flex', gap: 16, color: '#15803d' }}>
                <span>Trạng thái: <strong>{selectedSessionResult.status || 'Có mặt'}</strong></span>
                <span>Thời gian điểm danh: <strong>{selectedSessionResult.check_in_time || selectedSessionResult.time || 'Đúng giờ'}</strong></span>
              </div>
            ) : (
              <div style={{ color: '#65a30d' }}>Chưa có dữ liệu điểm danh hoặc chưa tới giờ điểm danh cho buổi này.</div>
            )}
          </div>
        )}
      </div>

      {/* 4. Danh sách lớp học phần đã đăng ký[cite: 1] */}
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
                    <td style={{ padding: '10px 14px' }}>
                      {c.group_number ? String(c.group_number).padStart(2, '0') : '-'}
                      {c.sub_group_number ? ` - ${String(c.sub_group_number).padStart(2, '0')}` : ''}
                    </td>
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

      {/* 5. Thời khóa biểu tuần[cite: 1] */}
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

      {/* 6. Xin nghỉ phép (kết hợp trong Lớp của tôi) */}
      <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2edf5', color: '#106fa6', fontWeight: 600 }}>
          📝 Xin nghỉ phép
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>Chọn lớp học phần</label>
              <select
                value={leaveClassId}
                onChange={(e) => { setLeaveClassId(e.target.value); setLeaveScheduleId(''); }}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              >
                {(leaveData?.classes || []).map((c) => (
                  <option key={c.class_id} value={c.class_id}>
                    {c.class_id} - {c.subject_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedLeaveClass && (
            <div style={{ marginTop: 14 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                Chọn buổi học (chỉ xin được cho buổi CHƯA bắt đầu)
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selectedLeaveClass.schedules.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '0.82rem', padding: 10, background: '#f8fafc', borderRadius: 6 }}>
                    Không còn buổi học nào để xin nghỉ (các buổi của lớp này đã qua hoặc đã được xử lý).
                  </div>
                ) : selectedLeaveClass.schedules.map((s) => {
                  const disabled = !s.eligible;
                  let note = s.start_time ? ` · ${s.start_time}` : '';
                  if (s.da_diem_danh) note += ' · ⛔ Buổi đã học';
                  else if (s.already_requested) note += ' · ⚠ Đã gửi đơn';
                  return (
                    <label
                      key={`${s.type}-${s.buoi_id}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 6,
                        border: '1px solid', cursor: disabled ? 'not-allowed' : 'pointer',
                        borderColor: disabled ? '#e2e8f0' : '#bfdbfe',
                        background: disabled ? '#f8fafc' : '#eff6ff',
                        opacity: disabled ? 0.65 : 1,
                      }}
                    >
                      <input
                        type="radio"
                        name="leave-schedule"
                        checked={leaveScheduleId === String(s.buoi_id)}
                        onChange={() => setLeaveScheduleId(String(s.buoi_id))}
                        disabled={disabled}
                      />
                      <span style={{ fontSize: '0.85rem', color: '#0f172a' }}>
                        Buổi {s.buoi_id} - Ngày {s.study_date}{note} · Phòng {s.room || '—'}
                        <span style={{
                          marginLeft: 6, padding: '1px 6px', borderRadius: 4, fontSize: '0.68rem', fontWeight: 600,
                          background: s.type === 'session' ? '#dcfce7' : '#f1f5f9',
                          color: s.type === 'session' ? '#15803d' : '#64748b',
                        }}>
                          {s.type === 'session' ? 'Buổi xếp lịch' : 'Lịch cũ'}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>Lý do *</label>
                  <textarea
                    required
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    rows={3}
                    placeholder="VD: Bị ốm có giấy ra viện, Lý do gia đình..."
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>Minh chứng</label>
                  <input
                    value={leaveProof}
                    onChange={(e) => setLeaveProof(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={leaveSubmitting || !leaveScheduleId || !leaveReason.trim()}
                onClick={submitLeave}
                style={{
                  marginTop: 14, padding: '10px 22px', borderRadius: 8, border: 'none',
                  background: leaveSubmitting || !leaveScheduleId || !leaveReason.trim() ? '#94a3b8' : '#106fa6',
                  color: '#fff', fontWeight: 600, cursor: leaveSubmitting || !leaveScheduleId || !leaveReason.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {leaveSubmitting ? 'Đang gửi...' : 'Gửi đơn nghỉ phép'}
              </button>
            </div>
          )}

          {/* Lịch sử đơn nghỉ */}
          {(leaveData?.requests || []).length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 8 }}>Lịch sử đơn nghỉ phép</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#f0f7fc' }}>
                      {['Lớp', 'Ngày học', 'Lý do', 'Trạng thái', 'Người duyệt'].map((h) => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#106fa6', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaveData.requests.map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #e2edf5' }}>
                        <td style={{ padding: '8px 10px' }}>{r.ma_lop_tc}</td>
                        <td style={{ padding: '8px 10px' }}>{r.ngay_hoc}</td>
                        <td style={{ padding: '8px 10px' }}>{r.ly_do}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 600,
                            background: r.trang_thai === 'Approved' ? '#dcfce7' : r.trang_thai === 'Pending' ? '#fef9c3' : '#fee2e2',
                            color: r.trang_thai === 'Approved' ? '#16a34a' : r.trang_thai === 'Pending' ? '#ca8a04' : '#dc2626',
                          }}>
                            {r.trang_thai === 'Approved' ? 'Đã duyệt' : r.trang_thai === 'Pending' ? 'Chờ duyệt' : 'Từ chối'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px' }}>{r.nguoi_duyet || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}