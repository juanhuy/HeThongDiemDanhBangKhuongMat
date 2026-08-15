import React, { useState, useEffect } from 'react';
import { Users, Radio, ClipboardList, X } from 'lucide-react';
import { attendanceApi } from '../../api';

const ST = {
  'Có mặt': { bg: '#dcfce7', color: '#16a34a' },
  'Đi muộn': { bg: '#fef9c3', color: '#ca8a04' },
  'Có phép': { bg: '#e0f2fe', color: '#0284c7' },
  'Vắng không phép': { bg: '#fee2e2', color: '#dc2626' },
  'Chưa điểm danh': { bg: '#f1f5f9', color: '#64748b' },
};

export default function LivePresencePanel({ lecturerId }) {
  const [live, setLive] = useState(null);
  const [roster, setRoster] = useState(null);
  const [showRoster, setShowRoster] = useState(false);
  const [rosterLoading, setRosterLoading] = useState(false);

  useEffect(() => {
    if (!lecturerId) return;
    let stop = false;
    const fetchLive = async () => {
      try {
        const data = await attendanceApi.getLivePresence({ lecturer_id: lecturerId });
        if (!stop) setLive(data);
      } catch (e) {
        if (!stop) setLive(null);
      }
    };
    fetchLive();
    const timer = setInterval(fetchLive, 5000);
    return () => { stop = true; clearInterval(timer); };
  }, [lecturerId]);

  const openRoster = async () => {
    if (!live?.session) return;
    try {
      setRosterLoading(true);
      setShowRoster(true);
      const res = await attendanceApi.getClassRoster(live.session.class_id, live.session.session_id);
      setRoster(res);
    } catch (e) {
      setRoster(null);
    } finally {
      setRosterLoading(false);
    }
  };

  if (!live || !live.has_session) return null;

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #a7f3d0',
      borderRadius: 10,
      padding: '14px 18px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 12,
      boxShadow: '0 2px 8px rgba(5,150,105,0.08)',
      flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, width: '100%' }}>
        <div>
          <div style={{ fontWeight: 700, color: '#065f46', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Radio size={16} color="#10b981" />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            Buổi đang diễn ra · {live.session.class_id} · Phòng {live.session.room_id}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: 4 }}>
            {live.session.start_time} – {live.session.end_time}
            {live.scanned_at ? ` · Cập nhật ${live.scanned_at}` : ' · Chưa có snapshot'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={18} color="#059669" />
              {live.present_count}<span style={{ fontSize: '0.9rem', color: '#64748b' }}>/{live.total}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>SV đang có mặt (camera)</div>
          </div>
          <button
            type="button"
            onClick={showRoster ? () => setShowRoster(false) : openRoster}
            style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #059669', background: '#ecfdf5', color: '#065f46', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ClipboardList size={16} />
            {showRoster ? 'Đóng danh sách' : 'Xem điểm danh buổi này'}
          </button>
        </div>
      </div>

      {showRoster && (
        <div style={{ width: '100%', borderTop: '1px solid #e2edf5', paddingTop: 12 }}>
          {rosterLoading ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: 16 }}>Đang tải danh sách...</div>
          ) : roster ? (
            <>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                {[
                  { label: 'Tổng SV', v: roster.summary?.tong_sv, c: '#106fa6' },
                  { label: 'Có mặt', v: roster.summary?.co_mat, c: '#16a34a' },
                  { label: 'Đi muộn', v: roster.summary?.di_muon, c: '#ca8a04' },
                  { label: 'Vắng', v: roster.summary?.vang_kp, c: '#dc2626' },
                  { label: 'Chưa điểm danh', v: roster.summary?.chua_diem_danh, c: '#64748b' },
                ].map((m) => (
                  <span key={m.label} style={{ padding: '4px 12px', borderRadius: 999, background: '#f8fbfd', border: '1px solid #d0e0eb', fontSize: '0.78rem', fontWeight: 600, color: m.c }}>
                    {m.label}: {m.v ?? 0}
                  </span>
                ))}
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e2edf5', borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#f0fdf4', position: 'sticky', top: 0 }}>
                      {['MSSV', 'Họ tên', 'Trạng thái', 'Nguồn'].map((h) => (
                        <th key={h} style={{ padding: '7px 10px', textAlign: 'left', color: '#065f46', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {roster.students.map((s) => {
                      const st = ST[s.status] || ST['Chưa điểm danh'];
                      return (
                        <tr key={s.mssv} style={{ borderTop: '1px solid #eef3f7', background: s.status === 'Vắng không phép' ? '#fff7f7' : 'transparent' }}>
                          <td style={{ padding: '7px 10px', fontWeight: 600, color: '#0369a1' }}>{s.mssv}</td>
                          <td style={{ padding: '7px 10px' }}>{s.ho_ten}</td>
                          <td style={{ padding: '7px 10px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 600, background: st.bg, color: st.color }}>{s.status}</span>
                          </td>
                          <td style={{ padding: '7px 10px', fontSize: '0.72rem', color: '#64748b' }}>
                            {s.source === 'manual' ? 'Thủ công' : s.source === 'AI' ? 'Tự động' : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: 12 }}>Không tải được danh sách.</div>
          )}
        </div>
      )}

      {live.present_list?.length > 0 && (
        <div style={{ flexBasis: '100%', fontSize: '0.8rem', color: '#334155', width: '100%' }}>
          <span style={{ fontWeight: 600 }}>Có mặt (camera):</span>{' '}
          {live.present_list.map((p) => p.ho_ten || p.mssv).join(', ')}
        </div>
      )}
      {live.just_arrived?.length > 0 && (
        <div style={{ flexBasis: '100%', fontSize: '0.8rem', color: '#047857', background: '#ecfdf5', borderRadius: 6, padding: '6px 10px', width: '100%' }}>
          <span style={{ fontWeight: 700 }}>Vừa vào lớp:</span>{' '}
          {live.just_arrived.map((p) => p.ho_ten || p.mssv).join(', ')}
        </div>
      )}
      {live.just_left?.length > 0 && (
        <div style={{ flexBasis: '100%', fontSize: '0.8rem', color: '#b91c1c', background: '#fef2f2', borderRadius: 6, padding: '6px 10px', width: '100%' }}>
          <span style={{ fontWeight: 700 }}>Vừa rời lớp:</span>{' '}
          {live.just_left.map((p) => p.ho_ten || p.mssv).join(', ')}
        </div>
      )}
    </div>
  );
}
