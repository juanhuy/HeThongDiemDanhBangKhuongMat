import React, { useState, useEffect, useMemo } from 'react';
import { attendanceApi, creditClassesApi, schedulesApi } from '../../api';

// Trạng thái gửi lên backend khi bấm nút
const STATUS_ACTIONS = [
  { value: 'Present', label: 'Có mặt', color: '#10b981', bg: '#e6f8f0' },
  { value: 'Late', label: 'Đi muộn', color: '#d48806', bg: '#fff7e6' },
  { value: 'Excused', label: 'Có phép', color: '#0369a1', bg: '#e6f0fb' },
  { value: 'Absent', label: 'Vắng KP', color: '#ef4444', bg: '#fdeaea' },
];

// Map trạng thái hiển thị đã chuẩn hóa từ backend
const STATUS_LABEL = {
  'Có mặt': { color: '#10b981', bg: '#e6f8f0' },
  'Đi muộn': { color: '#d48806', bg: '#fff7e6' },
  'Có phép': { color: '#0369a1', bg: '#e6f0fb' },
  'Vắng không phép': { color: '#ef4444', bg: '#fdeaea' },
  'Chưa điểm danh': { color: '#94a3b8', bg: '#f1f5f9' },
};

const SUMMARY_META = [
  { key: 'tong_sv', label: 'Tổng SV', color: '#106fa6' },
  { key: 'da_diem_danh', label: 'Đã điểm danh', color: '#10b981' },
  { key: 'co_mat', label: 'Có mặt', color: '#10b981' },
  { key: 'di_muon', label: 'Đi muộn', color: '#d48806' },
  { key: 'co_phep', label: 'Có phép', color: '#0369a1' },
  { key: 'vang_kp', label: 'Vắng', color: '#ef4444' },
  { key: 'chua_diem_danh', label: 'Chưa điểm danh', color: '#94a3b8' },
];

export default function ManualCheckin({ user, showToast }) {
  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [roster, setRoster] = useState(null); // {students, summary, absent_list, session}
  const [sessionSummary, setSessionSummary] = useState([]);
  const [classReport, setClassReport] = useState([]);
  const [search, setSearch] = useState('');
  const [marking, setMarking] = useState(null); // mssv đang lưu
  const [loading, setLoading] = useState(false);

  const lecturerId = user?.lecturer_id || user?.username;

  // Tải danh sách lớp GV giảng dạy
  useEffect(() => {
    (async () => {
      try {
        const [clsRes, schRes] = await Promise.all([
          creditClassesApi.listCreditClasses(lecturerId ? { lecturer_id: lecturerId } : {}),
          schedulesApi.listSchedules(lecturerId ? { lecturer_id: lecturerId } : {}),
        ]);
        setClasses(clsRes.data || clsRes.classes || []);
        setSessions(schRes.schedules || []);
      } catch (err) {
        showToast?.(err.message || 'Lỗi tải dữ liệu', 'danger');
      }
    })();
  }, [lecturerId]);

  const classSessions = useMemo(
    () => sessions.filter((s) => s.class_id === selectedClass),
    [sessions, selectedClass]
  );

  // Khi chọn lớp: tải tổng kết các buổi + báo cáo cảnh báo
  useEffect(() => {
    if (!selectedClass) return;
    (async () => {
      try {
        const [sumRes, repRes] = await Promise.all([
          attendanceApi.classSessionsSummary(selectedClass),
          attendanceApi.getClassAttendanceReport(selectedClass),
        ]);
        setSessionSummary(sumRes.sessions || []);
        setClassReport(repRes.report || []);
      } catch (err) {
        showToast?.(err.message || 'Lỗi tải tổng kết buổi học', 'danger');
      }
    })();
  }, [selectedClass]);

  // Khi chọn buổi: tải danh sách SV để điểm danh thủ công
  useEffect(() => {
    if (!selectedClass || !selectedSession) {
      setRoster(null);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const res = await attendanceApi.getClassRoster(selectedClass, selectedSession);
        setRoster(res);
      } catch (err) {
        showToast?.(err.message || 'Lỗi tải danh sách lớp', 'danger');
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedClass, selectedSession]);

  const markCheckin = async (mssv, value) => {
    try {
      setMarking(mssv);
      await attendanceApi.manualCheckin({
        mssv,
        session_id: Number(selectedSession),
        trang_thai: value,
        nguoi_xac_nhan: user?.ho_ten || user?.username || 'Giảng viên',
      });
      // Cập nhật cục bộ ngay (không tải lại toàn bộ)
      setRoster((prev) => {
        if (!prev) return prev;
        const label = STATUS_ACTIONS.find((a) => a.value === value)?.label || 'Có mặt';
        const students = prev.students.map((s) =>
          s.mssv === mssv ? { ...s, status: label, source: 'manual', recorded_at: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) } : s
        );
        return { ...prev, students };
      });
      showToast?.(`Đã điểm danh ${mssv}: ${STATUS_ACTIONS.find((a) => a.value === value)?.label}`);
    } catch (err) {
      showToast?.(err.message || 'Điểm danh thất bại', 'danger');
    } finally {
      setMarking(null);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!roster) return [];
    const kw = search.trim().toLowerCase();
    if (!kw) return roster.students;
    return roster.students.filter(
      (s) => s.mssv.toLowerCase().includes(kw) || s.ho_ten.toLowerCase().includes(kw)
    );
  }, [roster, search]);

  // Sinh viên cần cảnh báo (từ báo cáo lớp)
  const atRisk = useMemo(
    () => (classReport || []).filter((r) => r.trang_thai === 'Cảnh báo' || r.trang_thai === 'Cấm thi'),
    [classReport]
  );

  const cell = { padding: '8px 10px', borderBottom: '1px solid #eef3f7', fontSize: '0.82rem' };
  const head = { padding: '8px 10px', borderBottom: '2px solid #d0e0eb', fontSize: '0.78rem', color: '#0b6fa4', fontWeight: 700, textAlign: 'left' };

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <h2 style={{ margin: '0 0 6px', fontSize: '1.15rem', color: '#106fa6', fontWeight: 700 }}>Điểm danh thủ công</h2>
        <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: '#64748b' }}>
          Chọn lớp và buổi học, sau đó bấm vào trạng thái của từng sinh viên. (Nguồn ghi nhận: <b>thủ công</b>, khác với điểm danh tự động bằng camera)
        </p>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Lớp tín chỉ</label>
            <select
              value={selectedClass}
              onChange={(e) => { setSelectedClass(e.target.value); setSelectedSession(''); setRoster(null); }}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem' }}
            >
              <option value="">-- Chọn lớp --</option>
              {classes.map((c) => (
                <option key={c.class_id} value={c.class_id}>{c.class_id} · {c.subject_id}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Buổi học</label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              disabled={!selectedClass}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem' }}
            >
              <option value="">-- Chọn buổi --</option>
              {classSessions.map((s) => (
                <option key={s.session_id} value={s.session_id}>
                  {s.session_date || String(s.start_time || '').substring(0, 10)} · {s.room_id || s.room || ''} · Ca {s.shift || '-'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!selectedSession && (
          <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', background: '#f8fbfd', borderRadius: 8, border: '1px dashed #d0e0eb' }}>
            Chọn lớp và buổi học để hiển thị danh sách sinh viên.
          </div>
        )}

        {/* Cảnh báo nghỉ nhiều */}
        {selectedClass && atRisk.length > 0 && (
          <div style={{ marginBottom: 16, border: '1px solid #f2b8b5', background: '#fdf0f0', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 6, fontSize: '0.85rem' }}>
              ⚠ Cảnh báo nghỉ quá nhiều ({atRisk.length} sinh viên) — kiểm tra & xử lý:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {atRisk.map((r) => (
                <span key={r.mssv} style={{
                  padding: '4px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600,
                  background: r.trang_thai === 'Cấm thi' ? '#fca5a5' : '#fde68a',
                  color: r.trang_thai === 'Cấm thi' ? '#7f1d1d' : '#78350f',
                }}>
                  {r.mssv} · {r.ho_ten} — vắng {r.ty_le_vang}% ({r.trang_thai})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Danh sách SV + thống kê vắng */}
        {roster && (
          <>
            {/* Thống kê */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
              {SUMMARY_META.map((m) => (
                <div key={m.key} style={{ background: '#f8fbfd', border: '1px solid #d0e0eb', borderRadius: 8, padding: '8px 14px', minWidth: 90 }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: m.color }}>{roster.summary?.[m.key] ?? 0}</div>
                  <div style={{ fontSize: '0.7rem', color: '#54738c' }}>{m.label}</div>
                </div>
              ))}
            </div>

            {/* Danh sách SV vắng */}
            {roster.absent_list?.length > 0 && (
              <div style={{ marginBottom: 16, border: '1px solid #f2b8b5', background: '#fef2f2', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontWeight: 700, color: '#b91c1c', marginBottom: 6, fontSize: '0.85rem' }}>
                  ❌ Sinh viên vắng ({roster.absent_list.length}):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {roster.absent_list.map((s) => (
                    <span key={s.mssv} style={{ padding: '4px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, background: '#fee2e2', color: '#991b1b' }}>
                      {s.mssv} · {s.ho_ten}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tìm kiếm */}
            <input
              type="text"
              placeholder={`🔍 Tìm MSSV / họ tên trong ${roster.students.length} sinh viên...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', maxWidth: 380, padding: '9px 12px', marginBottom: 12, border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.85rem', boxSizing: 'border-box' }}
            />

            {loading ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>Đang tải danh sách...</div>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid #e2edf5', borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['STT', 'MSSV', 'Họ tên', 'Lớp HC', 'Trạng thái', 'Nguồn', 'Thao tác'].map((h) => (
                        <th key={h} style={head}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s, i) => {
                      const st = STATUS_LABEL[s.status] || STATUS_LABEL['Chưa điểm danh'];
                      return (
                        <tr key={s.mssv} style={{ background: s.status === 'Vắng không phép' ? '#fff7f7' : 'transparent' }}>
                          <td style={cell}>{i + 1}</td>
                          <td style={{ ...cell, fontWeight: 600, color: '#0369a1' }}>{s.mssv}</td>
                          <td style={cell}>{s.ho_ten}</td>
                          <td style={cell}>{s.lop_base}</td>
                          <td style={cell}>
                            <span style={{ padding: '3px 8px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, background: st.bg, color: st.color }}>
                              {s.status}
                              {s.recorded_at ? ` · ${s.recorded_at}` : ''}
                            </span>
                          </td>
                          <td style={cell}>
                            <span style={{
                              padding: '2px 7px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600,
                              background: s.source === 'manual' ? '#e0e7ff' : '#dbeafe',
                              color: s.source === 'manual' ? '#3730a3' : '#1d4ed8',
                            }}>
                              {s.source === 'manual' ? 'Thủ công' : 'Điểm danh tự động'}
                            </span>
                          </td>
                          <td style={cell}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {STATUS_ACTIONS.map((a) => (
                                <button
                                  key={a.value}
                                  type="button"
                                  disabled={marking === s.mssv}
                                  onClick={() => markCheckin(s.mssv, a.value)}
                                  style={{
                                    padding: '4px 9px', borderRadius: 6, border: '1px solid', cursor: marking === s.mssv ? 'wait' : 'pointer',
                                    fontSize: '0.72rem', fontWeight: 600,
                                    color: a.color, borderColor: a.color, background: s.status === a.label ? a.bg : '#fff',
                                    opacity: s.status === a.label ? 1 : 0.85,
                                  }}
                                >
                                  {a.label}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredStudents.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Không tìm thấy sinh viên phù hợp.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Tổng kết điểm danh các buổi */}
        {selectedClass && sessionSummary.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h4 style={{ color: '#106fa6', fontSize: '0.9rem', margin: '0 0 10px 0' }}>📊 Tổng kết điểm danh các buổi</h4>
            <div style={{ overflowX: 'auto', border: '1px solid #e2edf5', borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Ngày', 'Giờ', 'Phòng', 'Sĩ số', 'Có mặt', 'Vắng', 'Đã điểm danh'].map((h) => (
                      <th key={h} style={head}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessionSummary.map((s) => (
                    <tr key={s.session_id}>
                      <td style={cell}>{s.session_date}</td>
                      <td style={cell}>{s.start_time} - {s.end_time}</td>
                      <td style={cell}>{s.room_id}</td>
                      <td style={cell}>{s.total_enrolled}</td>
                      <td style={{ ...cell, color: '#10b981', fontWeight: 600 }}>{s.co_mat}</td>
                      <td style={{ ...cell, color: '#ef4444', fontWeight: 600 }}>{s.vang_kp}</td>
                      <td style={cell}>{s.da_diem_danh}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
