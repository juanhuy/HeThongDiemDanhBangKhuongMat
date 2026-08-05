import React, { useState, useEffect, useRef } from 'react';
import { studentsApi, facultiesApi, majorsApi } from '../../api';
import { buildManualStudentPayload } from '../../utils/studentFormUtils';

const emptyForm = {
  student_id: '',
  full_name: '',
  email: '',
  phone_number: '',
  administrative_class: '',
  major_id: '',
  specialization: '',
  faculty_id: '',
  cohort: '',
  training_program: '',
  academic_status: 'Đang học',
  gender: '',
  citizen_id: '',
  ethnicity: '',
  religion: '',
  nationality: 'Việt Nam',
  place_of_birth: '',
  address: '',
};

export default function StudentsManagement({ showToast }) {
  const [students, setStudents] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [majors, setMajors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterMajor, setFilterMajor] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [createForm, setCreateForm] = useState({ ...emptyForm });
  const [editForm, setEditForm] = useState({
    phone_number: '',
    email: '',
    address: '',
    academic_status: '',
  });

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [stRes, facRes, majRes] = await Promise.all([
        studentsApi.listStudents(),
        facultiesApi.listFaculties(),
        majorsApi.listMajors(),
      ]);
      const list = stRes.data || stRes.items || stRes || [];
      setStudents(Array.isArray(list) ? list : []);
      setFaculties(Array.isArray(facRes) ? facRes : facRes.data || []);
      setMajors(Array.isArray(majRes) ? majRes : majRes.data || []);
    } catch (err) {
      showToast?.(err.message || 'Lỗi tải sinh viên', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filtered = students.filter((s) => {
    const id = (s.student_id || s.mssv || '').toLowerCase();
    const name = (s.full_name || s.ho_ten || '').toLowerCase();
    const lop = (s.administrative_class || s.lop_base || '').toLowerCase();
    const major = (s.major_id || s.major || '').toLowerCase();
    const q = search.toLowerCase();
    if (q && !id.includes(q) && !name.includes(q) && !lop.includes(q)) return false;
    if (filterClass && !lop.includes(filterClass.toLowerCase())) return false;
    if (filterMajor && major !== filterMajor.toLowerCase()) return false;
    return true;
  });

  const openEdit = (s) => {
    setSelected(s);
    setEditForm({
      phone_number: s.phone_number || s.sdt || '',
      email: s.email || '',
      address: s.address || s.dia_chi || '',
      academic_status: s.academic_status || 'Đang học',
    });
    setIsEditOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = buildManualStudentPayload(createForm);
      await studentsApi.createStudent(payload);
      showToast?.('Thêm sinh viên thành công');
      setIsCreateOpen(false);
      setCreateForm({ ...emptyForm });
      fetchAll();
    } catch (err) {
      showToast?.(err.message || 'Lỗi thêm SV', 'danger');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selected) return;
    const id = selected.student_id || selected.mssv;
    try {
      await studentsApi.updateStudent(id, editForm);
      showToast?.('Cập nhật thành công');
      setIsEditOpen(false);
      fetchAll();
    } catch (err) {
      showToast?.(err.message || 'Lỗi cập nhật', 'danger');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Xóa sinh viên ${id}?`)) return;
    try {
      await studentsApi.deleteStudent(id);
      showToast?.('Đã xóa sinh viên');
      fetchAll();
    } catch (err) {
      showToast?.(err.message || 'Lỗi xóa', 'danger');
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: '0.9rem',
    boxSizing: 'border-box',
  };
  const labelStyle = { display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600, color: '#334155' };

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderBottom: '1px solid #e2e8f0' }}>
        <h2 style={{ margin: 0, color: '#106fa6', fontSize: '1.15rem' }}>Quản lý Sinh viên</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="MSSV / Họ tên / Lớp..."
            style={{ ...inputStyle, width: 200 }}
          />
          <input
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            placeholder="Lọc lớp BC"
            style={{ ...inputStyle, width: 120 }}
          />
          <select value={filterMajor} onChange={(e) => setFilterMajor(e.target.value)} style={{ ...inputStyle, width: 160 }}>
            <option value="">Tất cả ngành</option>
            {majors.map((m) => (
              <option key={m.major_id} value={m.major_id}>{m.major_name || m.major_id}</option>
            ))}
          </select>
          <button
            onClick={() => { setCreateForm({ ...emptyForm }); setIsCreateOpen(true); }}
            style={{ padding: '8px 16px', background: '#106fa6', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
          >
            + Thêm SV
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['MSSV', 'Họ tên', 'Lớp BC', 'Ngành', 'Email', 'SĐT', 'Trạng thái', 'Thao tác'].map((h) => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 28, textAlign: 'center', color: '#64748b' }}>Đang tải...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 28, textAlign: 'center', color: '#94a3b8' }}>Không có dữ liệu</td></tr>
            ) : (
              filtered.map((s) => {
                const id = s.student_id || s.mssv;
                return (
                  <tr key={id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0369a1' }}>{id}</td>
                    <td style={{ padding: '10px 12px' }}>{s.full_name || s.ho_ten}</td>
                    <td style={{ padding: '10px 12px' }}>{s.administrative_class || s.lop_base || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{s.major_id || s.major || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{s.email || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{s.phone_number || s.sdt || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 600,
                        background: (s.academic_status || '').includes('học') ? '#dcfce7' : '#f1f5f9',
                        color: (s.academic_status || '').includes('học') ? '#16a34a' : '#64748b',
                      }}>
                        {s.academic_status || 'Đang học'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(s)} style={{ padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#f8fafc', cursor: 'pointer', fontSize: '0.75rem' }}>Sửa</button>
                        <button onClick={() => handleDelete(id)} style={{ padding: '4px 8px', border: '1px solid #fecaca', borderRadius: 6, background: '#fee2e2', color: '#991b1b', cursor: 'pointer', fontSize: '0.75rem' }}>Xóa</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {isCreateOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 560, maxWidth: '100%', maxHeight: '90vh', overflow: 'auto', padding: 24 }}>
            <h3 style={{ margin: '0 0 16px' }}>Thêm sinh viên mới</h3>
            <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['student_id', 'MSSV *', true],
                ['full_name', 'Họ tên *', true],
                ['email', 'Email', false],
                ['phone_number', 'SĐT', false],
                ['administrative_class', 'Lớp biên chế', false],
                ['cohort', 'Niên khóa', false],
                ['specialization', 'Chuyên ngành', false],
                ['training_program', 'Chương trình ĐT', false],
                ['citizen_id', 'CCCD', false],
                ['gender', 'Giới tính', false],
                ['ethnicity', 'Dân tộc', false],
                ['religion', 'Tôn giáo', false],
                ['place_of_birth', 'Nơi sinh', false],
                ['address', 'Địa chỉ', false],
              ].map(([key, label, req]) => (
                <div key={key} style={key === 'address' || key === 'full_name' ? { gridColumn: 'span 2' } : {}}>
                  <label style={labelStyle}>{label}</label>
                  <input
                    required={req}
                    value={createForm[key]}
                    onChange={(e) => setCreateForm({ ...createForm, [key]: key === 'student_id' ? e.target.value.toUpperCase() : e.target.value })}
                    style={inputStyle}
                  />
                </div>
              ))}
              <div>
                <label style={labelStyle}>Ngành</label>
                <select value={createForm.major_id} onChange={(e) => setCreateForm({ ...createForm, major_id: e.target.value })} style={inputStyle}>
                  <option value="">-- Chọn --</option>
                  {majors.map((m) => <option key={m.major_id} value={m.major_id}>{m.major_name || m.major_id}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Khoa</label>
                <select value={createForm.faculty_id} onChange={(e) => setCreateForm({ ...createForm, faculty_id: e.target.value })} style={inputStyle}>
                  <option value="">-- Chọn --</option>
                  {faculties.map((f) => <option key={f.faculty_id} value={f.faculty_id}>{f.faculty_name || f.faculty_id}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button type="button" onClick={() => setIsCreateOpen(false)} style={{ padding: '8px 14px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>Hủy</button>
                <button type="submit" style={{ padding: '8px 14px', border: 'none', borderRadius: 6, background: '#106fa6', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {isEditOpen && selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 400, maxWidth: '100%', padding: 24 }}>
            <h3 style={{ margin: '0 0 16px' }}>Sửa: {selected.student_id || selected.mssv}</h3>
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>SĐT</label>
                <input value={editForm.phone_number} onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Địa chỉ</label>
                <input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Trạng thái học tập</label>
                <select value={editForm.academic_status} onChange={(e) => setEditForm({ ...editForm, academic_status: e.target.value })} style={inputStyle}>
                  <option value="Đang học">Đang học</option>
                  <option value="Bảo lưu">Bảo lưu</option>
                  <option value="Đã tốt nghiệp">Đã tốt nghiệp</option>
                  <option value="Thôi học">Thôi học</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button type="button" onClick={() => setIsEditOpen(false)} style={{ padding: '8px 14px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>Hủy</button>
                <button type="submit" style={{ padding: '8px 14px', border: 'none', borderRadius: 6, background: '#106fa6', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}