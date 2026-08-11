import React, { useState, useEffect } from 'react';
import { Upload, FileText, ArrowLeft, Loader2 } from 'lucide-react';
import { documentsApi } from '../../api';

const s = {
  panel: { display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 720 },
  title: { fontSize: '1.25rem', fontWeight: '700', color: '#106fa6', display: 'flex', alignItems: 'center', gap: '8px' },
  back: { background: 'none', border: 'none', color: '#106fa6', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px', padding: 0 },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '0.82rem', fontWeight: 600, color: '#334155' },
  input: { padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbdbe8', fontSize: '0.87rem', background: '#fff', outline: 'none' },
  textarea: { padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbdbe8', fontSize: '0.87rem', background: '#fff', minHeight: 90, resize: 'vertical', outline: 'none', fontFamily: 'inherit' },
  drop: { border: '2px dashed #a8c6dd', borderRadius: '12px', padding: '28px', textAlign: 'center', color: '#64748b', background: '#f8fbfd', cursor: 'pointer' },
  btnPrimary: { background: '#106fa6', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' },
  note: { fontSize: '0.75rem', color: '#64748b' },
};

const DocumentUpload = ({ user, showToast, onBack, onUploaded }) => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    documentsApi.documentSubjects().then((d) => setSubjects(d.subjects || [])).catch(() => {});
  }, []);

  const pick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ok = /\.(pdf|docx)$/i.test(f.name);
    if (!ok) {
      showToast?.('Chỉ hỗ trợ file PDF (.pdf) hoặc Word (.docx)', 'danger');
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      showToast?.('File vượt quá 20MB', 'danger');
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  const submit = async () => {
    if (!file) { showToast?.('Vui lòng chọn file tài liệu.', 'danger'); return; }
    if (!title.trim()) { showToast?.('Vui lòng nhập tiêu đề.', 'danger'); return; }
    setSubmitting(true);
    try {
      const res = await documentsApi.uploadDocument({
        file, title: title.trim(), description: description.trim(), subject_id: subjectId || undefined,
      });
      showToast?.('Đăng tải thành công! AI đang phân tích nội dung trong nền...', 'success');
      onUploaded?.(res.document?.document_id);
    } catch (e) {
      if (e?.message === 'Failed to fetch' || e?.name === 'TypeError' || e?.status === undefined) {
        showToast?.('Không kết nối được máy chủ. Vui lòng kiểm tra backend đang chạy tại http://127.0.0.1:8000', 'danger');
      } else {
        showToast?.(e.message || 'Đăng tải thất bại', 'danger');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={s.panel}>
      <button style={s.back} onClick={onBack}><ArrowLeft size={15} /> Quay lại thư viện</button>
      <h3 style={s.title}><Upload size={22} /> Đăng tải tài liệu</h3>

      <div style={s.drop} onClick={() => document.getElementById('doc-file-input').click()}>
        {file ? (
          <div style={{ color: '#106fa6', fontWeight: 600 }}>
            <FileText size={26} style={{ marginBottom: 6 }} />
            <div>{file.name}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{(file.size / 1024).toFixed(1)} KB</div>
          </div>
        ) : (
          <>
            <FileText size={30} style={{ marginBottom: 6 }} />
            <div>Kéo thả hoặc bấm chọn file PDF / Word (.docx)</div>
            <div style={{ fontSize: '0.75rem', marginTop: 4 }}>Tối đa 20MB</div>
          </>
        )}
      </div>
      <input id="doc-file-input" type="file" accept=".pdf,.docx" style={{ display: 'none' }} onChange={pick} />

      <div style={s.field}>
        <label style={s.label}>Tiêu đề *</label>
        <input style={s.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Bài giảng Chương 2 - Mạng máy tính" />
      </div>

      <div style={s.field}>
        <label style={s.label}>Mô tả</label>
        <textarea style={s.textarea} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả ngắn về tài liệu (tùy chọn)" />
      </div>

      <div style={s.field}>
        <label style={s.label}>Liên kết môn học (tùy chọn)</label>
        <select style={s.input} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          <option value="">-- Chọn môn học --</option>
          {subjects.map((sb) => (
            <option key={sb.subject_id} value={sb.subject_id}>{sb.subject_id} - {sb.subject_name}</option>
          ))}
        </select>
      </div>

      <div style={s.note}>
        Sau khi đăng tải, hệ thống AI sẽ tự động trích xuất nội dung, gắn thẻ, tóm tắt và tạo flashcard.
        {user?.role === 'sinh_vien' ? ' Tài liệu của sinh viên sẽ được quản trị viên duyệt trước khi xuất hiện công khai.' : ' Tài liệu của giảng viên được xuất bản ngay lập tức.'}
      </div>

      <button style={s.btnPrimary} onClick={submit} disabled={submitting}>
        {submitting ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
        {submitting ? 'Đang xử lý & phân tích AI...' : 'Đăng tải'}
      </button>
    </div>
  );
};

export default DocumentUpload;
