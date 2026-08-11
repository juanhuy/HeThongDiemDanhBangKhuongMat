import React, { useState, useEffect } from 'react';
import { attendanceApi, creditClassesApi, schedulesApi } from '../../api';

export default function ManualCheckin({ user, showToast }) {
  const [classes, setClasses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [mssv, setMssv] = useState('');
  const [status, setStatus] = useState('Present');
  const [loading, setLoading] = useState(false);

  const lecturerId = user?.lecturer_id || user?.username;

  useEffect(() => {
    (async () => {
      try {
        const [clsRes, schRes] = await Promise.all([
          creditClassesApi.listCreditClasses(lecturerId ? { lecturer_id: lecturerId } : {}),
          schedulesApi.listSchedules(lecturerId ? { lecturer_id: lecturerId } : {}),
        ]);
        setClasses(clsRes.data || clsRes.classes || []);
        setSchedules(schRes.schedules || []);
      } catch (err) {
        showToast?.(err.message || 'Lỗi tải dữ liệu', 'danger');
      }
    })();
  }, [lecturerId]);

  const classSessions = schedules.filter((s) => s.class_id === selectedClass);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mssv || !selectedSession) {
      showToast?.('Vui lòng nhập MSSV và chọn buổi học', 'danger');
      return;
    }
    try {
      setLoading(true);
      await attendanceApi.manualCheckin({
        mssv: mssv.trim().toUpperCase(),
        session_id: selectedSession,
        trang_thai: status,
        nguoi_xac_nhan: user?.ho_ten || user?.username || 'Giảng viên',
      });
      showToast?.(`Đã điểm danh ${mssv} thành công`);
      setMssv('');
    } catch (err) {
      showToast?.(err.message || 'Điểm danh thất bại', 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <h2 style={{ margin: '0 0 6px', fontSize: '1.15rem', color: '#106fa6', fontWeight: 700 }}>Điểm danh thủ công</h2>
        <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: '#64748b' }}>Nhập MSSV và chọn buổi học để ghi nhận điểm danh</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Lớp tín chỉ</label>
            <select
              value={selectedClass}
              onChange={(e) => { setSelectedClass(e.target.value); setSelectedSession(''); }}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem' }}
            >
              <option value="">-- Chọn lớp --</option>
              {classes.map((c) => (
                <option key={c.class_id} value={c.class_id}>{c.class_id} · {c.subject_id}</option>
              ))}
            </select>
          </div>

          <div>
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

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>MSSV</label>
            <input
              type="text"
              value={mssv}
              onChange={(e) => setMssv(e.target.value.toUpperCase())}
              placeholder="VD: N22DCCN001"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Trạng thái</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem' }}
            >
              <option value="Present">Có mặt / Đúng giờ</option>
              <option value="Late">Đi muộn</option>
              <option value="Excused">Có phép</option>
              <option value="Absent">Vắng không phép</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              padding: '12px',
              background: loading ? '#94a3b8' : '#106fa6',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Đang lưu...' : 'Xác nhận điểm danh'}
          </button>
        </form>
      </div>
    </div>
  );
}