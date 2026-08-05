import React, { useState, useEffect } from 'react';
import { subjectsApi, facultiesApi } from '../../api';

export default function SubjectsManagement({ showToast }) {
  const [subjects, setSubjects] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    subject_id: '',
    subject_name: '',
    theory_credits: 0,
    practical_credits: 0,
    faculty_id: '',
    is_active: true,
  });

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [subRes, facRes] = await Promise.all([
        subjectsApi.listSubjects(),
        facultiesApi.listFaculties(),
      ]);
      setSubjects(subRes.data || subRes || []);
      setFaculties(Array.isArray(facRes) ? facRes : facRes.data || []);
    } catch (err) {
      showToast?.(err.message || 'Lỗi tải môn học', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const openModal = (s = null) => {
    if (s) {
      setEditingId(s.subject_id);
      setForm({
        subject_id: s.subject_id,
        subject_name: s.subject_name || '',
        theory_credits: s.theory_credits || 0,
        practical_credits: s.practical_credits || 0,
        faculty_id: s.faculty_id || '',
        is_active: s.is_active !== false,
      });
    } else {
      setEditingId(null);
      setForm({ subject_id: '', subject_name: '', theory_credits: 0, practical_credits: 0, faculty_id: '', is_active: true });
    }
    setIsOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await subjectsApi.updateSubject(editingId, form);
        showToast?.('Cập nhật môn học thành công');
      } else {
        await subjectsApi.createSubject(form);
        showToast?.('Thêm môn học thành công');
      }
      setIsOpen(false);
      fetchAll();
    } catch (err) {
      showToast?.(err.message || 'Lỗi lưu môn học', 'danger');
    }
  };

  const filtered = subjects.filter(
    (s) =>
      (s.subject_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.subject_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, color: '#106fa6', fontSize: '1.15rem' }}>Quản lý Môn học</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm mã / tên môn..."
            style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, minWidth: 200 }}
          />
          <button
            onClick={() => openModal()}
            style={{ padding: '8px 16px', background: '#106fa6', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
          >
            + Thêm môn
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Mã môn', 'Tên môn', 'LT', 'TH', 'Khoa', 'Trạng thái', 'Thao tác'].map((h) => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Đang tải...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Không có dữ liệu</td></tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.subject_id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0369a1' }}>{s.subject_id}</td>
                  <td style={{ padding: '10px 14px' }}>{s.subject_name}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>{s.theory_credits ?? 0}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>{s.practical_credits ?? 0}</td>
                  <td style={{ padding: '10px 14px' }}>{s.faculty_id || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 600,
                      background: s.is_active !== false ? '#dcfce7' : '#fee2e2',
                      color: s.is_active !== false ? '#16a34a' : '#dc2626',
                    }}>
                      {s.is_active !== false ? 'Active' : 'Ngưng'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => openModal(s)} style={{ padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#f8fafc', cursor: 'pointer', fontSize: '0.75rem' }}>
                      Sửa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 420, maxWidth: '100%', padding: 24 }}>
            <h3 style={{ margin: '0 0 16px' }}>{editingId ? 'Cập nhật môn học' : 'Thêm môn học'}</h3>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Mã môn *</label>
                <input required disabled={!!editingId} value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value.toUpperCase() })}
                  style={{ width: '100%', padding: 10, border: '1px solid #cbd5e1', borderRadius: 6, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Tên môn *</label>
                <input required value={form.subject_name} onChange={(e) => setForm({ ...form, subject_name: e.target.value })}
                  style={{ width: '100%', padding: 10, border: '1px solid #cbd5e1', borderRadius: 6, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>TC Lý thuyết</label>
                  <input type="number" min={0} value={form.theory_credits} onChange={(e) => setForm({ ...form, theory_credits: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: 10, border: '1px solid #cbd5e1', borderRadius: 6, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>TC Thực hành</label>
                  <input type="number" min={0} value={form.practical_credits} onChange={(e) => setForm({ ...form, practical_credits: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: 10, border: '1px solid #cbd5e1', borderRadius: 6, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Khoa</label>
                <select value={form.faculty_id} onChange={(e) => setForm({ ...form, faculty_id: e.target.value })}
                  style={{ width: '100%', padding: 10, border: '1px solid #cbd5e1', borderRadius: 6 }}>
                  <option value="">-- Chọn khoa --</option>
                  {faculties.map((f) => (
                    <option key={f.faculty_id} value={f.faculty_id}>{f.faculty_id} – {f.faculty_name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button type="button" onClick={() => setIsOpen(false)} style={{ padding: '8px 14px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>Hủy</button>
                <button type="submit" style={{ padding: '8px 14px', border: 'none', borderRadius: 6, background: '#106fa6', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}