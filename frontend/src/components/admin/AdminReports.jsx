import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch, authFetch } from '../../api/client';

const STATUS_BADGE = (t) =>
  t === 'Cấm thi' ? { bg: '#fee2e2', color: '#dc2626' }
  : t === 'Cảnh báo' ? { bg: '#fef9c3', color: '#a16207' }
  : { bg: '#dcfce7', color: '#16a34a' };

export default function AdminReports({ showToast }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const [cohort, setCohort] = useState('');
  const [adminClass, setAdminClass] = useState('');
  const [dept, setDept] = useState('');
  const [facReport, setFacReport] = useState(null);
  const [facLoading, setFacLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await apiFetch('/api/admin/reports/summary');
        setSummary(res);
      } catch (err) {
        showToast?.(err.message || 'Lỗi tải tổng quan', 'danger');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadFaculty = async (silent = false) => {
    try {
      if (!silent) setFacLoading(true);
      const params = new URLSearchParams();
      if (cohort) params.set('cohort', cohort);
      if (adminClass) params.set('administrative_class', adminClass);
      if (dept) params.set('department', dept);
      const res = await apiFetch(`/api/admin/reports/faculty${params.toString() ? `?${params}` : ''}`);
      setFacReport(res);
    } catch (err) {
      showToast?.(err.message || 'Lỗi tải báo cáo khoa/khóa', 'danger');
    } finally {
      if (!silent) setFacLoading(false);
    }
  };

  const exportExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (cohort) params.set('cohort', cohort);
      if (adminClass) params.set('administrative_class', adminClass);
      if (dept) params.set('department', dept);
      const res = await authFetch(`/api/admin/reports/faculty/export${params.toString() ? `?${params}` : ''}`);
      if (!res.ok) throw new Error('Lỗi khi xuất file.');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bao_cao_khoa_khoa.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast?.('Đã xuất Excel.');
    } catch (err) {
      showToast?.(err.message || 'Lỗi xuất Excel', 'danger');
    }
  };

  const filteredStudents = useMemo(() => {
    if (!facReport?.students) return [];
    const kw = search.trim().toLowerCase();
    if (!kw) return facReport.students;
    return facReport.students.filter((s) =>
      (s.mssv || '').toLowerCase().includes(kw) || (s.ho_ten || '').toLowerCase().includes(kw)
    );
  }, [facReport, search]);

  const head = { padding: '9px 12px', textAlign: 'left', color: '#106fa6', fontWeight: 600, fontSize: '0.78rem', borderBottom: '2px solid #d0e0eb' };
  const cell = { padding: '8px 12px', borderBottom: '1px solid #eef3f7', fontSize: '0.82rem' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ===== 1. TỔNG QUAN HỆ THỐNG ===== */}
      <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #e2edf5', color: '#106fa6', fontWeight: 700, fontSize: '1.02rem' }}>
          📊 Tổng quan hệ thống
        </div>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>Đang tải...</div>
        ) : summary ? (
          <>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '14px 18px', borderBottom: '1px solid #eef3f7' }}>
              {[
                { label: 'Lớp TC', value: summary.tong_lop, color: '#106fa6' },
                { label: 'Tổng SV', value: summary.tong_sv, color: '#1d4ed8' },
                { label: 'Tổng buổi', value: summary.tong_buoi_hoc, color: '#0f766e' },
                { label: 'SV Cấm thi', value: summary.so_sv_cam_thi, color: '#dc2626' },
              ].map((m) => (
                <div key={m.label} style={{ background: '#f8fbfd', border: '1px solid #d0e0eb', borderRadius: 8, padding: '8px 14px', minWidth: 100 }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: m.color }}>{m.value ?? 0}</div>
                  <div style={{ fontSize: '0.7rem', color: '#54738c' }}>{m.label}</div>
                </div>
              ))}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Lớp TC', 'Môn', 'GV', 'Số SV', 'Tổng buổi', 'Có mặt', 'Muộn', 'Vắng', 'Cấm thi'].map((h) => (
                      <th key={h} style={head}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(summary.classes || []).map((c) => (
                    <tr key={c.ma_lop_tc} style={{ borderBottom: '1px solid #eef3f7' }}>
                      <td style={{ ...cell, fontWeight: 600 }}>{c.ma_lop_tc}</td>
                      <td style={cell}>{c.subject_name}</td>
                      <td style={cell}>{c.lecturer_name || '—'}</td>
                      <td style={cell}>{c.so_sv}</td>
                      <td style={cell}>{c.tong_buoi}</td>
                      <td style={{ ...cell, color: '#16a34a' }}>{c.co_mat}</td>
                      <td style={{ ...cell, color: '#ca8a04' }}>{c.di_muon}</td>
                      <td style={{ ...cell, color: '#dc2626' }}>{c.vang_kp}</td>
                      <td style={cell}>{c.so_cam_thi}</td>
                    </tr>
                  ))}
                  {(summary.classes || []).length === 0 && (
                    <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Chưa có dữ liệu</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>

      {/* ===== 2. BÁO CÁO KHOA / KHÓA / LỚP HC ===== */}
      <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #e2edf5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ color: '#106fa6', fontWeight: 700, fontSize: '1.02rem' }}>🏛 Báo cáo theo Khoa / Khóa / Lớp hành chính</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input placeholder="Khóa (VD: 2022-2027)" value={cohort} onChange={(e) => setCohort(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.82rem' }} />
            <input placeholder="Lớp HC" value={adminClass} onChange={(e) => setAdminClass(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.82rem' }} />
            <input placeholder="Khoa" value={dept} onChange={(e) => setDept(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.82rem' }} />
            <button type="button" onClick={() => loadFaculty(false)} style={{ padding: '7px 14px', borderRadius: 6, border: 'none', background: '#106fa6', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }}>
              {facLoading ? 'Đang tải...' : 'Tra cứu'}
            </button>
            <button type="button" onClick={exportExcel} style={{ padding: '7px 14px', borderRadius: 6, border: 'none', background: '#10b981', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }}>
              📥 Xuất Excel
            </button>
          </div>
        </div>

        {facLoading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>Đang tải...</div>
        ) : facReport ? (
          <>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '12px 18px', borderBottom: '1px solid #eef3f7' }}>
              <span style={{ padding: '5px 12px', borderRadius: 999, background: '#f0f7fc', fontSize: '0.78rem', fontWeight: 600, color: '#106fa6' }}>Tổng SV: {facReport.tong_sv}</span>
              <span style={{ padding: '5px 12px', borderRadius: 999, background: '#fee2e2', fontSize: '0.78rem', fontWeight: 600, color: '#dc2626' }}>Cấm thi: {facReport.so_sv_cam_thi}</span>
            </div>

            <div style={{ padding: '10px 18px', borderBottom: '1px solid #eef3f7' }}>
              <input type="text" placeholder="🔍 Tìm MSSV / họ tên..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: '100%', maxWidth: 320, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.82rem', boxSizing: 'border-box' }} />
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['MSSV', 'Họ tên', 'Lớp HC', 'Khóa', 'Số lớp', 'Tổng buổi', 'Vắng', 'Tỷ lệ vắng', 'Cấm thi'].map((h) => (
                      <th key={h} style={head}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Không có sinh viên phù hợp</td></tr>
                  ) : filteredStudents.map((s) => (
                    <tr key={s.mssv} style={{ background: s.cam_thi ? '#fef2f2' : 'transparent' }}>
                      <td style={{ ...cell, fontWeight: 600 }}>{s.mssv}</td>
                      <td style={cell}>{s.ho_ten}</td>
                      <td style={cell}>{s.lop_base}</td>
                      <td style={cell}>{s.cohort}</td>
                      <td style={cell}>{s.so_lop}</td>
                      <td style={cell}>{s.tong_buoi}</td>
                      <td style={cell}>{s.tong_vang}</td>
                      <td style={cell}>{s.ty_le_vang}%</td>
                      <td style={cell}>
                        <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 600, ...(s.cam_thi ? STATUS_BADGE('Cấm thi') : STATUS_BADGE('Hợp lệ')) }}>
                          {s.cam_thi ? 'Cấm thi' : 'Hợp lệ'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Nhập bộ lọc rồi bấm "Tra cứu".</div>
        )}
      </div>
    </div>
  );
}
