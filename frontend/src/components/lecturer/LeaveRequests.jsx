import React, { useState, useEffect } from 'react';

/**
 * Duyệt nghỉ phép – endpoint backend chưa chuẩn hóa trong api_credit_classes.
 * Giữ UI sẵn, gọi API cũ nếu còn tồn tại; có thể nối sau.
 */
export default function LeaveRequests({ API_BASE, showToast }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/leave-requests`);
        if (res.ok) {
          const data = await res.json();
          setRequests(data.requests || data.data || []);
        } else {
          setRequests([]);
        }
      } catch {
        setRequests([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [API_BASE]);

  const handleAction = async (id, action) => {
    try {
      const res = await fetch(`${API_BASE}/api/leave-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      });
      if (res.ok) {
        showToast?.(action === 'Approved' ? 'Đã duyệt' : 'Đã từ chối');
        setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: action } : r)));
      } else {
        showToast?.('Thao tác thất bại', 'danger');
      }
    } catch {
      showToast?.('Lỗi kết nối', 'danger');
    }
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2edf5', color: '#106fa6', fontWeight: 700, fontSize: '1.05rem' }}>
        Duyệt đơn nghỉ phép
      </div>
      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>Đang tải...</div>
      ) : requests.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Không có đơn nghỉ phép nào</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f0f7fc' }}>
              {['MSSV', 'Họ tên', 'Buổi', 'Lý do', 'Trạng thái', 'Thao tác'].map((h) => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#106fa6', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #e2edf5' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{r.mssv || r.student_id}</td>
                <td style={{ padding: '10px 12px' }}>{r.full_name || r.ho_ten || '—'}</td>
                <td style={{ padding: '10px 12px' }}>{r.session_id || r.ma_buoi_hoc || '—'}</td>
                <td style={{ padding: '10px 12px' }}>{r.reason || r.ly_do || '—'}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 600,
                    background: r.status === 'Approved' ? '#dcfce7' : r.status === 'Rejected' ? '#fee2e2' : '#fef9c3',
                    color: r.status === 'Approved' ? '#16a34a' : r.status === 'Rejected' ? '#dc2626' : '#a16207',
                  }}>{r.status || 'Pending'}</span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {(r.status === 'Pending' || !r.status) && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleAction(r.id, 'Approved')} style={{ padding: '4px 10px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 6, cursor: 'pointer', fontSize: '0.75rem', color: '#166534' }}>Duyệt</button>
                      <button onClick={() => handleAction(r.id, 'Rejected')} style={{ padding: '4px 10px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: '0.75rem', color: '#991b1b' }}>Từ chối</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}