import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShieldCheck, Check, X, Trash2, FileText } from 'lucide-react';
import { documentsApi } from '../../api';

const s = {
  panel: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  back: { background: 'none', border: 'none', color: '#106fa6', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px', padding: 0, alignSelf: 'flex-start' },
  title: { fontSize: '1.25rem', fontWeight: '700', color: '#106fa6', display: 'flex', alignItems: 'center', gap: '8px' },
  card: { background: '#fff', border: '1px solid #d9e6f0', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' },
  tag: { background: '#e8f2f9', color: '#106fa6', borderRadius: '20px', padding: '2px 10px', fontSize: '0.72rem', fontWeight: 600 },
  muted: { color: '#64748b', fontSize: '0.78rem' },
  btnApprove: { background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 },
  btnReject: { background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 },
  btnDelete: { background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 },
  empty: { textAlign: 'center', color: '#94a3b8', padding: '40px 0' },
};

const ModerationPanel = ({ user, showToast, onBack }) => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await documentsApi.moderationPending();
      setDocs(data.documents || []);
    } catch (e) {
      showToast?.(e.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const moderate = async (id, action) => {
    const note = action === 'rejected' ? (window.prompt('Lý do từ chối (tùy chọn):') || undefined) : undefined;
    try {
      await documentsApi.moderateDocument(id, action, note);
      showToast?.(action === 'approved' ? 'Đã duyệt tài liệu.' : 'Đã từ chối tài liệu.', 'success');
      setDocs((prev) => prev.filter((d) => d.document_id !== id));
    } catch (e) {
      showToast?.(e.message, 'danger');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Xóa tài liệu này vĩnh viễn?')) return;
    try {
      await documentsApi.removeDocument(id);
      showToast?.('Đã xóa tài liệu.', 'success');
      setDocs((prev) => prev.filter((d) => d.document_id !== id));
    } catch (e) {
      showToast?.(e.message, 'danger');
    }
  };

  return (
    <div style={s.panel}>
      <button style={s.back} onClick={onBack}><ArrowLeft size={15} /> Quay lại thư viện</button>
      <h3 style={s.title}><ShieldCheck size={22} /> Kiểm duyệt tài liệu</h3>

      {loading && <div style={s.empty}>Đang tải...</div>}
      {!loading && docs.length === 0 && <div style={s.empty}>Không có tài liệu nào đang chờ duyệt.</div>}

      {docs.map((d) => (
        <div key={d.document_id} style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 600, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: 6 }}>
                {d.file_ext === '.pdf' ? <FileText size={15} /> : null} {d.title}
              </div>
              <div style={s.muted} style={{ ...s.muted, marginTop: 4 }}>
                {d.uploader_name} ({d.uploaded_by_role}) · {d.original_name} · {(d.file_size / 1024).toFixed(0)} KB · {d.created_at?.slice(0, 16)}
              </div>
            </div>
            <span style={{ ...s.tag, background: '#fef3c7', color: '#b45309' }}>Chờ duyệt</span>
          </div>
          {d.description && <div style={{ fontSize: '0.85rem', color: '#475569' }}>{d.description}</div>}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(d.tags || []).map((t) => <span key={t} style={s.tag}>{t}</span>)}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: 4 }}>
            <button style={s.btnApprove} onClick={() => moderate(d.document_id, 'approved')}><Check size={14} /> Duyệt</button>
            <button style={s.btnReject} onClick={() => moderate(d.document_id, 'rejected')}><X size={14} /> Từ chối</button>
            <button style={s.btnDelete} onClick={() => remove(d.document_id)}><Trash2 size={14} /> Xóa</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ModerationPanel;
