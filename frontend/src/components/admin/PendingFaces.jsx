import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../api/client';

export default function PendingFaces({ showToast }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/pending-faces`);
      if (res.ok) {
        const data = await res.json();
        setList(data.data || data.pending || data || []);
      } else {
        setList([]);
      }
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleAction = async (id, action) => {
    try {
      const res = await fetch(`${API_BASE}/api/pending-faces/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      });
      if (res.ok) {
        showToast?.(action === 'Approved' ? 'Đã duyệt Face ID' : 'Đã từ chối');
        setList((prev) => prev.filter((item) => item.id !== id));
      } else {
        const err = await res.json().catch(() => ({}));
        showToast?.(err.detail || 'Thao tác thất bại', 'danger');
      }
    } catch {
      showToast?.('Lỗi kết nối', 'danger');
    }
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2edf5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#106fa6', margin: 0 }}>Duyệt Face ID chờ xác nhận</h2>
        <button onClick={fetchPending} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#f8fafc', cursor: 'pointer', fontSize: '0.8rem' }}>
          Làm mới
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>Đang tải...</div>
      ) : list.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Không có yêu cầu nào đang chờ</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f0f7fc' }}>
                {['Ảnh', 'MSSV', 'Họ tên', 'Lớp', 'Thời gian', 'Thao tác'].map((h) => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#106fa6', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #e2edf5' }}>
                  <td style={{ padding: '10px 12px' }}>
                    {item.photo_url || item.image_url ? (
                      <img src={item.photo_url || item.image_url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                    ) : (
                      <div style={{ width: 48, height: 48, background: '#f1f5f9', borderRadius: 6 }} />
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{item.mssv || item.student_id}</td>
                  <td style={{ padding: '10px 12px' }}>{item.full_name || item.ho_ten || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>{item.administrative_class || item.lop || '—'}</td>
                  <td style={{ padding: '10px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : '—'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => handleAction(item.id, 'Approved')}
                        style={{ padding: '4px 10px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 6, cursor: 'pointer', fontSize: '0.75rem', color: '#166534' }}
                      >
                        Duyệt
                      </button>
                      <button
                        onClick={() => handleAction(item.id, 'Rejected')}
                        style={{ padding: '4px 10px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: '0.75rem', color: '#991b1b' }}
                      >
                        Từ chối
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}