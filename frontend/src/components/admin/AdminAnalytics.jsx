import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { CalendarDays, AlertTriangle } from 'lucide-react';
import { apiFetch, API_BASE } from '../../api/client';

const BAR_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#6366f1'];

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px 18px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  cardTitle: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 4px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  cardSub: {
    color: '#64748b',
    fontSize: '0.8rem',
    margin: 0,
  },
  chartWrap: {
    width: '100%',
    height: 260,
    marginTop: 12,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.85rem',
    marginTop: 8,
  },
  th: {
    textAlign: 'left',
    padding: '9px 10px',
    color: '#106fa6',
    fontWeight: 600,
    borderBottom: '2px solid #b9d5e8',
    background: '#f0f7fc',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '8px 10px',
    borderBottom: '1px solid #e2edf5',
  },
};

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`${API_BASE}/api/admin/reports/summary`);
        if (res && typeof res === 'object') setData(res);
      } catch (e) {
        console.error('Lỗi tải analytics:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>Đang tải thống kê...</div>;
  }
  if (!data) return null;

  const classData = (data.classes || []).map((c) => ({
    name: c.ma_lop_tc,
    'Vắng KP': c.vang_kp,
    'Đi muộn': c.di_muon,
    'Cấm thi': c.so_cam_thi,
  }));

  const absentData = classData.filter((c) => c['Vắng KP'] > 0 || c['Cấm thi'] > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Thống kê điểm danh */}
      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={{ fontSize: '1.7rem', fontWeight: 700, color: '#0f172a' }}>{data.tong_buoi_hoc ?? 0}</div>
          <div style={{ ...styles.cardSub, marginTop: 4 }}>Tổng buổi học</div>
        </div>
        <div style={styles.card}>
          <div style={{ fontSize: '1.7rem', fontWeight: 700, color: '#ef4444' }}>{data.so_sv_cam_thi ?? 0}</div>
          <div style={{ ...styles.cardSub, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertTriangle size={13} /> SV cấm thi
          </div>
        </div>
        <div style={styles.card}>
          <div style={{ fontSize: '1.7rem', fontWeight: 700, color: '#0f172a' }}>{data.tong_sv ?? 0}</div>
          <div style={{ ...styles.cardSub, marginTop: 4 }}>Tổng sinh viên</div>
        </div>
        <div style={styles.card}>
          <div style={{ fontSize: '1.7rem', fontWeight: 700, color: '#0f172a' }}>{data.tong_lop ?? 0}</div>
          <div style={{ ...styles.cardSub, marginTop: 4 }}>Tổng lớp tín chỉ</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
        {/* SV vắng KP theo lớp */}
        <div style={styles.card}>
          <p style={styles.cardTitle}><CalendarDays size={16} color="#106fa6" /> Vắng không phép theo lớp</p>
          <p style={styles.cardSub}>Tổng lượt vắng không phép của từng lớp tín chỉ</p>
          <div style={styles.chartWrap}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={absentData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Vắng KP" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Đi muộn" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SV cấm thi theo lớp */}
        <div style={styles.card}>
          <p style={styles.cardTitle}><AlertTriangle size={16} color="#ef4444" /> SV cấm thi theo lớp</p>
          <p style={styles.cardSub}>Số sinh viên có tỷ lệ vắng vượt ngưỡng 20%</p>
          <div style={styles.chartWrap}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="Cấm thi" radius={[4, 4, 0, 0]}>
                  {classData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top SV nguy cơ cấm thi */}
      {(data.at_risk || []).length > 0 && (
        <div style={styles.card}>
          <p style={styles.cardTitle}><AlertTriangle size={16} color="#ef4444" /> Danh sách SV nguy cơ cấm thi (top {data.at_risk.length})</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {['MSSV', 'Họ tên', 'Lớp BC', 'Lớp tín chỉ', 'Tỷ lệ vắng', 'Điểm CC'].map((h) => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.at_risk.slice(0, 15).map((a, i) => (
                  <tr key={i} style={{ background: i % 2 ? '#f8fafc' : '#fff' }}>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{a.mssv}</td>
                    <td style={styles.td}>{a.ho_ten}</td>
                    <td style={styles.td}>{a.lop_base}</td>
                    <td style={styles.td}>{a.ma_lop_tc}</td>
                    <td style={{ ...styles.td, color: '#dc2626', fontWeight: 700 }}>{a.ty_le_vang}%</td>
                    <td style={styles.td}>{a.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
