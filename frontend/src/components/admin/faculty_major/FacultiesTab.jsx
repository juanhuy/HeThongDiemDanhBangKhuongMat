import React, { useState, useMemo } from 'react';
import { Search, Plus, Edit, X, Upload, CheckCircle, AlertTriangle, PieChart as PieChartIcon, BarChart2, Check, Filter, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, SortAsc, SortDesc, Building } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const styles = {
  btn: { padding: "8px 16px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem", color: "#fff", transition: "all 0.2s" },
  input: { padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.95rem", width: "100%", boxSizing: "border-box" },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", fontSize: "0.95rem" },
  th: { padding: "12px 15px", textAlign: "left", borderBottom: "2px solid #e2e8f0", color: "#475569", fontWeight: "600", whiteSpace: "nowrap", position: "relative" },
  td: { padding: "12px 15px", borderBottom: "1px solid #e2e8f0", verticalAlign: "middle" },
  label: { display: "block", marginBottom: "6px", color: "#334155", fontWeight: "600", fontSize: "0.9rem" },
  badge: { padding: "4px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" },
  chartBox: { background: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", position: "relative" },
  dropdownMenu: { position: "absolute", top: "100%", left: "15px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", zIndex: 20, minWidth: "200px", padding: "8px 0", overflow: "hidden" },
  dropdownItem: { padding: "8px 16px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.85rem", color: "#334155", borderBottom: "1px solid #f1f5f9", background: "transparent", border: "none", width: "100%", textAlign: "left" }
};

export default function FacultiesTab({ API_BASE, showToast, faculties, fetchAllData, loading }) {
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [activeFilterColumn, setActiveFilterColumn] = useState(null);
  const [facultyFilter, setFacultyFilter] = useState({ status: '' });
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [facultyForm, setFacultyForm] = useState({ faculty_id: '', faculty_name: '', office_room: '', phone_number: '', status: 'Active' });

  const stats = useMemo(() => ({
    total: faculties.length,
    active: faculties.filter(f => f.status === 'Active').length
  }), [faculties]);

  const openModal = (f = null) => {
    if (f) {
      setEditingId(f.faculty_id);
      setFacultyForm({ faculty_id: f.faculty_id, faculty_name: f.faculty_name, office_room: f.office_room || '', phone_number: f.phone_number || '', status: f.status || 'Active' });
    } else {
      setEditingId(null);
      setFacultyForm({ faculty_id: '', faculty_name: '', office_room: '', phone_number: '', status: 'Active' });
    }
    setIsModalOpen(true);
  };

  const saveFaculty = async (e) => {
    e.preventDefault();
    try {
      const isEdit = !!editingId;
      const url = isEdit ? `${API_BASE}/api/faculties/${editingId}` : `${API_BASE}/api/faculties/`;
      const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(facultyForm) });
      if (res.ok) {
        showToast?.(isEdit ? "Cập nhật Khoa thành công" : "Thêm Khoa thành công");
        setIsModalOpen(false);
        fetchAllData();
      } else {
        const err = await res.json();
        showToast?.(err.detail || "Lỗi khi lưu Khoa", "error");
      }
    } catch (err) { showToast?.("Lỗi kết nối", "error"); }
  };

  const processedFaculties = useMemo(() => {
    let filtered = faculties.filter(f => 
      (f.faculty_id || '').toLowerCase().includes(search.toLowerCase()) || 
      (f.faculty_name || '').toLowerCase().includes(search.toLowerCase())
    );
    if (facultyFilter.status) filtered = filtered.filter(f => f.status === facultyFilter.status);
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const valA = a[sortConfig.key] || '';
        const valB = b[sortConfig.key] || '';
        const comp = valA.localeCompare(valB, 'vi');
        return sortConfig.direction === 'asc' ? comp : -comp;
      });
    }
    return filtered;
  }, [faculties, search, facultyFilter, sortConfig]);

  const totalPages = Math.ceil(processedFaculties.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = processedFaculties.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: "#ffffff", padding: "15px 20px", borderRadius: "12px", border: "1px solid #e2e8f0", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: "relative", maxWidth: "400px", width: '100%' }}>
          <Search size={18} color="#94a3b8" style={{position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)"}}/>
          <input type="text" placeholder="Tìm kiếm mã hoặc tên Khoa..." style={{ ...styles.input, paddingLeft: "36px" }} value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
        </div>
        <button style={{ ...styles.btn, background: "#106fa6" }} onClick={() => openModal()}>+ Thêm Khoa Mới</button>
      </div>

      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "visible", position: "relative" }}>
        {activeFilterColumn && <div style={{position: "fixed", inset: 0, zIndex: 15}} onClick={() => setActiveFilterColumn(null)} />}
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{...styles.th, width: "60px", textAlign: "center"}}>STT</th>
              <th style={styles.th}>Mã Khoa</th>
              <th style={styles.th}>Tên Khoa</th>
              <th style={styles.th}>Phòng làm việc</th>
              <th style={styles.th}>Điện thoại</th>
              <th style={styles.th}>Trạng thái</th>
              <th style={{...styles.th, textAlign: "center", width: "80px"}}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>Đang tải...</td></tr>
            ) : currentItems.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>Không tìm thấy Khoa nào.</td></tr>
            ) : (
              currentItems.map((f, idx) => (
                <tr key={f.faculty_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{...styles.td, textAlign: 'center'}}>{indexOfFirstItem + idx + 1}</td>
                  <td style={{...styles.td, fontWeight: 700, color: '#106fa6'}}>{f.faculty_id}</td>
                  <td style={{...styles.td, fontWeight: 600}}>{f.faculty_name}</td>
                  <td style={styles.td}>{f.office_room || '—'}</td>
                  <td style={styles.td}>{f.phone_number || '—'}</td>
                  <td style={styles.td}>
                    <span style={{...styles.badge, background: f.status === 'Active' ? '#dcfce7' : '#fef2f2', color: f.status === 'Active' ? '#166534' : '#dc2626'}}>
                      {f.status === 'Active' ? 'Hoạt động' : 'Tạm ngưng'}
                    </span>
                  </td>
                  <td style={{...styles.td, textAlign: 'center'}}>
                    <button onClick={() => openModal(f)} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}>Sửa</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: "blur(2px)" }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 450, padding: 24 }}>
            <h3 style={{ margin: '0 0 16px' }}>{editingId ? "Cập nhật Khoa" : "Thêm Khoa Mới"}</h3>
            <form onSubmit={saveFaculty} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={styles.label}>Mã Khoa *</label><input required disabled={!!editingId} value={facultyForm.faculty_id} onChange={e => setFacultyForm({...facultyForm, faculty_id: e.target.value.toUpperCase()})} style={styles.input} /></div>
              <div><label style={styles.label}>Tên Khoa *</label><input required value={facultyForm.faculty_name} onChange={e => setFacultyForm({...facultyForm, faculty_name: e.target.value})} style={styles.input} /></div>
              <div><label style={styles.label}>Phòng làm việc</label><input value={facultyForm.office_room} onChange={e => setFacultyForm({...facultyForm, office_room: e.target.value})} style={styles.input} /></div>
              <div><label style={styles.label}>Điện thoại</label><input value={facultyForm.phone_number} onChange={e => setFacultyForm({...facultyForm, phone_number: e.target.value})} style={styles.input} /></div>
              <div>
                <label style={styles.label}>Trạng thái</label>
                <select value={facultyForm.status} onChange={e => setFacultyForm({...facultyForm, status: e.target.value})} style={styles.input}>
                  <option value="Active">Hoạt động</option><option value="Inactive">Tạm ngưng</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 14px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer' }}>Hủy</button>
                <button type="submit" style={{ padding: '8px 14px', background: '#106fa6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}