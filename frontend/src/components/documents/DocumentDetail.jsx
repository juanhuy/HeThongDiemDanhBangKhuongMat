import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, FileText, Sparkles, MessageSquare, Layers, Eye, Loader2 } from 'lucide-react';
import { documentsApi } from '../../api';

const s = {
  panel: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  back: { background: 'none', border: 'none', color: '#106fa6', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px', padding: 0, alignSelf: 'flex-start' },
  title: { fontSize: '1.25rem', fontWeight: '700', color: '#1e3a5f', margin: 0 },
  meta: { fontSize: '0.78rem', color: '#64748b', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' },
  tabs: { display: 'flex', gap: '4px', borderBottom: '1px solid #d9e6f0' },
  tab: { padding: '8px 16px', cursor: 'pointer', fontSize: '0.86rem', fontWeight: 600, color: '#475569', borderBottom: '2px solid transparent' },
  tabActive: { color: '#106fa6', borderBottomColor: '#106fa6' },
  box: { background: '#fff', border: '1px solid #d9e6f0', borderRadius: '10px', padding: '1rem' },
  viewer: { border: '1px solid #d9e6f0', borderRadius: '10px', overflow: 'hidden', background: '#fff' },
  textViewer: { padding: '1.25rem', whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: 1.7, color: '#1e293b', maxHeight: '70vh', overflowY: 'auto', fontFamily: 'inherit' },
  btnPrimary: { background: '#106fa6', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  btnSecondary: { background: '#eef4f8', color: '#106fa6', border: '1px solid #cbdbe8', borderRadius: '8px', padding: '8px 14px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  tag: { background: '#e8f2f9', color: '#106fa6', borderRadius: '20px', padding: '3px 12px', fontSize: '0.78rem', fontWeight: 600 },
  commentInput: { display: 'flex', gap: '8px', marginTop: '8px' },
  input: { flex: 1, padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbdbe8', fontSize: '0.87rem', outline: 'none' },
};

const DocumentDetail = ({ user, showToast, docId, initialTab = 'view', onBack }) => {
  const [doc, setDoc] = useState(null);
  const [tab, setTab] = useState(initialTab);
  const [viewerUrl, setViewerUrl] = useState(null);
  const [textContent, setTextContent] = useState('');
  const [summary, setSummary] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [summaryProcessing, setSummaryProcessing] = useState(false);

  const loadSummary = async () => {
    try {
      const sm = await documentsApi.getDocumentSummary(docId);
      setSummary(sm);
      setSummaryProcessing(!!sm.processing);
      return sm;
    } catch (e) {
      return null;
    }
  };

  // Poll kết quả khi AI đang phân tích nền
  useEffect(() => {
    if (!summaryProcessing) return;
    const t = setInterval(loadSummary, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryProcessing]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const d = (await documentsApi.getDocument(docId)).document;
        if (!alive) return;
        setDoc(d);
        setTab(initialTab);

        if (d.file_ext === '.pdf') {
          const url = await documentsApi.viewDocumentBlobUrl(docId);
          if (alive) setViewerUrl(url);
        } else {
          const t = await documentsApi.getDocumentText(docId);
          if (alive) setTextContent(t.content || '');
        }
        documentsApi.getDocumentSummary(docId).then((sm) => { if (alive) { setSummary(sm); setSummaryProcessing(!!sm.processing); } }).catch(() => {});
        documentsApi.listComments(docId).then((cm) => alive && setComments(cm.comments || [])).catch(() => {});
        documentsApi.similarDocuments(docId).then((sim) => alive && setSimilar(sim.documents || [])).catch(() => {});
      } catch (e) {
        if (alive) showToast?.(e.message || 'Không tải được tài liệu', 'danger');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  const submitComment = async () => {
    if (!commentText.trim()) return;
    try {
      const res = await documentsApi.addComment(docId, commentText.trim());
      setComments((prev) => [...prev, res.comment]);
      setCommentText('');
    } catch (e) {
      showToast?.(e.message, 'danger');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>Đang tải tài liệu...</div>;
  if (!doc) return <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>Không tìm thấy tài liệu.</div>;

  return (
    <div style={s.panel}>
      <button style={s.back} onClick={onBack}><ArrowLeft size={15} /> Quay lại thư viện</button>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={s.title}>{doc.title}</h3>
            <div style={s.meta} style={{ ...s.meta, marginTop: 6 }}>
              <span>Người đăng: <b>{doc.uploader_name}</b> ({doc.uploaded_by_role})</span>
              <span><Eye size={13} style={{ verticalAlign: -2 }} /> {doc.view_count} lượt xem</span>
              <span>Ngày: {doc.created_at?.slice(0, 10)}</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: 8 }}>
              {(doc.tags || []).map((t) => <span key={t} style={s.tag}>{t}</span>)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button style={s.btnSecondary} onClick={() => documentsApi.downloadDocument(docId, doc.original_name)}>
              <Download size={15} /> Tải về
            </button>
            <button
              style={s.btnPrimary}
              onClick={() => { window.location.hash = `#/flashcards/${docId}`; }}
            >
              <Sparkles size={15} /> Học Flashcard
            </button>
          </div>
        </div>
      </div>

      <div style={s.tabs}>
        <div style={{ ...s.tab, ...(tab === 'view' ? s.tabActive : {}) }} onClick={() => setTab('view')}>
          <FileText size={14} style={{ verticalAlign: -2 }} /> Xem tài liệu
        </div>
        <div style={{ ...s.tab, ...(tab === 'summary' ? s.tabActive : {}) }} onClick={() => setTab('summary')}>
          <Sparkles size={14} style={{ verticalAlign: -2 }} /> Tóm tắt AI
        </div>
        <div style={{ ...s.tab, ...(tab === 'comments' ? s.tabActive : {}) }} onClick={() => setTab('comments')}>
          <MessageSquare size={14} style={{ verticalAlign: -2 }} /> Bình luận ({comments.length})
        </div>
      </div>

      {tab === 'view' && (
        <div style={s.viewer}>
          {doc.file_ext === '.pdf' && viewerUrl && (
            <iframe src={viewerUrl} title={doc.title} style={{ width: '100%', height: '70vh', border: 'none' }} />
          )}
          {doc.file_ext !== '.pdf' && (
            <div style={s.textViewer}>
              {textContent ? textContent : 'Không trích xuất được nội dung văn bản từ file Word này. Bạn có thể tải file về để xem.'}
            </div>
          )}
        </div>
      )}

      {tab === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
              {summaryProcessing ? (
                <span style={{ fontSize: '0.8rem', background: '#dbeafe', color: '#2563eb', borderRadius: 20, padding: '3px 12px' }}>
                  ⏳ AI đang phân tích nội dung...
                </span>
              ) : summary?.has_llm ? (
                <span style={{ fontSize: '0.8rem', background: '#e8f2f9', color: '#106fa6', borderRadius: 20, padding: '3px 12px' }}>Phân tích bởi AI</span>
              ) : (
                <span style={{ fontSize: '0.8rem', background: '#fef3c7', color: '#b45309', borderRadius: 20, padding: '3px 12px' }}>Phân tích quy tắc (chưa bật LLM)</span>
              )}
            </div>
            <button
              style={s.btnPrimary}
              disabled={reanalyzing || summaryProcessing}
              onClick={async () => {
                setReanalyzing(true);
                setSummaryProcessing(true);
                try {
                  await documentsApi.reanalyzeDocument(docId);
                  showToast?.('Đang phân tích lại bằng AI...', 'info');
                } catch (e) {
                  showToast?.(e.message || 'Lỗi phân tích lại', 'danger');
                  setSummaryProcessing(false);
                } finally {
                  setReanalyzing(false);
                }
              }}
            >
              {reanalyzing ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />}
              {reanalyzing ? 'Đang yêu cầu...' : 'Phân tích lại bằng AI'}
            </button>
          </div>

          {summaryProcessing ? (
            <div style={{ ...s.box, textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
              <Loader2 size={28} className="spin" style={{ margin: '0 auto 10px', display: 'block' }} />
              AI đang tóm tắt tài liệu, vui lòng chờ... (trang sẽ tự cập nhật khi xong)
            </div>
          ) : (<>
          <div style={s.box}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#106fa6', marginBottom: 8 }}>
              <Sparkles size={14} style={{ verticalAlign: -2 }} /> Tổng quan
            </div>
            <div style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.7 }}>
              {summary?.summary || 'Chưa có nội dung tóm tắt cho tài liệu này.'}
            </div>
          </div>

          <div style={s.box}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#106fa6', marginBottom: 8 }}>
              <Layers size={14} style={{ verticalAlign: -2 }} /> Từ khóa (Keywords)
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(summary?.keywords || []).map((k) => <span key={k} style={s.tag}>{k}</span>)}
              {(summary?.keywords || []).length === 0 && <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Chưa có từ khóa.</span>}
            </div>
          </div>

          {(summary?.chapters || []).length > 0 && (
            <div style={s.box}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#106fa6', marginBottom: 8 }}>
                <Layers size={14} style={{ verticalAlign: -2 }} /> Nội dung theo chương
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(summary.chapters || []).map((ch, i) => (
                  <div key={i} style={{ borderLeft: '3px solid #106fa6', paddingLeft: 12 }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1e3a5f' }}>{ch.title}</div>
                    {ch.summary && <div style={{ fontSize: '0.86rem', color: '#475569', marginTop: 4, lineHeight: 1.6 }}>{ch.summary}</div>}
                    {ch.keywords && ch.keywords.length > 0 && (
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 5 }}>
                        {(ch.keywords || []).slice(0, 5).map((k) => <span key={k} style={s.tag}>{k}</span>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={s.box}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#106fa6', marginBottom: 8 }}>
              <Sparkles size={14} style={{ verticalAlign: -2 }} /> Ý chính (Key Points)
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, color: '#334155', fontSize: '0.9rem', lineHeight: 1.7 }}>
              {(summary?.key_points || []).map((p, i) => <li key={i}>{p}</li>)}
              {(!summary?.key_points || summary.key_points.length === 0) && <li>Chưa có ý chính.</li>}
            </ul>
          </div>

          {(summary?.terms || []).length > 0 && (
            <div style={s.box}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#106fa6', marginBottom: 8 }}>
                <Layers size={14} style={{ verticalAlign: -2 }} /> Thuật ngữ quan trọng
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(summary.terms || []).map((t, i) => (
                  <div key={i}>
                    <b style={{ color: '#1e3a5f', fontSize: '0.9rem' }}>{t.term}</b>
                    <div style={{ fontSize: '0.85rem', color: '#475569' }}>{t.definition}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {summary?.conclusion && (
            <div style={s.box}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#106fa6', marginBottom: 8 }}>
                <Sparkles size={14} style={{ verticalAlign: -2 }} /> Kết luận
              </div>
              <div style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.7 }}>{summary.conclusion}</div>
            </div>
          )}
          </>)}
        </div>
      )}

      {tab === 'comments' && (
        <div style={s.box}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#106fa6', marginBottom: 8 }}>
            <MessageSquare size={14} style={{ verticalAlign: -2 }} /> Bình luận
          </div>
          {comments.length === 0 && <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Chưa có bình luận nào.</div>}
          {comments.map((c) => (
            <div key={c.comment_id} style={{ borderBottom: '1px solid #eef3f7', padding: '8px 0' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#106fa6' }}>
                {c.full_name || c.username} <span style={{ fontWeight: 400, color: '#94a3b8' }}>{c.created_at?.slice(0, 16)}</span>
              </div>
              <div style={{ fontSize: '0.88rem', color: '#334155', marginTop: 3 }}>{c.content}</div>
            </div>
          ))}
          <div style={s.commentInput}>
            <input style={s.input} value={commentText} onChange={(e) => setCommentText(e.target.value)}
              placeholder="Viết bình luận..." onKeyDown={(e) => e.key === 'Enter' && submitComment()} />
            <button style={s.btnPrimary} onClick={submitComment}>Gửi</button>
          </div>
        </div>
      )}

      {similar.length > 0 && (
        <div style={s.box}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#106fa6', marginBottom: 8 }}>
            <Sparkles size={14} style={{ verticalAlign: -2 }} /> Có thể bạn quan tâm (theo Tag)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {similar.map((d) => (
              <div key={d.document_id} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 10, padding: '6px 8px', borderRadius: 6 }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#f0f6fb')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                onClick={() => { window.location.hash = `#/documents/${d.document_id}`; }}
              >
                <span style={{ fontSize: '0.88rem', color: '#1e3a5f', fontWeight: 500 }}>{d.title}</span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                  {(d.tags || []).slice(0, 2).join(', ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentDetail;
