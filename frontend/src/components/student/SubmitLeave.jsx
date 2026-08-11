import React, { useState } from 'react';
import { API_BASE, authFetch } from '../../api/client';

export default function SubmitLeave({ user, showToast }) {
  const [sessionId, setSessionId] = useState('');
  const [reason, setReason] = useState('');
  const [proof, setProof] = useState('Giấy khám sức khỏe / Lý do cá nhân');
  const [loading, setLoading] = useState(false);

  const mssv = user?.mssv || user?.username?.toUpperCase();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sessionId || !reason) {
      showToast?.('Vui lòng điền đủ thông tin', 'danger');
      return;
    }
    try {
      setLoading(true);
      const fd = new FormData();
      fd.append('mssv', mssv);
      fd.append('ma_buoi_hoc', sessionId);
      fd.append('ly_do', reason);
      fd.append('minh_chung', proof);
      const res = await authFetch(`${API_BASE}/api/student/leave_request`, { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast?.('Gửi đơn nghỉ phép thành công');
        setSessionId('');
        setReason('');
      } else {
        showToast?.(data.detail || 'Gửi đơn thất bại', 'danger');
      }
    } catch {
      showToast?.('Lỗi kết nối', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    fontSize: '0.9rem',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 12, padding: 24 }}>
        <h2 style={{ margin: '0 0 6px', fontSize: '1.15rem', color: '#106fa6', fontWeight: 700 }}>Xin nghỉ phép</h2>
        <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: '#64748b' }}>MSSV: <strong>{mssv}</strong></p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Mã buổi học / Session ID *</label>
            <input required value={sessionId} onChange={(e) => setSessionId(e.target.value)} placeholder="VD: 12" style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Lý do *</label>
            <textarea required value={reason} onChange={(e) => setReason(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 }}>Minh chứng</label>
            <input value={proof} onChange={(e) => setProof(e.target.value)} style={inputStyle} />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: 12,
              background: loading ? '#94a3b8' : '#106fa6',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Đang gửi...' : 'Gửi đơn'}
          </button>
        </form>
      </div>
    </div>
  );
}