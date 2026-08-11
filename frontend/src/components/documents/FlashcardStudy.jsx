import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Volume2, Plus, Trash2, RotateCcw, Sparkles } from 'lucide-react';
import { documentsApi } from '../../api';

const s = {
  panel: { display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 760 },
  back: { background: 'none', border: 'none', color: '#106fa6', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px', padding: 0, alignSelf: 'flex-start' },
  title: { fontSize: '1.2rem', fontWeight: '700', color: '#106fa6', display: 'flex', alignItems: 'center', gap: '8px' },
  card: { perspective: '1000px', cursor: 'pointer', minHeight: 220 },
  inner: { position: 'relative', width: '100%', height: '100%', minHeight: 220, transformStyle: 'preserve-3d', transition: 'transform .4s' },
  face: { position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', borderRadius: '14px', border: '1px solid #d9e6f0', background: '#fff', fontSize: '1.05rem', lineHeight: 1.6, textAlign: 'center', color: '#1e3a5f', boxShadow: '0 4px 14px rgba(16,111,166,.08)' },
  back: { transform: 'rotateY(180deg)', background: '#f0f6fb', color: '#0b5c8c', fontWeight: 700 },
  controls: { display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center' },
  btn: { background: '#eef4f8', color: '#106fa6', border: '1px solid #cbdbe8', borderRadius: '8px', padding: '8px 14px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  btnPrimary: { background: '#106fa6', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  box: { background: '#fff', border: '1px solid #d9e6f0', borderRadius: '10px', padding: '1rem' },
  input: { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbdbe8', fontSize: '0.87rem', outline: 'none', boxSizing: 'border-box', marginBottom: '8px' },
  label: { fontSize: '0.8rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 },
};

const speak = (text) => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'vi-VN';
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
};

const FlashcardStudy = ({ user, showToast, docId, onBack }) => {
  const [cards, setCards] = useState([]);
  const [mine, setMine] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('Flashcard');
  const [q, setQ] = useState('');
  const [a, setA] = useState('');
  const [chapterFilter, setChapterFilter] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!processing) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [processing]); // eslint-disable-line react-hooks/exhaustive-deps

  const typeLabel = (t) => (t === 'ai' ? 'AI' : t === 'definition' ? 'Định nghĩa' : 'Điền khuyết');
  const chapters = [...new Set((cards || []).map((c) => c.chapter || 'Khác').filter(Boolean))];
  const filteredCards = chapterFilter ? (cards || []).filter((c) => (c.chapter || 'Khác') === chapterFilter) : cards;
  const visibleCards = filteredCards.length > 0 ? filteredCards : cards;

  const load = async () => {
    setLoading(true);
    try {
      const data = await documentsApi.documentFlashcards(docId);
      setCards(data.cards || []);
      setProcessing(!!data.processing);
      setIdx(0);
      setFlipped(false);
      try {
        const doc = (await documentsApi.getDocument(docId)).document;
        if (doc) setTitle(`Flashcard - ${doc.title}`);
      } catch {}
      documentsApi.myFlashcards().then((d) => setMine(d.cards || [])).catch(() => {});
    } catch (e) {
      showToast?.(e.message || 'Không tải được flashcard', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (docId) load(); }, [docId]); // eslint-disable-line react-hooks/exhaustive-deps

  const flip = () => setFlipped(!flipped);

  const addPersonal = async () => {
    if (!q.trim() || !a.trim()) { showToast?.('Nhập đầy đủ câu hỏi và trả lời.', 'danger'); return; }
    try {
      await documentsApi.createPersonalFlashcard({ question: q.trim(), answer: a.trim(), document_id: docId });
      setQ(''); setA('');
      showToast?.('Đã thêm flashcard cá nhân.', 'success');
      documentsApi.myFlashcards().then((d) => setMine(d.cards || [])).catch(() => {});
    } catch (e) {
      showToast?.(e.message, 'danger');
    }
  };

  const delPersonal = async (id) => {
    try {
      await documentsApi.deleteFlashcard(id);
      setMine((prev) => prev.filter((c) => c.card_id !== id));
    } catch (e) {
      showToast?.(e.message, 'danger');
    }
  };

  const current = visibleCards[idx];
  const cardChapter = current?.chapter || '';

  return (
    <div style={s.panel}>
      <button style={s.back} onClick={onBack}><ArrowLeft size={15} /> Quay lại</button>
      <h3 style={s.title}><Sparkles size={22} /> {title}</h3>

      {chapters.length > 1 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            style={{ ...s.btn, ...(!chapterFilter ? { background: '#106fa6', color: '#fff' } : {}) }}
            onClick={() => { setChapterFilter(''); setIdx(0); setFlipped(false); }}
          >
            Tất cả
          </button>
          {chapters.map((ch) => (
            <button
              key={ch}
              style={{ ...s.btn, ...(chapterFilter === ch ? { background: '#106fa6', color: '#fff' } : {}) }}
              onClick={() => { setChapterFilter(ch); setIdx(0); setFlipped(false); }}
            >
              {ch}
            </button>
          ))}
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', color: '#94a3b8', padding: 30 }}>Đang tải...</div>}

      {!loading && processing && (
        <div style={{ textAlign: 'center', color: '#2563eb', padding: 30, background: '#dbeafe', borderRadius: 10 }}>
          ⏳ AI đang sinh flashcard, vui lòng chờ... (tự cập nhật khi xong)
        </div>
      )}

      {!loading && !processing && visibleCards.length === 0 && (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: 30 }}>
          Tài liệu này chưa có đủ nội dung để sinh flashcard.
        </div>
      )}

      {!loading && !processing && visibleCards.length > 0 && current && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#106fa6' }}>
              {cardChapter || 'Nội dung'}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {idx + 1}/{visibleCards.length}
            </span>
          </div>
          <div style={s.card} onClick={flip}>
            <div style={{ ...s.inner, transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
              <div style={s.face}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 10 }}>
                    Câu hỏi · {typeLabel(current.type)}
                  </div>
                  {current.question}
                </div>
              </div>
              <div style={{ ...s.face, ...s.back }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 10 }}>Trả lời</div>
                  {current.answer}
                </div>
              </div>
            </div>
          </div>

          <div style={s.controls}>
            <button style={s.btn} onClick={() => { setIdx((idx + visibleCards.length - 1) % visibleCards.length); setFlipped(false); }}>
              <ChevronLeft size={16} /> Trước
            </button>
            <button style={s.btn} onClick={flip}><RotateCcw size={16} /> Lật thẻ</button>
            <button style={s.btn} onClick={() => speak(current.question)}><Volume2 size={16} /> Đọc câu hỏi</button>
            <button style={s.btn} onClick={() => speak(current.answer)}><Volume2 size={16} /> Đọc trả lời</button>
            <button style={s.btn} onClick={() => { setIdx((idx + 1) % visibleCards.length); setFlipped(false); }}>
              Sau <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}

      <div style={s.box}>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#106fa6', marginBottom: 10 }}>
          <Plus size={15} style={{ verticalAlign: -2 }} /> Thêm flashcard cá nhân của bạn
        </div>
        <label style={s.label}>Câu hỏi</label>
        <input style={s.input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="VD: Thuật toán FAISS dùng để làm gì?" />
        <label style={s.label}>Trả lời</label>
        <input style={s.input} value={a} onChange={(e) => setA(e.target.value)} placeholder="VD: Tìm kiếm vector khuôn mặt nhanh chóng" />
        <button style={s.btnPrimary} onClick={addPersonal}><Plus size={15} /> Lưu flashcard</button>
      </div>

      {mine.length > 0 && (
        <div style={s.box}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#106fa6', marginBottom: 10 }}>
            Flashcard cá nhân của tôi
          </div>
          {mine.map((c) => (
            <div key={c.card_id} style={{ borderBottom: '1px solid #eef3f7', padding: '8px 0', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <div style={{ fontSize: '0.86rem', color: '#1e3a5f' }}><b>Q:</b> {c.question}</div>
                <div style={{ fontSize: '0.82rem', color: '#475569' }}><b>A:</b> {c.answer}</div>
              </div>
              <button style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} onClick={() => delPersonal(c.card_id)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FlashcardStudy;
