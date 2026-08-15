import React, { useState, useEffect, useMemo } from 'react';
import { creditClassesApi, attendanceApi } from '../../api';
import { apiFetch, authFetch } from '../../api/client';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const STATUS_STYLE = {
  'Đúng giờ': { bg: '#dcfce7', color: '#16a34a' },
  'Có mặt': { bg: '#dcfce7', color: '#16a34a' },
  'Đi muộn': { bg: '#fef9c3', color: '#ca8a04' },
  'Có phép': { bg: '#e0f2fe', color: '#0284c7' },
  'Vắng': { bg: '#fee2e2', color: '#dc2626' },
  'Vắng không phép': { bg: '#fee2e2', color: '#dc2626' },
  '—': { bg: '#f1f5f9', color: '#94a3b8' },
};

const STATUS_ACTIONS = [
  { value: 'Present', label: 'Có mặt', color: '#10b981', bg: '#e6f8f0' },
  { value: 'Late', label: 'Đi muộn', color: '#d48806', bg: '#fff7e6' },
  { value: 'Excused', label: 'Có phép', color: '#0369a1', bg: '#e6f0fb' },
  { value: 'Absent', label: 'Vắng KP', color: '#ef4444', bg: '#fdeaea' },
];

const ROSTER_FILTERS = ['Tất cả', 'Có mặt', 'Đi muộn', 'Có phép', 'Vắng không phép', 'Chưa điểm danh'];

export default function SummaryReport({ user, showToast }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [report, setReport] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(false);
  const [liveRefresh, setLiveRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [search, setSearch] = useState('');

  // Trạng thái cho danh sách điểm danh theo buổi (bấm vào buổi để mở)
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionRoster, setSessionRoster] = useState(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterFilter, setRosterFilter] = useState('Tất cả');
  const [rosterSort, setRosterSort] = useState('mssv');
  const [marking, setMarking] = useState(null);

  // Dashboard môn học giảng dạy trong học kỳ
  const [dashboard, setDashboard] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashSemester, setDashSemester] = useState('');  // lọc theo học kỳ
  const [dateFrom, setDateFrom] = useState('');          // lọc khoảng ngày (báo cáo lớp)
  const [dateTo, setDateTo] = useState('');
  const [detailTab, setDetailTab] = useState('summary'); // tab chi tiết lớp: summary | sessions | matrix
  const [todaySessions, setTodaySessions] = useState([]); // buổi học hôm nay của GV

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

  // Tải dashboard môn học giảng dạy trong học kỳ
  const loadDashboard = async (silent = false) => {
    try {
      if (!silent) setDashLoading(true);
      const q = dashSemester ? `?semester=${dashSemester}` : '';
      const res = await apiFetch(`/api/reports/lecturer/dashboard${q}`);
      setDashboard(res);
    } catch (err) {
      if (!silent) showToast?.(err.message || 'Lỗi tải dashboard', 'danger');
    } finally {
      if (!silent) setDashLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashSemester]);

  // Tải buổi học hôm nay của giảng viên
  useEffect(() => {
    (async () => {
      try {
        const res = await attendanceApi.getLecturerToday();
        setTodaySessions(res.sessions || []);
      } catch {
        setTodaySessions([]);
      }
    })();
  }, []);

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

  useEffect(() => {
    if (!selectedClass || !liveRefresh) return;
    const timer = setInterval(() => loadReport(selectedClass, true), 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass, liveRefresh]);

  // Nhảy thẳng từ banner "Buổi hôm nay" tới danh sách điểm danh buổi đó
  const jumpToSession = async (classId, sessionId) => {
    setDetailTab('sessions');
    setSelectedClass(classId);
    setSelectedSession(sessionId);
    setRosterSearch('');
    setRosterFilter('Tất cả');
    loadReport(classId, true);
    try {
      setRosterLoading(true);
      const res = await attendanceApi.getClassRoster(classId, sessionId);
      setSessionRoster(res);
    } catch (err) {
      showToast?.(err.message || 'Lỗi tải danh sách buổi học', 'danger');
      setSessionRoster(null);
    } finally {
      setRosterLoading(false);
    }
  };

  // Mở chi tiết 1 buổi: tải danh sách điểm danh cả lớp
  const openSession = async (sessionId) => {
    setSelectedSession(sessionId);
    setRosterSearch('');
    setRosterFilter('Tất cả');
    try {
      setRosterLoading(true);
      const res = await attendanceApi.getClassRoster(selectedClass, sessionId);
      setSessionRoster(res);
    } catch (err) {
      showToast?.(err.message || 'Lỗi tải danh sách buổi học', 'danger');
      setSessionRoster(null);
    } finally {
      setRosterLoading(false);
    }
  };

  // Chỉnh sửa điểm danh thủ công 1 SV trong buổi
  const markSessionCheckin = async (mssv, value) => {
    try {
      setMarking(mssv);
      await attendanceApi.manualCheckin({
        mssv,
        session_id: Number(selectedSession),
        trang_thai: value,
        nguoi_xac_nhan: user?.ho_ten || user?.username || 'Giảng viên',
      });
      setSessionRoster((prev) => {
        if (!prev) return prev;
        const label = STATUS_ACTIONS.find((a) => a.value === value)?.label || 'Có mặt';
        const students = prev.students.map((s) =>
          s.mssv === mssv ? { ...s, status: label, source: 'manual', recorded_at: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) } : s
        );
        return { ...prev, students };
      });
      // Cập nhật lại báo cáo tổng để số liệu thay đổi theo
      loadReport(selectedClass, true);
      showToast?.(`Đã cập nhật ${mssv}: ${STATUS_ACTIONS.find((a) => a.value === value)?.label}`);
    } catch (err) {
      showToast?.(err.message || 'Cập nhật thất bại', 'danger');
    } finally {
      setMarking(null);
    }
  };

  // Danh sách SV trong buổi: lọc + tìm kiếm + sắp xếp
  const rosterStudents = useMemo(() => {
    if (!sessionRoster) return [];
    let list = sessionRoster.students || [];
    const kw = rosterSearch.trim().toLowerCase();
    if (kw) list = list.filter((s) => s.mssv.toLowerCase().includes(kw) || s.ho_ten.toLowerCase().includes(kw));
    if (rosterFilter !== 'Tất cả') list = list.filter((s) => s.status === rosterFilter);
    const sorted = [...list];
    if (rosterSort === 'name') sorted.sort((a, b) => a.ho_ten.localeCompare(b.ho_ten, 'vi'));
    else if (rosterSort === 'status') sorted.sort((a, b) => (a.status || '').localeCompare(b.status || '', 'vi'));
    else sorted.sort((a, b) => a.mssv.localeCompare(b.mssv));
    return sorted;
  }, [sessionRoster, rosterSearch, rosterFilter, rosterSort]);

  // Tìm kiếm SV theo MSSV / tên
  const filteredReport = useMemo(() => {
    const kw = search.trim().toLowerCase();
    if (!kw) return report;
    return report.filter((r) => r.mssv.toLowerCase().includes(kw) || r.ho_ten.toLowerCase().includes(kw));
  }, [report, search]);

  // Lọc buổi học theo khoảng ngày (client-side)
  const filteredSessions = useMemo(() => {
    if (!dateFrom && !dateTo) return sessions;
    return sessions.filter((s) => {
      const d = s.session_date;
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
  }, [sessions, dateFrom, dateTo]);

  // Thống kê từng buổi: có mặt / vắng / chưa điểm danh
  const sessionStats = useMemo(() => {
    const validIds = new Set(filteredSessions.map((s) => s.session_id));
    const stats = filteredSessions.map((s) => {
      let co_mat = 0, vang = 0, chua = 0;
      matrix.forEach((m) => {
        const cell = m.cells?.[s.session_id] || '—';
        if (cell === '—') chua += 1;
        else if (cell === 'Vắng' || cell === 'Vắng không phép') vang += 1;
        else co_mat += 1;
      });
      return { ...s, co_mat, vang, chua };
    });
    return { stats, validIds };
  }, [filteredSessions, matrix]);

  // Dữ liệu biểu đồ: vắng theo buổi
  const absentChartData = useMemo(
    () => sessionStats.stats.map((s) => ({
      name: s.session_date?.substring(5) || `Buổi ${s.session_id}`,
      'Có mặt': s.co_mat,
      'Vắng': s.vang,
      'Chưa điểm danh': s.chua,
    })),
    [sessionStats]
  );

  // Số SV bị cảnh báo / cấm thi
  const summaryTotals = useMemo(() => {
    const cam_thi = report.filter((r) => r.trang_thai === 'Cấm thi').length;
    const canh_bao = report.filter((r) => r.trang_thai === 'Cảnh báo').length;
    const tong_ai = report.reduce((s, r) => s + (r.ai_count || 0), 0);
    const tong_manual = report.reduce((s, r) => s + (r.manual_count || 0), 0);
    return { cam_thi, canh_bao, tong_ai, tong_manual };
  }, [report]);

  const statusBadge = (status) => {
    const st = STATUS_STYLE[status] || { bg: '#f1f5f9', color: '#64748b' };
    return (
      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 600, background: st.bg, color: st.color, whiteSpace: 'nowrap' }}>
        {status || '—'}
      </span>
    );
  };

  const reportStatusColor = (t) => {
    if (t === 'Cấm thi') return { bg: '#fee2e2', color: '#dc2626' };
    if (t === 'Cảnh báo') return { bg: '#fef9c3', color: '#ca8a04' };
    return { bg: '#dcfce7', color: '#16a34a' };
  };

  // Tải file Excel thật (.xlsx) từ backend
  const downloadXlsx = async (url, filename) => {
    try {
      const res = await authFetch(url);
      if (!res.ok) throw new Error('Lỗi khi xuất file.');
      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(objectUrl);
      showToast?.('Đã xuất file Excel.');
    } catch (err) {
      showToast?.(err.message || 'Lỗi xuất Excel', 'danger');
    }
  };

  const exportExcel = () => {
    downloadXlsx(`/api/credit-classes/${encodeURIComponent(selectedClass)}/attendance/report/export`, `diem_danh_${selectedClass}.xlsx`);
  };

  const exportDashboard = () => {
    const q = dashSemester ? `?semester=${dashSemester}` : '';
    downloadXlsx(`/api/reports/lecturer/dashboard/export${q}`, 'dashboard_mon_hoc.xlsx');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ===== Buổi học hôm nay (trực quan) ===== */}
      {todaySessions.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #e2edf5', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#106fa6', fontWeight: 700, fontSize: '1.02rem' }}>📍 Buổi học hôm nay</span>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{new Date().toLocaleDateString('vi-VN')}</span>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '14px 18px' }}>
            {todaySessions.map((s) => {
              const meta = {
                dang_dien_ra: { label: '● Đang diễn ra', color: '#059669', bg: '#ecfdf5', border: '#10b981' },
                sap_dien_ra: { label: '○ Sắp diễn ra', color: '#0369a1', bg: '#eff6ff', border: '#60a5fa' },
                da_ket_thuc: { label: '✓ Đã kết thúc', color: '#64748b', bg: '#f8fafc', border: '#cbd5e1' },
              }[s.status] || { label: s.status, color: '#64748b', bg: '#f8fafc', border: '#cbd5e1' };
              return (
                <div key={s.session_id} style={{ background: meta.bg, border: `1px solid ${meta.border}`, borderRadius: 10, padding: '12px 14px', minWidth: 240, flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{s.subject_name}</div>
                  <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 4 }}>
                    {s.class_id} · Phòng {s.room_id} · {s.start_time}–{s.end_time}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 8 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: meta.color }}>{meta.label}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Đi học: <b style={{ color: '#16a34a' }}>{s.co_mat}</b> / {s.total}
                      {s.vang > 0 && <span style={{ color: '#dc2626', fontWeight: 600 }}> · Vắng {s.vang}</span>}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpToSession(s.class_id, s.session_id)}
                    style={{ marginTop: 8, width: '100%', padding: '7px 10px', borderRadius: 6, border: 'none', background: '#106fa6', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    📋 Xem điểm danh buổi này
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== Dashboard môn học giảng dạy trong học kỳ ===== */}
      <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #e2edf5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ color: '#106fa6', fontWeight: 700, fontSize: '1.02rem' }}>📊 Dashboard môn học giảng dạy trong học kỳ</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={dashSemester} onChange={(e) => setDashSemester(e.target.value)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.8rem', color: '#334155' }}>
              <option value="">Tất cả học kỳ</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => <option key={k} value={k}>Học kỳ {k}</option>)}
            </select>
            <button type="button" onClick={exportDashboard} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #10b981', background: '#fff', color: '#059669', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>📥 Xuất Excel</button>
            <button type="button" onClick={() => loadDashboard(true)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #b9d5e8', background: '#fff', color: '#0369a1', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>🔄 Làm mới</button>
          </div>
        </div>
        {dashLoading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>Đang tải dashboard...</div>
        ) : dashboard ? (
          <>
            {/* KPI */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '14px 18px', borderBottom: '1px solid #eef3f7' }}>
              {[
                { label: 'Môn học', value: dashboard.totals?.so_mon, color: '#106fa6' },
                { label: 'Lớp TC', value: dashboard.totals?.so_lop, color: '#0f766e' },
                { label: 'Sinh viên', value: dashboard.totals?.tong_sv, color: '#1d4ed8' },
                { label: 'Tổng buổi', value: dashboard.totals?.tong_buoi, color: '#7c3aed' },
                { label: 'Có mặt', value: dashboard.totals?.co_mat, color: '#16a34a' },
                { label: 'Đi muộn', value: dashboard.totals?.di_muon, color: '#ca8a04' },
                { label: 'Vắng KP', value: dashboard.totals?.vang_kp, color: '#dc2626' },
                { label: 'Cảnh báo', value: dashboard.totals?.so_canh_bao, color: '#ca8a04' },
                { label: 'Cấm thi', value: dashboard.totals?.so_cam_thi, color: '#dc2626' },
              ].map((m) => (
                <div key={m.label} style={{ background: '#f8fbfd', border: '1px solid #d0e0eb', borderRadius: 8, padding: '8px 14px', minWidth: 86 }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: m.color }}>{m.value ?? 0}</div>
                  <div style={{ fontSize: '0.7rem', color: '#54738c' }}>{m.label}</div>
                </div>
              ))}
            </div>

            {/* Biểu đồ tròn: tỷ lệ trạng thái toàn khối */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #eef3f7' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 10 }}>Tỷ lệ sinh viên theo trạng thái (toàn khối)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                <div style={{ width: 240, height: 200 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Hợp lệ', value: Math.max(0, (dashboard.totals?.tong_sv || 0) - (dashboard.totals?.so_canh_bao || 0) - (dashboard.totals?.so_cam_thi || 0)), color: '#16a34a' },
                          { name: 'Cảnh báo', value: dashboard.totals?.so_canh_bao || 0, color: '#facc15' },
                          { name: 'Cấm thi', value: dashboard.totals?.so_cam_thi || 0, color: '#dc2626' },
                        ].filter((x) => x.value > 0)}
                        dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                        label={(e) => `${e.name}: ${e.value}`}
                      >
                        {[{ name: 'Hợp lệ', color: '#16a34a' }, { name: 'Cảnh báo', color: '#facc15' }, { name: 'Cấm thi', color: '#dc2626' }].map((c, i) => <Cell key={i} fill={c.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#54738c', lineHeight: 1.8 }}>
                  <div>🟢 Hợp lệ: {Math.max(0, (dashboard.totals?.tong_sv || 0) - (dashboard.totals?.so_canh_bao || 0) - (dashboard.totals?.so_cam_thi || 0))} SV</div>
                  <div>🟡 Cảnh báo: {dashboard.totals?.so_canh_bao || 0} SV</div>
                  <div>🔴 Cấm thi: {dashboard.totals?.so_cam_thi || 0} SV</div>
                </div>
              </div>
            </div>

            {/* Bảng theo môn học */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: '#f0f7fc' }}>
                    {['Môn học', 'Mã môn', 'Số lớp', 'Số SV', 'Số buổi', 'Có mặt', 'Muộn', 'Vắng KP', 'Có phép', 'Cảnh báo', 'Cấm thi'].map((h) => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', color: '#106fa6', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dashboard.subjects?.length === 0 ? (
                    <tr><td colSpan={11} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Chưa có môn học nào được phân công giảng dạy.</td></tr>
                  ) : dashboard.subjects.map((s) => (
                    <tr key={s.subject_id} style={{ borderBottom: '1px solid #e2edf5' }}>
                      <td style={{ padding: '9px 12px', fontWeight: 600 }}>{s.subject_name}</td>
                      <td style={{ padding: '9px 12px', color: '#0369a1' }}>{s.subject_id}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'center' }}>{s.so_lop}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'center' }}>{s.tong_sv}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'center' }}>{s.tong_buoi}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>{s.co_mat}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'center', color: '#ca8a04' }}>{s.di_muon}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>{s.vang_kp}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'center', color: '#0284c7' }}>{s.co_phep}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 600, background: s.so_canh_bao ? '#fef9c3' : '#f1f5f9', color: s.so_canh_bao ? '#a16207' : '#94a3b8' }}>{s.so_canh_bao}</span>
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 600, background: s.so_cam_thi ? '#fee2e2' : '#f1f5f9', color: s.so_cam_thi ? '#dc2626' : '#94a3b8' }}>{s.so_cam_thi}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* SV cấm thi / cảnh báo */}
            {(dashboard.at_risk || []).length > 0 && (
              <div style={{ padding: '12px 18px', borderTop: '1px solid #eef3f7' }}>
                <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 8, fontSize: '0.85rem' }}>
                  ⚠ Danh sách sinh viên cảnh báo / cấm thi ({dashboard.at_risk.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {dashboard.at_risk.slice(0, 30).map((a) => (
                    <span key={`${a.ma_lop_tc}-${a.mssv}`} style={{
                      padding: '4px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600,
                      background: a.trang_thai === 'Cấm thi' ? '#fee2e2' : '#fef9c3',
                      color: a.trang_thai === 'Cấm thi' ? '#991b1b' : '#854d0e',
                    }}>
                      {a.mssv} · {a.ho_ten} ({a.subject_name}) — {a.ty_le_vang}% ({a.trang_thai})
                    </span>
                  ))}
                  {dashboard.at_risk.length > 30 && (
                    <span style={{ fontSize: '0.78rem', color: '#64748b', alignSelf: 'center' }}>+{dashboard.at_risk.length - 30} SV khác</span>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Không có dữ liệu.</div>
        )}
      </div>

      {/* Thanh chọn lớp */}
      <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#106fa6', fontWeight: 700, flex: 1 }}>Tổng kết điểm danh & Cảnh báo</h2>
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
          Cập nhật trực tiếp
        </label>
        {selectedClass && (
          <button type="button" onClick={exportExcel} style={{
            padding: '7px 14px', border: 'none', borderRadius: 6, background: '#10b981', color: '#fff', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
          }}>
            📥 Xuất Excel
          </button>
        )}
        {selectedClass && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.8rem' }} title="Từ ngày" />
            <span style={{ color: '#64748b' }}>→</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.8rem' }} title="Đến ngày" />
            {(dateFrom || dateTo) && (
              <button type="button" onClick={() => { setDateFrom(''); setDateTo(''); }} style={{ padding: '5px 10px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', color: '#64748b', fontSize: '0.78rem', cursor: 'pointer' }}>✕ Xóa lọc</button>
            )}
          </div>
        )}
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
          {/* Tab chi tiết lớp */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { key: 'summary', label: '👥 Tổng hợp sinh viên' },
              { key: 'sessions', label: '🗓 Theo buổi học' },
              { key: 'matrix', label: '🧮 Ma trận điểm danh' },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setDetailTab(t.key)}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: detailTab === t.key ? '1px solid #106fa6' : '1px solid #cbd5e1',
                  background: detailTab === t.key ? '#106fa6' : '#fff', color: detailTab === t.key ? '#fff' : '#475569',
                  cursor: 'pointer', fontWeight: 600, fontSize: '0.84rem',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {detailTab === 'summary' && (<>
          {/* Thẻ thống kê nhanh */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'Tổng SV', value: report.length, color: '#106fa6' },
              { label: 'Cảnh báo nghỉ', value: summaryTotals.canh_bao, color: '#ca8a04' },
              { label: 'Cấm thi', value: summaryTotals.cam_thi, color: '#dc2626' },
              { label: 'Lượt điểm danh tự động', value: summaryTotals.tong_ai, color: '#1d4ed8' },
              { label: 'Lượt điểm danh thủ công', value: summaryTotals.tong_manual, color: '#3730a3' },
              { label: 'Tổng buổi', value: sessions.length, color: '#0f766e' },
            ].map((m) => (
              <div key={m.label} style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, padding: '12px 18px', minWidth: 120 }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: m.color }}>{m.value}</div>
                <div style={{ fontSize: '0.75rem', color: '#54738c' }}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* Báo cáo tổng hợp */}
          <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2edf5', fontWeight: 600, color: '#106fa6', fontSize: '0.9rem' }}>
              Báo cáo tổng hợp ({report.length} SV)
            </div>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2edf5' }}>
              <input
                type="text"
                placeholder="🔍 Tìm MSSV / họ tên..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', maxWidth: 340, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f0f7fc' }}>
                    {['MSSV', 'Họ tên', 'Lớp BC', 'Đi muộn', 'Vắng KP', 'Có phép', 'Tự động', 'Thủ công', 'Điểm CC', 'Tỷ lệ vắng', 'Trạng thái'].map((h) => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#106fa6', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredReport.length === 0 ? (
                    <tr><td colSpan={11} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Không tìm thấy sinh viên</td></tr>
                  ) : filteredReport.map((r) => {
                    const st = reportStatusColor(r.trang_thai);
                    return (
                      <tr key={r.mssv} style={{ borderBottom: '1px solid #e2edf5', background: r.trang_thai === 'Cấm thi' ? '#fef2f2' : r.trang_thai === 'Cảnh báo' ? '#fffbeb' : '' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{r.mssv}</td>
                        <td style={{ padding: '10px 12px' }}>{r.ho_ten}</td>
                        <td style={{ padding: '10px 12px' }}>{r.lop_base}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>{r.di_muon}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>{r.vang_kp}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>{r.co_phep}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>{r.ai_count}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>{r.manual_count}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>{r.score}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>{r.ty_le_vang}%</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 600, background: st.bg, color: st.color }}>{r.trang_thai}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          </>)}

          {detailTab === 'sessions' && (<>
          {/* Tổng kết từng buổi */}
          <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2edf5', fontWeight: 600, color: '#106fa6', fontSize: '0.9rem' }}>
              Tổng kết từng buổi ({filteredSessions.length} buổi)
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: '#f0f7fc' }}>
                    {['Buổi', 'Ngày', 'Giờ', 'Phòng', 'Có mặt', 'Vắng', 'Chưa điểm danh', 'Sĩ số', ''].map((h) => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', color: '#106fa6', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessionStats.stats.length === 0 ? (
                    <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Chưa có buổi học nào</td></tr>
                  ) : sessionStats.stats.map((s, i) => (
                    <tr
                      key={s.session_id}
                      onClick={() => openSession(s.session_id)}
                      style={{
                        borderBottom: '1px solid #e2edf5',
                        cursor: 'pointer',
                        background: selectedSession === s.session_id ? '#e8f4fc' : 'transparent',
                      }}
                      title="Bấm để xem danh sách điểm danh buổi này"
                    >
                      <td style={{ padding: '9px 12px', fontWeight: 600 }}>Buổi {i + 1}</td>
                      <td style={{ padding: '9px 12px' }}>{s.session_date}</td>
                      <td style={{ padding: '9px 12px' }}>{s.start_time} - {s.end_time}</td>
                      <td style={{ padding: '9px 12px' }}>{s.room_id || '—'}</td>
                      <td style={{ padding: '9px 12px', color: '#16a34a', fontWeight: 600 }}>{s.co_mat}</td>
                      <td style={{ padding: '9px 12px', color: '#dc2626', fontWeight: 600 }}>{s.vang}</td>
                      <td style={{ padding: '9px 12px', color: '#94a3b8' }}>{s.chua}</td>
                      <td style={{ padding: '9px 12px' }}>{s.co_mat + s.vang + s.chua}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                        <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: '#106fa6', color: '#fff' }}>
                          {selectedSession === s.session_id ? 'Đang xem' : 'Xem ▶'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Biểu đồ vắng theo buổi */}
          {absentChartData.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, overflow: 'hidden', padding: '14px 18px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 10 }}>📈 Diễn biến điểm danh theo buổi</div>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={absentChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis allowDecimals={false} fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Có mặt" stackId="a" fill="#16a34a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Vắng" stackId="a" fill="#dc2626" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Chưa điểm danh" stackId="a" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Danh sách điểm danh buổi được chọn */}
          {selectedSession && (
            <div style={{ background: '#fff', border: '2px solid #106fa6', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2edf5', fontWeight: 700, color: '#106fa6', fontSize: '0.92rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span>📋 Danh sách điểm danh buổi {sessionRoster?.session ? `— ${sessionRoster.session.session_date} (${sessionRoster.session.start_time} - ${sessionRoster.session.end_time})` : ''}</span>
                <button type="button" onClick={() => { setSelectedSession(null); setSessionRoster(null); }} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #106fa6', background: '#fff', color: '#106fa6', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>✕ Đóng</button>
              </div>

              {rosterLoading ? (
                <div style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>Đang tải danh sách...</div>
              ) : sessionRoster ? (
                <>
                  {/* Tóm tắt buổi */}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '12px 16px', borderBottom: '1px solid #eef3f7' }}>
                    {[
                      { label: 'Tổng SV', value: sessionRoster.summary?.tong_sv, color: '#106fa6' },
                      { label: 'Có mặt', value: sessionRoster.summary?.co_mat, color: '#16a34a' },
                      { label: 'Đi muộn', value: sessionRoster.summary?.di_muon, color: '#ca8a04' },
                      { label: 'Có phép', value: sessionRoster.summary?.co_phep, color: '#0284c7' },
                      { label: 'Vắng', value: sessionRoster.summary?.vang_kp, color: '#dc2626' },
                      { label: 'Chưa điểm danh', value: sessionRoster.summary?.chua_diem_danh, color: '#94a3b8' },
                    ].map((m) => (
                      <div key={m.label} style={{ background: '#f8fbfd', border: '1px solid #d0e0eb', borderRadius: 8, padding: '6px 12px', minWidth: 70 }}>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: m.color }}>{m.value ?? 0}</div>
                        <div style={{ fontSize: '0.7rem', color: '#54738c' }}>{m.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* SV vắng */}
                  {sessionRoster.absent_list?.length > 0 && (
                    <div style={{ padding: '8px 16px', borderBottom: '1px solid #f2b8b5', background: '#fef2f2' }}>
                      <b style={{ color: '#b91c1c', fontSize: '0.8rem' }}>❌ Vắng ({sessionRoster.absent_list.length}):</b>{' '}
                      {sessionRoster.absent_list.map((a) => (
                        <span key={a.mssv} style={{ display: 'inline-block', margin: '2px 4px', padding: '2px 8px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600, background: '#fee2e2', color: '#991b1b' }}>
                          {a.mssv} · {a.ho_ten}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Tìm kiếm + lọc + sắp xếp */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '10px 16px', borderBottom: '1px solid #eef3f7', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="🔍 Tìm MSSV / họ tên..."
                      value={rosterSearch}
                      onChange={(e) => setRosterSearch(e.target.value)}
                      style={{ flex: 1, minWidth: 180, padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.82rem' }}
                    />
                    <select value={rosterFilter} onChange={(e) => setRosterFilter(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.82rem' }}>
                      {ROSTER_FILTERS.map((f) => <option key={f} value={f}>Lọc: {f}</option>)}
                    </select>
                    <select value={rosterSort} onChange={(e) => setRosterSort(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.82rem' }}>
                      <option value="mssv">Sắp xếp: MSSV</option>
                      <option value="name">Sắp xếp: Họ tên</option>
                      <option value="status">Sắp xếp: Trạng thái</option>
                    </select>
                  </div>

                  {/* Bảng SV */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ background: '#f0f7fc' }}>
                          {['STT', 'MSSV', 'Họ tên', 'Lớp HC', 'Trạng thái', 'Nguồn', 'Chỉnh sửa thủ công'].map((h) => (
                            <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#106fa6', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rosterStudents.length === 0 ? (
                          <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Không có sinh viên phù hợp.</td></tr>
                        ) : rosterStudents.map((s, i) => {
                          const st = STATUS_STYLE[s.status] || STATUS_STYLE['—'];
                          return (
                            <tr key={s.mssv} style={{ borderBottom: '1px solid #e2edf5', background: s.status === 'Vắng không phép' ? '#fff7f7' : 'transparent' }}>
                              <td style={{ padding: '8px 10px' }}>{i + 1}</td>
                              <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0369a1' }}>{s.mssv}</td>
                              <td style={{ padding: '8px 10px' }}>{s.ho_ten}</td>
                              <td style={{ padding: '8px 10px' }}>{s.lop_base}</td>
                              <td style={{ padding: '8px 10px' }}>
                                <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 600, background: st.bg, color: st.color }}>
                                  {s.status}{s.recorded_at ? ` · ${s.recorded_at}` : ''}
                                </span>
                              </td>
                              <td style={{ padding: '8px 10px' }}>
                                <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600, background: s.source === 'manual' ? '#e0e7ff' : '#dbeafe', color: s.source === 'manual' ? '#3730a3' : '#1d4ed8' }}>
                                  {s.source === 'manual' ? 'Thủ công' : s.source === 'AI' ? 'Điểm danh tự động' : '—'}
                                </span>
                              </td>
                              <td style={{ padding: '8px 10px' }}>
                                <div style={{ display: 'flex', gap: 5 }}>
                                  {STATUS_ACTIONS.map((a) => (
                                    <button
                                      key={a.value}
                                      type="button"
                                      disabled={marking === s.mssv}
                                      onClick={() => markSessionCheckin(s.mssv, a.value)}
                                      style={{
                                        padding: '3px 8px', borderRadius: 6, border: '1px solid', cursor: marking === s.mssv ? 'wait' : 'pointer',
                                        fontSize: '0.7rem', fontWeight: 600, color: a.color, borderColor: a.color,
                                        background: s.status === a.label ? a.bg : '#fff',
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
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>
          )}
          </>)}

          {detailTab === 'matrix' && (<>
          {/* Ma trận điểm danh theo buổi */}
          <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2edf5', fontWeight: 600, color: '#106fa6', fontSize: '0.9rem' }}>
              Ma trận điểm danh theo buổi ({filteredSessions.length} buổi)
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: '#f0f7fc' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: '#106fa6', fontWeight: 600, position: 'sticky', left: 0, background: '#f0f7fc' }}>MSSV / Họ tên</th>
                    {filteredSessions.map((s) => (
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
                    <tr><td colSpan={filteredSessions.length + 2} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Chưa có buổi học nào</td></tr>
                  ) : matrix.map((m) => {
                    const row = report.find((r) => r.mssv === m.mssv);
                    return (
                      <tr key={m.mssv} style={{ borderBottom: '1px solid #e2edf5' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600, whiteSpace: 'nowrap', position: 'sticky', left: 0, background: '#fff' }}>
                          {m.mssv} · {m.ho_ten}
                        </td>
                        {filteredSessions.map((s) => (
                          <td key={s.session_id} style={{ padding: '6px 4px', textAlign: 'center' }}>
                            {statusBadge(m.cells?.[s.session_id])}
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
          </>)}
        </>
      )}
    </div>
  );
}
