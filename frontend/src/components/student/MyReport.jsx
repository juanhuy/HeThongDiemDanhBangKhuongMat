import React, { useState, useEffect } from 'react';
import { apiFetch, authFetch } from '../../api/client';

const StatCard = ({ title, value, color }) => (
  <div style={{ background: '#f8fbfd', border: '1px solid #d0e0eb', borderRadius: 8, padding: '10px 16px' }}>
    <div style={{ fontSize: '1.2rem', fontWeight: 700, color }}>{value}</div>
    <div style={{ fontSize: '0.75rem', color: '#54738c' }}>{title}</div>
  </div>
);

export default function MyReport({ user, showToast }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await apiFetch('/api/reports/student');
        setReport(data);
      } catch (err) {
        showToast?.(err.message || 'Lỗi tải báo cáo của bạn.', 'danger');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const exportExcel = async () => {
    try {
      setExporting(true);
      const res = await authFetch('/api/reports/student/export');
      if (!res.ok) throw new Error('Lỗi khi xuất file.');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bao_cao_ca_nhan.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showToast?.(err.message || 'Lỗi kết nối khi xuất file.', 'danger');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Đang tải báo cáo...</div>;
  }

  if (!report) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Không có dữ liệu báo cáo.</div>;
  }

  const classes = report.classes || [];
  const filtered = classes.filter((c) => {
    const kw = search.toLowerCase();
    if (!kw) return true;
    return (c.ma_lop_tc + ' ' + (c.subject_name || '')).toLowerCase().includes(kw);
  });

  const cell = { padding: '8px 10px', borderBottom: '1px solid #eef3f7', fontSize: '0.82rem' };
  const head = { padding: '8px 10px', borderBottom: '2px solid #d0e0eb', fontSize: '0.78rem', color: '#0b6fa4', fontWeight: 700, textAlign: 'left' };

  return (
    <div style={{ maxWidth: 960 }}>
      <h4 style={{ color: '#106fa6', fontSize: '0.95rem', margin: '0 0 12px 0' }}>
        Báo cáo tổng kết của tôi — {report.student?.ho_ten} ({report.student?.mssv})
      </h4>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
        <div
          style={{
            background: report.cam_thi ? '#fdf0f0' : '#e6f8f0',
            border: `1px solid ${report.cam_thi ? '#fca5a5' : '#86efac'}`,
            borderRadius: 8, padding: '10px 16px',
          }}
        >
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: report.cam_thi ? '#ef4444' : '#10b981' }}>
            {report.cam_thi ? '⚠ Cảnh báo Cấm thi' : '✓ Đủ điều kiện dự thi'}
          </div>
        </div>
        <StatCard title="Lớp đang học" value={report.totals?.so_lop || 0} color="#106fa6" />
        <StatCard title="Tổng buổi học" value={report.totals?.tong_buoi || 0} color="#106fa6" />
        <button
          onClick={exportExcel}
          disabled={exporting}
          style={{
            marginLeft: 'auto', padding: '8px 16px', borderRadius: 6, border: 'none',
            background: '#10b981', color: '#fff', fontWeight: 600, fontSize: '0.82rem', cursor: exporting ? 'wait' : 'pointer',
          }}
        >
          {exporting ? 'Đang xuất...' : 'Xuất Excel'}
        </button>
      </div>

      <input
        type="text"
        placeholder="🔍 Tìm môn học / lớp..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%', maxWidth: 320, padding: '8px 12px', marginBottom: 12,
          border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.82rem', boxSizing: 'border-box',
        }}
      />

      {filtered.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', background: '#f8fbfd', borderRadius: 8, border: '1px solid #eef2f6' }}>
          Bạn chưa đăng ký lớp học nào.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e2edf5', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Lớp TC', 'Môn học', 'Giảng viên', 'Tổng buổi', 'Có mặt', 'Muộn', 'Vắng KP', 'Điểm CC', 'Tỷ lệ vắng', 'Trạng thái'].map((h) => (
                  <th key={h} style={head}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const banned = c.trang_thai === 'Cấm thi';
                return (
                  <tr key={i} style={{ background: banned ? '#fff2f2' : 'transparent' }}>
                    <td style={cell}>{c.ma_lop_tc}</td>
                    <td style={cell}>{c.subject_name}</td>
                    <td style={cell}>{c.lecturer_name || '—'}</td>
                    <td style={cell}>{c.tong_buoi}</td>
                    <td style={cell}>{c.co_mat}</td>
                    <td style={cell}>{c.di_muon}</td>
                    <td style={cell}>{c.vang_kp}</td>
                    <td style={{ ...cell, fontWeight: 700 }}>{c.score}</td>
                    <td style={cell}>{c.ty_le_vang}%</td>
                    <td style={{ ...cell, fontWeight: 600, color: banned ? '#ef4444' : '#10b981' }}>
                      {banned ? 'Cấm thi' : 'Hợp lệ'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
