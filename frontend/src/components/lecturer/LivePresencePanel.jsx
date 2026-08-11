import React, { useState, useEffect } from 'react';
import { Users, Radio } from 'lucide-react';
import { attendanceApi } from '../../api';

export default function LivePresencePanel({ lecturerId }) {
  const [live, setLive] = useState(null);

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
    }}>
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
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={18} color="#059669" />
          {live.present_count}<span style={{ fontSize: '0.9rem', color: '#64748b' }}>/{live.total}</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>SV đang có mặt trong phòng</div>
      </div>
      {live.present_list?.length > 0 && (
        <div style={{ flexBasis: '100%', fontSize: '0.8rem', color: '#334155' }}>
          <span style={{ fontWeight: 600 }}>Có mặt:</span>{' '}
          {live.present_list.map((p) => p.ho_ten || p.mssv).join(', ')}
        </div>
      )}
      {live.just_arrived?.length > 0 && (
        <div style={{ flexBasis: '100%', fontSize: '0.8rem', color: '#047857', background: '#ecfdf5', borderRadius: 6, padding: '6px 10px' }}>
          <span style={{ fontWeight: 700 }}>Vừa vào lớp:</span>{' '}
          {live.just_arrived.map((p) => p.ho_ten || p.mssv).join(', ')}
        </div>
      )}
      {live.just_left?.length > 0 && (
        <div style={{ flexBasis: '100%', fontSize: '0.8rem', color: '#b91c1c', background: '#fef2f2', borderRadius: 6, padding: '6px 10px' }}>
          <span style={{ fontWeight: 700 }}>Vừa rời lớp:</span>{' '}
          {live.just_left.map((p) => p.ho_ten || p.mssv).join(', ')}
        </div>
      )}
    </div>
  );
}
