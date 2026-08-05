import React, { useState, useEffect, useRef } from 'react';
import { Layers, UploadCloud, Plus, X, Search, Edit2 } from 'lucide-react';

const MajorsManagement = ({ API_BASE, showToast }) => {
  const [majors, setMajors] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ major_id: '', major_name: '', faculty_id: '', degree_level: 'Bachelors' });
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchMajors();
    fetchFaculties();
  }, []);

  const fetchMajors = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/majors/`);
      if (res.ok) {
        const data = await res.json();
        setMajors(data);
      } else {
        showToast("Lỗi khi tải danh sách Ngành", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Không thể kết nối đến server", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchFaculties = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/faculties/`);
      if (res.ok) {
        const data = await res.json();
        setFaculties(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.major_id || !formData.major_name) {
      showToast("Vui lòng điền đủ thông tin", "error");
      return;
    }
    try {
      const isEdit = !!editingId;
      const url = isEdit ? `${API_BASE}/api/majors/${editingId}` : `${API_BASE}/api/majors/`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
           ...formData,
           faculty_id: formData.faculty_id || null
        })
      });
      if (res.ok) {
        showToast(isEdit ? "Cập nhật Ngành thành công" : "Thêm mới Ngành thành công");
        closeModal();
        fetchMajors();
      } else {
        const err = await res.json();
        showToast(err.detail || (isEdit ? "Lỗi khi cập nhật Ngành" : "Lỗi khi thêm Ngành"), "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Không thể kết nối đến server", "error");
    }
  };

  const openModal = (major = null) => {
    if (major) {
      setEditingId(major.major_id);
      setFormData({
        major_id: major.major_id,
        major_name: major.major_name,
        faculty_id: major.faculty_id || '',
        degree_level: major.degree_level || 'Bachelors'
      });
    } else {
      setEditingId(null);
      setFormData({ major_id: '', major_name: '', faculty_id: '', degree_level: 'Bachelors' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ major_id: '', major_name: '', faculty_id: '', degree_level: 'Bachelors' });
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    try {
      showToast("Đang import dữ liệu...", "info");
      const res = await fetch(`${API_BASE}/api/majors/import/csv`, {
        method: "POST",
        body: form
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message || "Import thành công");
        fetchMajors();
      } else {
        const err = await res.json();
        showToast(err.detail || "Lỗi import", "error");
      }
    } catch (e) {
      showToast("Lỗi kết nối", "error");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const filteredMajors = majors.filter(m => 
    m.major_id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.major_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.faculty_id && m.faculty_id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={{ padding: '1rem', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', minHeight: '80vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#106fa6', margin: 0 }}>
          <Layers size={24} /> Quản lý Ngành Học
        </h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input 
              type="text" 
              placeholder="Tìm kiếm ngành..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '8px 12px 8px 36px', borderRadius: '6px', border: '1px solid #d0e0eb', outline: 'none' }}
            />
          </div>
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCSV} style={{ display: 'none' }} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, color: '#334155' }}
          >
            <UploadCloud size={18} /> Import CSV
          </button>
          <button 
            onClick={() => openModal()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#106fa6', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, color: '#fff' }}
          >
            <Plus size={18} /> Thêm Ngành
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>STT</th>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Mã Ngành</th>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Tên Ngành</th>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Bậc đào tạo</th>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Khoa Quản Lý</th>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Đang tải dữ liệu...</td></tr>
            ) : filteredMajors.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Không tìm thấy Ngành nào.</td></tr>
            ) : (
              filteredMajors.map((m, index) => (
                <tr key={m.major_id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 16px' }}>{index + 1}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{m.major_id}</td>
                  <td style={{ padding: '12px 16px' }}>{m.major_name}</td>
                  <td style={{ padding: '12px 16px' }}>{m.degree_level === 'Bachelors' ? 'Đại học' : m.degree_level === 'Masters' ? 'Thạc sĩ' : m.degree_level === 'College' ? 'Cao đẳng' : m.degree_level}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {m.faculty_id ? (
                      <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                        {faculties.find(f => f.faculty_id === m.faculty_id)?.faculty_name || m.faculty_id}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Chưa cập nhật</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button onClick={() => openModal(m)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', marginRight: '10px' }} title="Xem & Sửa">
                      <Edit2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', width: '400px', maxWidth: '90%', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>{editingId ? "Cập nhật Ngành" : "Thêm Ngành Mới"}</h3>
              <button onClick={() => closeModal()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#334155' }}>Mã Ngành</label>
                <input 
                  type="text" 
                  value={formData.major_id}
                  onChange={(e) => setFormData({...formData, major_id: e.target.value})}
                  placeholder="VD: 7480201"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#334155' }}>Tên Ngành</label>
                <input 
                  type="text" 
                  value={formData.major_name}
                  onChange={(e) => setFormData({...formData, major_name: e.target.value})}
                  placeholder="VD: Công nghệ thông tin"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#334155' }}>Thuộc Khoa (Tùy chọn)</label>
                <select 
                  value={formData.faculty_id}
                  onChange={(e) => setFormData({...formData, faculty_id: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff' }}
                >
                  <option value="">-- Chọn Khoa --</option>
                  {faculties.map(f => (
                    <option key={f.faculty_id} value={f.faculty_id}>{f.faculty_id} - {f.faculty_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#334155' }}>Bậc đào tạo</label>
                <select 
                  value={formData.degree_level}
                  onChange={(e) => setFormData({...formData, degree_level: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff' }}
                >
                  <option value="Bachelors">Đại học</option>
                  <option value="College">Cao đẳng</option>
                  <option value="Masters">Thạc sĩ</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => closeModal()} style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 500 }}>Hủy</button>
                <button type="submit" style={{ padding: '10px 16px', borderRadius: '6px', border: 'none', background: '#106fa6', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>{editingId ? "Cập nhật" : "Thêm mới"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MajorsManagement;
