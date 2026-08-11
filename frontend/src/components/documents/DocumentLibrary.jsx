import React, { useState, useEffect } from 'react';
import { FileText, Search, Upload, ShieldCheck, Tag as TagIcon, Download, Eye, Clock, File as FileIcon } from 'lucide-react';
import { documentsApi } from '../../api';

const s = {
  panel: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' },
  title: { fontSize: '1.25rem', fontWeight: '700', color: '#106fa6', display: 'flex', alignItems: 'center', gap: '8px' },
  searchRow: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' },
  input: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbdbe8', fontSize: '0.85rem', background: '#fff', outline: 'none' },
  select: { padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbdbe8', fontSize: '0.85rem', background: '#fff' },
  btnPrimary: { background: '#106fa6', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  btnSecondary: { background: '#eef4f8', color: '#106fa6', border: '1px solid #cbdbe8', borderRadius: '8px', padding: '8px 14px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' },
  card: { background: '#fff', border: '1px solid #d9e6f0', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer', transition: 'box-shadow .15s', minHeight: '170px' },
  tag: { background: '#e8f2f9', color: '#106fa6', borderRadius: '20px', padding: '2px 10px', fontSize: '0.72rem', fontWeight: 600 },
  badge: { borderRadius: '20px', padding: '2px 10px', fontSize: '0.7rem', fontWeight: 700, display: 'inline-block' },
  muted: { color: '#64748b', fontSize: '0.78rem' },
  pagination: { display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' },
  pageBtn: { background: '#fff', border: '1px solid #cbdbe8', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', fontSize: '0.82rem' },
  empty: { textAlign: 'center', color: '#94a3b8', padding: '40px 0' },
};

function fmtSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const DocumentLibrary = ({ user, showToast, onUpload, onOpen, onModeration }) => {
  const isAdmin = (user?.role || '').toLowerCase() === 'admin';
  const [docs, setDocs] = useState([]);
  const [tags, setTags] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [sort, setSort] = useState('newest');
  const [showPending, setShowPending] = useState(false);

  const load = async (params) => {
    setLoading(true);
    try {
      const data = await documentsApi.listDocuments(params);
      setDocs(data.documents || []);
      setTotal(data.total || 0);
    } catch (e) {
      showToast?.(e.message || 'Lỗi tải danh sách tài liệu', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (p = 1, tag = activeTag, srt = sort) => {
    setPage(p);
    const params = { page: p, page_size: pageSize, sort: srt };
    if (search.trim()) params.search = search.trim();
    if (tag) params.tag = tag;
    load(params);
  };

  useEffect(() => {
    documentsApi.listTags().then((d) => setTags(d.tags || [])).catch(() => {});
    applyFilters(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { applyFilters(1); }, [activeTag, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (doc) => {
    if (!window.confirm(`Xóa tài liệu "${doc.title}"?`)) return;
    try {
      await documentsApi.removeDocument(doc.document_id);
      showToast?.('Đã xóa tài liệu.', 'success');
      applyFilters(page);
    } catch (e) {
      showToast?.(e.message, 'danger');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const myUsername = (user?.username || '').toLowerCase();
  const isOwner = (d) => (d.uploaded_by || '').toLowerCase() === myUsername;

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <h3 style={s.title}><FileText size={22} /> Thư viện tài liệu</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isAdmin && (
            <button style={s.btnSecondary} onClick={onModeration}>
              <ShieldCheck size={15} /> Kiểm duyệt
            </button>
          )}
          <button style={s.btnPrimary} onClick={onUpload}>
            <Upload size={15} /> Đăng tải tài liệu
          </button>
        </div>
      </div>

      <div style={s.searchRow}>
        <input
          style={{ ...s.input, flex: 1, minWidth: 200 }}
          placeholder="Tìm kiếm theo tiêu đề, mô tả, nội dung..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(1); }}
        />
        <button style={s.btnPrimary} onClick={() => applyFilters(1)}>
          <Search size={15} /> Tìm
        </button>
        <select style={s.select} value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Mới nhất</option>
          <option value="most_viewed">Xem nhiều nhất</option>
          <option value="most_downloaded">Tải nhiều nhất</option>
        </select>
      </div>

      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <TagIcon size={16} style={{ color: '#106fa6', marginTop: 3 }} />
          {tags.map((t) => (
            <span
              key={t.tag}
              style={{ ...s.tag, cursor: 'pointer', ...(activeTag === t.tag ? { background: '#106fa6', color: '#fff' } : {}) }}
              onClick={() => setActiveTag(activeTag === t.tag ? '' : t.tag)}
            >
              {t.tag} ({t.count})
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          style={{ ...s.btnSecondary, ...(showPending ? { background: '#106fa6', color: '#fff' } : {}) }}
          onClick={() => { setShowPending(!showPending); }}
        >
          Tài liệu của tôi (chờ duyệt)
        </button>
      </div>

      {loading && <div style={s.empty}>Đang tải...</div>}

      {!loading && docs.length === 0 && (
        <div style={s.empty}>Chưa có tài liệu nào. Hãy đăng tải tài liệu đầu tiên!</div>
      )}

      <div style={s.grid}>
        {docs.map((d) => (
          <div key={d.document_id} style={s.card} onClick={() => onOpen(d.document_id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ background: '#f0f6fb', borderRadius: 8, padding: '6px 8px', color: '#106fa6' }}>
                {d.file_ext === '.pdf' ? <FileText size={22} /> : <FileIcon size={22} />}
              </span>
              {d.status !== 'approved' && (
                <span style={{ ...s.badge, background: '#fef3c7', color: '#b45309' }}>Chờ duyệt</span>
              )}
              {isOwner(d) && (
                <span
                  role="button"
                  style={{ color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}
                  onClick={(e) => { e.stopPropagation(); handleDelete(d); }}
                >
                  ✕
                </span>
              )}
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#1e3a5f', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {d.title}
            </div>
            <div style={s.muted}>Người đăng: {d.uploader_name} ({d.uploaded_by_role})</div>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {(d.tags || []).slice(0, 3).map((t) => <span key={t} style={s.tag}>{t}</span>)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
              <span style={{ ...s.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Eye size={13} /> {d.view_count || 0} · <Download size={13} /> {d.download_count || 0} · {fmtSize(d.file_size)}
              </span>
              <span style={{ ...s.muted }}><Clock size={12} /> {(d.created_at || '').slice(0, 10)}</span>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div style={s.pagination}>
          <button style={s.pageBtn} disabled={page <= 1} onClick={() => applyFilters(page - 1)}>←</button>
          <span style={{ fontSize: '0.85rem', color: '#475569' }}>{page} / {totalPages} ({total} tài liệu)</span>
          <button style={s.pageBtn} disabled={page >= totalPages} onClick={() => applyFilters(page + 1)}>→</button>
        </div>
      )}
    </div>
  );
};

export default DocumentLibrary;
