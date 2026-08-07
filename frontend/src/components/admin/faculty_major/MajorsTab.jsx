import React, { useState, useMemo } from 'react';
import { Search, Plus, Edit, X, Upload, CheckCircle, AlertTriangle, PieChart as PieChartIcon, BarChart2, Check, Filter, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, SortAsc, SortDesc, Layers } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const styles = {
  btn: { padding: "8px 16px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem", color: "#fff", transition: "all 0.2s" },
  input: { padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.95rem", width: "100%", boxSizing: "border-box" },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", fontSize: "0.95rem" },
  th: { padding: "12px 15px", textAlign: "left", borderBottom: "2px solid #e2e8f0", color: "#475569", fontWeight: "600", whiteSpace: "nowrap", position: "relative" },
  td: { padding: "12px 15px", borderBottom: "1px solid #e2e8f0", verticalAlign: "middle" },
  label: { display: "block", marginBottom: "6px", color: "#334155", fontWeight: "600", fontSize: "0.9rem" },
  badge: { padding: "4px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" },
};

export default function MajorsTab({ API_BASE, showToast, majors, faculties, fetchAllData, loading }) {
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [activeFilterColumn, setActiveFilterColumn] = useState(null);
  const [majorFilter, setMajorFilter] = useState({ faculty_id: '', degree_level: '' });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [majorForm, setMajorForm] = useState({ major_id: '', major_name: '', faculty_id: '', degree_level: 'Bachelors' });

  const openModal = (m = null) => {
    if (m) {
      setEditingId(m.major_id);
      setMajorForm({ major_id: m.major_id, major_name: m.major_name, faculty_id: m.faculty_id || '', degree_level: m.degree_level || 'Bachelors' });
    } else {
      setEditingId(null);
      setMajorForm({ major_id: '', major_name: '', faculty_id: '', degree_level: 'Bachelors' });
    }
    setIsModalOpen(true);
  };

  const saveMajor = async (e) => {
    e.preventDefault();
    try {
      const isEdit = !!editingId;
      const url = isEdit ? `${API_BASE}/api/majors/${editingId}` : `${API_BASE}/api/majors/`;
      const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({...majorForm, faculty_id: majorForm.faculty_id || null}) });
      if (res.ok) {
        showToast?.(isEdit ? "Cập nhật Ngành thành công" : "Thêm Ngành thành công");
        setIsModalOpen(false);
        fetchAllData();
      } else {
        const err = await res.json();
        showToast?.(err.detail || "Lỗi khi lưu Ngành", "error");
      }
    } catch (err) { showToast?.("Lỗi kết nối", "error"); }
  };

  const processedMajors = useMemo(() => {
    let filtered = majors.filter(m => 
      (m.major_id || '').toLowerCase().includes(search.toLowerCase()) || 
      (m.major_name || '').toLowerCase().includes(search.toLowerCase())
    );
    if (majorFilter.faculty_id) filtered = filtered.filter(m => m.faculty_id === majorFilter.faculty_id);
    if (majorFilter.degree_level) filtered = filtered.filter(m => m.degree_level === majorFilter.degree_level);
    return filtered;
  }, [majors, search, majorFilter]);

  const totalPages = Math.ceil(processedMajors.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = processedMajors.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: "#ffffff", padding: "15px 20px", borderRadius: "12px", border: "1px solid #e2e8f0", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: "relative", maxWidth: "400px", width: '100%' }}>
          <Search size={18} color="#94a3b8" style={{position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)"}}/>
          <input type="text" placeholder="Tìm kiếm mã hoặc tên Ngành..." style={{ ...styles.input, paddingLeft: "36px" }} value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
        </div>
        <button style={{ ...styles.btn, background: "#106fa6" }} onClick={() => openModal()}>+ Thêm Ngành Mới</button>
      </div>

      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "visible" }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{...styles.th, width: "60px", textAlign: "center"}}>STT</th>
              <th style={styles.th}>Mã Ngành</th>
              <th style={styles.th}>Tên Ngành</th>
              <th style={styles.th}>Bậc đào tạo</th>
              <th style={styles.th}>Khoa Quản Lý</th>
              <th style={{...styles.th, textAlign: "center", width: "80px"}}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>Đang tải...</td></tr>
            ) : currentItems.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>Không tìm thấy Ngành nào.</td></tr>
            ) : (
              currentItems.map((m, idx) => (
                <tr key={m.major_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{...styles.td, textAlign: 'center'}}>{indexOfFirstItem + idx + 1}</td>
                  <td style={{...styles.td, fontWeight: 700, color: '#106fa6'}}>{m.major_id}</td>
                  <td style={{...styles.td, fontWeight: 600}}>{m.major_name}</td>
                  <td style={styles.td}>{m.degree_level === 'Bachelors' ? 'Đại học' : m.degree_level === 'Masters' ? 'Thạc sĩ' : 'Cao đẳng'}</td>
                  <td style={styles.td}>{faculties.find(f => f.faculty_id === m.faculty_id)?.faculty_name || m.faculty_id || 'Chưa phân khoa'}</td>
                  <td style={{...styles.td, textAlign: 'center'}}>
                    <button onClick={() => openModal(m)} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}>Sửa</button>
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
            <h3 style={{ margin: '0 0 16px' }}>{editingId ? "Cập nhật Ngành" : "Thêm Ngành Mới"}</h3>
            <form onSubmit={saveMajor} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={styles.label}>Mã Ngành *</label><input required disabled={!!editingId} value={majorForm.major_id} onChange={e => setMajorForm({...majorForm, major_id: e.target.value.toUpperCase()})} style={styles.input} /></div>
              <div><label style={styles.label}>Tên Ngành *</label><input required value={majorForm.major_name} onChange={e => setMajorForm({...majorForm, major_name: e.target.value})} style={styles.input} /></div>
              <div>
                <label style={styles.label}>Thuộc Khoa</label>
                <select value={majorForm.faculty_id} onChange={e => setMajorForm({...majorForm, faculty_id: e.target.value})} style={styles.input}>
                  <option value="">-- Chọn Khoa --</option>
                  {faculties.map(f => <option key={f.faculty_id} value={f.faculty_id}>{f.faculty_name}</option>)}
                </select>
              </div>
              <div>
                <label style={styles.label}>Bậc đào tạo</label>
                <select value={majorForm.degree_level} onChange={e => setMajorForm({...majorForm, degree_level: e.target.value})} style={styles.input}>
                  <option value="Bachelors">Đại học</option><option value="College">Cao đẳng</option><option value="Masters">Thạc sĩ</option>
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