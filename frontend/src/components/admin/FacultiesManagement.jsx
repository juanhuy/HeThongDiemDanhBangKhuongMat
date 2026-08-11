import React, { useState, useEffect, useRef } from 'react';
import { Building, UploadCloud, Plus, X, Search, Edit2, Trash2 } from 'lucide-react';
import { authFetch } from '../../api/client';

const FacultiesManagement = ({ API_BASE, showToast }) => {
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    faculty_id: '', 
    faculty_name: '',
    dean_id: '',
    office_room: '',
    phone_number: '',
    status: 'Active'
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchFaculties();
  }, []);

  const fetchFaculties = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_BASE}/api/faculties/`);
      if (res.ok) {
        const data = await res.json();
        setFaculties(data);
      } else {
        showToast("Lỗi khi tải danh sách Khoa", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Không thể kết nối đến server", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.faculty_id || !formData.faculty_name) {
      showToast("Vui lòng điền đủ thông tin", "error");
      return;
    }
    try {
      const isEdit = !!editingId;
      const url = isEdit ? `${API_BASE}/api/faculties/${editingId}` : `${API_BASE}/api/faculties/`;
      const method = isEdit ? "PUT" : "POST";
      
      const res = await authFetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        showToast(isEdit ? "Cập nhật Khoa thành công" : "Thêm mới Khoa thành công");
        closeModal();
        fetchFaculties();
      } else {
        const err = await res.json();
        showToast(err.detail || (isEdit ? "Lỗi khi cập nhật Khoa" : "Lỗi khi thêm Khoa"), "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Không thể kết nối đến server", "error");
    }
  };

  const openModal = (faculty = null) => {
    if (faculty) {
      setEditingId(faculty.faculty_id);
      setFormData({
        faculty_id: faculty.faculty_id,
        faculty_name: faculty.faculty_name,
        dean_id: faculty.dean_id || '',
        office_room: faculty.office_room || '',
        phone_number: faculty.phone_number || '',
        status: faculty.status || 'Active'
      });
    } else {
      setEditingId(null);
      setFormData({ 
        faculty_id: '', faculty_name: '', dean_id: '', office_room: '', phone_number: '', status: 'Active' 
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ 
        faculty_id: '', faculty_name: '', dean_id: '', office_room: '', phone_number: '', status: 'Active' 
    });
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    try {
      showToast("Đang import dữ liệu...", "info");
      const res = await authFetch(`${API_BASE}/api/faculties/import/csv`, {
        method: "POST",
        body: form
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message || "Import thành công");
        fetchFaculties();
      } else {
        const err = await res.json();
        showToast(err.detail || "Lỗi import", "error");
      }
    } catch (e) {
      showToast("Lỗi kết nối", "error");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const filteredFaculties = faculties.filter(f => 
    f.faculty_id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.faculty_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '1rem', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', minHeight: '80vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#106fa6', margin: 0 }}>
          <Building size={24} /> Quản lý Khoa
        </h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input 
              type="text" 
              placeholder="Tìm kiếm khoa..."
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
            <Plus size={18} /> Thêm Khoa
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>STT</th>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Mã Khoa</th>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Tên Khoa</th>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Phòng làm việc</th>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Điện thoại</th>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Trạng thái</th>
              <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Đang tải dữ liệu...</td></tr>
            ) : filteredFaculties.length === 0 ? (
              <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Không tìm thấy Khoa nào.</td></tr>
            ) : (
              filteredFaculties.map((f, index) => (
                <tr key={f.faculty_id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 16px' }}>{index + 1}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{f.faculty_id}</td>
                  <td style={{ padding: '12px 16px' }}>{f.faculty_name}</td>
                  <td style={{ padding: '12px 16px' }}>{f.office_room || '-'}</td>
                  <td style={{ padding: '12px 16px' }}>{f.phone_number || '-'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem',
                      backgroundColor: f.status === 'Active' ? '#dcfce7' : '#fee2e2',
                      color: f.status === 'Active' ? '#166534' : '#991b1b'
                    }}>
                      {f.status === 'Active' ? 'Đang hoạt động' : 'Tạm ngưng'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button onClick={() => openModal(f)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', marginRight: '10px' }} title="Xem & Sửa">
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
              <h3 style={{ margin: 0, color: '#0f172a' }}>{editingId ? "Cập nhật Khoa" : "Thêm Khoa Mới"}</h3>
              <button onClick={() => closeModal()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#334155' }}>Mã Khoa</label>
                <input 
                  type="text" 
                  value={formData.faculty_id}
                  onChange={(e) => setFormData({...formData, faculty_id: e.target.value.toUpperCase()})}
                  placeholder="VD: FIT2"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#334155' }}>Tên Khoa</label>
                <input 
                  type="text" 
                  value={formData.faculty_name}
                  onChange={(e) => setFormData({...formData, faculty_name: e.target.value})}
                  placeholder="VD: Công nghệ thông tin"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#334155' }}>Văn phòng Khoa</label>
                <input 
                  type="text" 
                  value={formData.office_room}
                  onChange={(e) => setFormData({...formData, office_room: e.target.value})}
                  placeholder="VD: Phòng 2A01"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#334155' }}>Điện thoại</label>
                <input 
                  type="text" 
                  value={formData.phone_number}
                  onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                  placeholder="VD: 02838290001"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#334155' }}>Trạng thái</label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff' }}
                >
                  <option value="Active">Đang hoạt động</option>
                  <option value="Inactive">Tạm ngưng</option>
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

export default FacultiesManagement;
