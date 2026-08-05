import React, { useState, useEffect } from 'react';
import { schedulesApi, creditClassesApi, roomsApi } from '../../api';

export default function ScheduleAdmin({ showToast }) {
  const [schedules, setSchedules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    ma_lop_tc: '',
    ngay_hoc: new Date().toISOString().substring(0, 10),
    phong_hoc: '',
    gio_bat_dau: '07:30',
    ca_hoc: 1,
  });

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [schRes, clsRes, roomRes] = await Promise.all([
        schedulesApi.listSchedules(),
        creditClassesApi.listCreditClasses(),
        roomsApi.listRooms(),
      ]);
      setSchedules(schRes.schedules || []);
      setClasses(clsRes.data || clsRes.classes || []);
      const roomList = roomRes.items || roomRes.data || roomRes || [];
      setRooms(Array.isArray(roomList) ? roomList : []);
    } catch (err) {
      showToast?.(err.message || 'Lỗi tải lịch học', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.ma_lop_tc || !form.phong_hoc) {
      showToast?.('Chọn lớp và phòng học', 'danger');
      return;
    }
    try {
      await schedulesApi.addSchedule({
        ma_lop_tc: form.ma_lop_tc,
        ngay_hoc: form.ngay_hoc,
        phong_hoc: form.phong_hoc,
        gio_bat_dau: form.gio_bat_dau,
        ca_hoc: form.ca_hoc,
      });
      showToast?.('Thêm lịch học thành công');
      fetchAll();
    } catch (err) {
      showToast?.(err.message || 'Thêm lịch thất bại', 'danger');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa buổi học này?')) return;
    try {
      await schedulesApi.deleteSchedule(id);
      showToast?.('Đã xóa buổi học');
      fetchAll();
    } catch (err) {
      showToast?.(err.message || 'Xóa thất bại', 'danger');
    }
  };

  const inputStyle = {
    padding: '8px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: '0.9rem',
    width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Form thêm */}
      <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, padding: 18 }}>
        <h2 style={{ margin: '0 0 14px', fontSize: '1.1rem', color: '#106fa6', fontWeight: 700 }}>Thêm lịch học</h2>
        <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Lớp tín chỉ *</label>
            <select required value={form.ma_lop_tc} onChange={(e) => setForm({ ...form, ma_lop_tc: e.target.value })} style={inputStyle}>
              <option value="">-- Chọn lớp --</option>
              {classes.map((c) => (
                <option key={c.class_id} value={c.class_id}>{c.class_id}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Ngày học *</label>
            <input type="date" required value={form.ngay_hoc} onChange={(e) => setForm({ ...form, ngay_hoc: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Phòng *</label>
            <select required value={form.phong_hoc} onChange={(e) => setForm({ ...form, phong_hoc: e.target.value })} style={inputStyle}>
              <option value="">-- Chọn phòng --</option>
              {rooms.map((r) => (
                <option key={r.room_id} value={r.room_id}>{r.room_id} {r.room_name ? `– ${r.room_name}` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Giờ bắt đầu</label>
            <input type="time" value={form.gio_bat_dau} onChange={(e) => setForm({ ...form, gio_bat_dau: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Ca</label>
            <select value={form.ca_hoc} onChange={(e) => setForm({ ...form, ca_hoc: parseInt(e.target.value) })} style={inputStyle}>
              {[1, 2, 3, 4, 5].map((c) => <option key={c} value={c}>Ca {c}</option>)}
            </select>
          </div>
          <button type="submit" style={{ padding: '9px 16px', background: '#106fa6', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', height: 40 }}>
            Thêm buổi
          </button>
        </form>
      </div>

      {/* Danh sách */}
      <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2edf5', fontWeight: 600, color: '#106fa6' }}>
          Danh sách buổi học ({schedules.length})
        </div>
        {loading ? (
          <div style={{ padding: 28, textAlign: 'center', color: '#64748b' }}>Đang tải...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Lớp', 'Môn', 'Ngày', 'Giờ', 'Phòng', 'Ca', 'Xóa'].map((h) => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schedules.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Chưa có lịch</td></tr>
                ) : (
                  schedules.map((s) => (
                    <tr key={s.session_id} style={{ borderBottom: '1px solid #e2edf5' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0369a1' }}>{s.class_id}</td>
                      <td style={{ padding: '10px 12px' }}>{s.subject_name || '—'}</td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{s.session_date || String(s.start_time || '').substring(0, 10)}</td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        {s.start_time ? String(s.start_time).substring(11, 16) : '—'}
                        {s.end_time ? ` – ${String(s.end_time).substring(11, 16)}` : ''}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{s.room_id || s.room || '—'}</td>
                      <td style={{ padding: '10px 12px' }}>{s.shift || '—'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <button onClick={() => handleDelete(s.session_id)} style={{ padding: '4px 8px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 6, color: '#991b1b', cursor: 'pointer', fontSize: '0.75rem' }}>
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}