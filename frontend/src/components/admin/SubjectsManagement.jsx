import React, { useState, useEffect, useRef, useMemo } from 'react';
import { subjectsApi, facultiesApi } from '../../api';
import { Search, Plus, Trash2, Edit, X, Upload, CheckCircle, AlertTriangle, PieChart as PieChartIcon, BarChart2, Check, Menu, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, SortAsc, SortDesc, Book, Activity, Layers, BookOpen } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const styles = {
  btn: { padding: "8px 16px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem", color: "#fff", transition: "all 0.2s" },
  input: { padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.95rem", width: "100%", boxSizing: "border-box" },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", fontSize: "0.95rem" },
  th: { padding: "12px 15px", textAlign: "left", borderBottom: "2px solid #e2e8f0", color: "#475569", fontWeight: "600", whiteSpace: "nowrap", position: "relative" },
  td: { padding: "12px 15px", borderBottom: "1px solid #e2e8f0", verticalAlign: "middle" },
  label: { display: "block", marginBottom: "6px", color: "#334155", fontWeight: "600", fontSize: "0.9rem" },
  badge: { padding: "4px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" },
  statCard: { background: "#fff", padding: "15px 20px", borderRadius: "12px", border: "1px solid #e2e8f0", flex: 1, minWidth: "200px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  statValue: { fontSize: "1.8rem", fontWeight: "700", color: "#0f172a", margin: "8px 0 2px 0" },
  statTitle: { color: "#64748b", fontSize: "0.9rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" },
  chartBox: { background: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", position: "relative" },
  dropdownMenu: { position: "absolute", top: "100%", left: "15px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", zIndex: 20, minWidth: "200px", padding: "8px 0", overflow: "hidden" },
  dropdownItem: { padding: "8px 16px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.85rem", color: "#334155", borderBottom: "1px solid #f1f5f9", background: "transparent", border: "none", width: "100%", textAlign: "left" }
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#64748b'];

export default function SubjectsManagement({ showToast }) {
  const [subjects, setSubjects] = useState([]);
  const [faculties, setFaculties] = useState([]);
  
  // Trạng thái Tìm kiếm, Sắp xếp & Lọc
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'updated_at', direction: 'desc' });
  const [filters, setFilters] = useState({ faculty_id: '', is_active: '' });
  const [activeFilterColumn, setActiveFilterColumn] = useState(null);
  
  // Trạng thái Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    subject_id: '', subject_name: '', theory_credits: 0, practical_credits: 0, faculty_id: '', is_active: true,
    major_ids: '', subject_type: 'Bắt buộc',
  });

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [subRes, facRes] = await Promise.all([subjectsApi.listSubjects(), facultiesApi.listFaculties()]);
      setSubjects(subRes.data || subRes || []);
      setFaculties(Array.isArray(facRes) ? facRes : facRes.data || []);
    } catch (err) {
      showToast?.(err.message || 'Lỗi tải dữ liệu', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // --- THỐNG KÊ (KPIs) ---
  const stats = useMemo(() => {
    let totalCredits = 0;
    let practicalCount = 0;
    subjects.forEach(s => {
      totalCredits += (s.theory_credits || 0) + (s.practical_credits || 0);
      if ((s.practical_credits || 0) > 0) practicalCount++;
    });

    return {
      total: subjects.length,
      active: subjects.filter(s => s.is_active !== false).length,
      totalCredits,
      practicalCount
    };
  }, [subjects]);

  // --- BIỂU ĐỒ ---
  const chartData = useMemo(() => {
    const statusCounts = { 'Hoạt động': 0, 'Ngưng giảng dạy': 0 };
    const facultyMap = {};

    subjects.forEach(s => {
      s.is_active !== false ? statusCounts['Hoạt động']++ : statusCounts['Ngưng giảng dạy']++;
      const facId = s.faculty_id || 'Khác';
      if (!facultyMap[facId]) facultyMap[facId] = { name: facId, count: 0 };
      facultyMap[facId].count += 1;
    });

    const statusList = Object.keys(statusCounts).map((key, idx) => ({ name: key, value: statusCounts[key], color: key === 'Hoạt động' ? '#10b981' : '#ef4444' }));
    const facultiesList = Object.values(facultyMap).sort((a, b) => b.count - a.count);

    return { statusList, facultiesList };
  }, [subjects]);

  const uniqueFaculties = useMemo(() => {
    return [...new Set(subjects.map(s => s.faculty_id).filter(Boolean))];
  }, [subjects]);

  const openModal = (s = null) => {
    if (s) {
      setEditingId(s.subject_id);
      setForm({
        subject_id: s.subject_id, subject_name: s.subject_name || '', theory_credits: s.theory_credits || 0,
        practical_credits: s.practical_credits || 0, faculty_id: s.faculty_id || '', is_active: s.is_active !== false,
        major_ids: s.major_ids || '', subject_type: s.subject_type || 'Bắt buộc',
      });
    } else {
      setEditingId(null);
      setForm({ subject_id: '', subject_name: '', theory_credits: 0, practical_credits: 0, faculty_id: '', is_active: true, major_ids: '', subject_type: 'Bắt buộc' });
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
      setSortConfig({ key: 'updated_at', direction: 'desc' });
      fetchAll();
    } catch (err) {
      showToast?.(err.message || 'Lỗi lưu môn học', 'danger');
    }
  };

  const handleImportCsv = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      setIsImporting(true);
      const prevCount = subjects.length;
      const response = await subjectsApi.importCsv(formData);
      const subRes = await subjectsApi.listSubjects();
      const newData = subRes.data || subRes || [];
      setSubjects(newData);
      const importedCount = response?.data?.importedCount || (newData.length - prevCount);
      const countMsg = importedCount > 0 ? ` (${importedCount} dòng dữ liệu)` : '';
      showToast?.(`Import thành công${countMsg}!`);
      setSortConfig({ key: 'updated_at', direction: 'desc' });
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Import thất bại. Vui lòng kiểm tra lại file CSV.';
      showToast?.(errorMessage, 'danger');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };

  // --- XỬ LÝ LỌC & SẮP XẾP ---
  const handleSort = (key, forcedDirection = null) => {
    let direction = forcedDirection;
    if (!direction) {
      direction = (sortConfig.key === key && sortConfig.direction === 'asc') ? 'desc' : 'asc';
    }
    setSortConfig({ key, direction });
    setActiveFilterColumn(null);
    setCurrentPage(1);
  };

  const handleFilter = (type, value) => {
    setFilters(prev => ({ ...prev, [type]: value }));
    setActiveFilterColumn(null);
    setCurrentPage(1);
  };

  const processedData = useMemo(() => {
    let filtered = subjects.filter(s =>
      (s.subject_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.subject_name || '').toLowerCase().includes(search.toLowerCase())
    );

    if (filters.faculty_id !== '') filtered = filtered.filter(s => s.faculty_id === filters.faculty_id);
    if (filters.is_active !== '') {
      const isActive = filters.is_active === 'true';
      filtered = filtered.filter(s => s.is_active === isActive);
    }

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let valA = a[sortConfig.key] ?? '';
        let valB = b[sortConfig.key] ?? '';
        if (sortConfig.key === 'updated_at' || sortConfig.key === 'created_at') {
           valA = new Date(valA).getTime() || 0;
           valB = new Date(valB).getTime() || 0;
        } else if (typeof valA === 'string') {
           return sortConfig.direction === 'asc' ? valA.localeCompare(valB, 'vi') : valB.localeCompare(valA, 'vi');
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [subjects, search, filters, sortConfig]);

  // --- PHÂN TRANG ---
  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = processedData.slice(indexOfFirstItem, indexOfLastItem);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    let pages = [];
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    for (let i = startPage; i <= endPage; i++) pages.push(i);

    const btnStyle = { display: "flex", alignItems: "center", justifyContent: "center", minWidth: "32px", height: "32px", padding: "0 8px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", color: "#475569", fontWeight: "500", transition: "all 0.2s", fontSize: "0.85rem" };
    const activeBtnStyle = { ...btnStyle, background: "#106fa6", color: "#fff", borderColor: "#106fa6" };
    const disabledBtnStyle = { ...btnStyle, opacity: 0.5, cursor: "not-allowed", background: "#f8fafc" };

    return (
      <div style={{ padding: "12px 20px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
        <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
          Hiển thị <span style={{fontWeight: 600, color: "#334155"}}>{indexOfFirstItem + 1}</span> - <span style={{fontWeight: 600, color: "#334155"}}>{Math.min(indexOfLastItem, processedData.length)}</span> trong tổng <span style={{fontWeight: 600, color: "#334155"}}>{processedData.length}</span> môn học
        </div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(1)} style={currentPage === 1 ? disabledBtnStyle : btnStyle} title="Trang đầu"><ChevronsLeft size={16}/></button>
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} style={currentPage === 1 ? disabledBtnStyle : btnStyle} title="Trang trước"><ChevronLeft size={16}/></button>
          {startPage > 1 && (<><button onClick={() => setCurrentPage(1)} style={btnStyle}>1</button>{startPage > 2 && <span style={{ color: "#94a3b8", padding: "0 4px" }}>...</span>}</>)}
          {pages.map(page => (<button key={page} onClick={() => setCurrentPage(page)} style={currentPage === page ? activeBtnStyle : btnStyle}>{page}</button>))}
          {endPage < totalPages && (<>{endPage < totalPages - 1 && <span style={{ color: "#94a3b8", padding: "0 4px" }}>...</span>}<button onClick={() => setCurrentPage(totalPages)} style={btnStyle}>{totalPages}</button></>)}
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} style={currentPage === totalPages ? disabledBtnStyle : btnStyle} title="Trang sau"><ChevronRight size={16}/></button>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)} style={currentPage === totalPages ? disabledBtnStyle : btnStyle} title="Trang cuối"><ChevronsRight size={16}/></button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {/* 1. HEADER & ACTIONS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff", padding: "15px 20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Book size={26} color="#106fa6" />
          <h2 style={{ fontSize: "1.3rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>Quản lý Môn học</h2>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCsv} style={{ display: 'none' }} />
          <button 
             style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, color: '#334155' }} 
            onClick={() => fileInputRef.current?.click()} disabled={isImporting}
          >
            <Upload size={18} /> {isImporting ? 'Đang Import...' : 'Import CSV'}
          </button>
          <button style={{ ...styles.btn, background: "#106fa6", display: "flex", alignItems: "center", gap: "6px" }} onClick={() => openModal()}>
            <Plus size={18} /> Thêm môn học
          </button>
        </div>
      </div>

      {/* 2. THẺ KPI (TOP CARDS) */}
      <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
        <div style={styles.statCard}>
          <div style={styles.statTitle}><BookOpen size={18} color="#3b82f6"/> Tổng môn học</div>
          <div style={styles.statValue}>{stats.total}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statTitle}><Activity size={18} color="#10b981"/> Đang hoạt động</div>
          <div style={styles.statValue}>{stats.active} <span style={{fontSize:"1rem", color:"#94a3b8", fontWeight:"normal"}}>/ {stats.total}</span></div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statTitle}><Layers size={18} color="#8b5cf6"/> Tổng khối lượng Tín chỉ</div>
          <div style={styles.statValue}>{stats.totalCredits}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statTitle}><Book size={18} color="#f59e0b"/> Môn có phần Thực hành</div>
          <div style={styles.statValue}>{stats.practicalCount}</div>
        </div>
      </div>

      {/* 3. CHARTS DASHBOARD */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px" }}>
        <div style={styles.chartBox}>
          <h4 style={{ margin: "0 0 15px 0", color: "#334155", display: "flex", alignItems: "center", gap: "6px", fontSize: "1.05rem" }}>
            <PieChartIcon size={18} color="#64748b"/> Tỷ lệ Trạng thái Môn học
          </h4>
          <div style={{ width: "100%", height: "260px" }}>
            {chartData.statusList.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData.statusList} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value">
                    {chartData.statusList.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} môn`, 'Số lượng']} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}/>
                  <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                </PieChart>
              </ResponsiveContainer>
            ) : (<div style={{height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8"}}>Chưa có dữ liệu</div>)}
          </div>
        </div>

        <div style={styles.chartBox}>
          <h4 style={{ margin: "0 0 15px 0", color: "#334155", display: "flex", alignItems: "center", gap: "6px", fontSize: "1.05rem" }}>
            <BarChart2 size={18} color="#64748b"/> Số lượng Môn học theo Khoa
          </h4>
          <div style={{ width: "100%", height: "230px", marginTop: "10px" }}>
            {chartData.facultiesList.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.facultiesList} margin={{ top: 10, right: 10, left: -20, bottom: 45 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 11}} interval={0} angle={-30} textAnchor="end" />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }} formatter={(value) => [`${value} môn`, 'Số lượng']}/>
                  <Bar dataKey="count" name="Môn học" fill="#106fa6" radius={[4, 4, 0, 0]} barSize={35} />
                </BarChart>
              </ResponsiveContainer>
            ) : (<div style={{height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8"}}>Chưa có dữ liệu</div>)}
          </div>
        </div>
      </div>

      {/* 4. DANH SÁCH BẢNG */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "visible", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", position: "relative" }}>
        
        {/* Overlay ẩn dropdown khi click ra ngoài */}
        {activeFilterColumn && <div style={{position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 15}} onClick={() => setActiveFilterColumn(null)} />}

        <div style={{ padding: "15px 20px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <div style={{position: "relative", maxWidth: "400px"}}>
            <Search size={18} color="#94a3b8" style={{position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)"}}/>
            <input 
              type="text" 
              placeholder="Tìm kiếm theo mã môn, tên môn..." 
              style={{ ...styles.input, paddingLeft: "36px" }}
              value={search} 
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} 
            />
          </div>
        </div>
        
        <div style={{ overflowX: "visible", minHeight: "350px" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{...styles.th, width: "60px", textAlign: "center"}}>STT</th>
                
                {/* COLUMN: MÃ MÔN */}
                <th style={styles.th}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", userSelect: "none" }} onClick={() => setActiveFilterColumn(activeFilterColumn === 'subject_id' ? null : 'subject_id')}>
                    Mã môn <Filter size={14} color={sortConfig.key === 'subject_id' ? '#106fa6' : '#94a3b8'}/>
                  </div>
                  {activeFilterColumn === 'subject_id' && (
                    <div style={styles.dropdownMenu}>
                      <button style={styles.dropdownItem} onClick={() => handleSort('subject_id', 'asc')} onMouseOver={e=>e.currentTarget.style.background="#f1f5f9"} onMouseOut={e=>e.currentTarget.style.background="transparent"}><SortAsc size={16} color="#64748b"/> Sắp xếp A - Z</button>
                      <button style={styles.dropdownItem} onClick={() => handleSort('subject_id', 'desc')} onMouseOver={e=>e.currentTarget.style.background="#f1f5f9"} onMouseOut={e=>e.currentTarget.style.background="transparent"}><SortDesc size={16} color="#64748b"/> Sắp xếp Z - A</button>
                    </div>
                  )}
                </th>

                {/* COLUMN: TÊN MÔN */}
                <th style={styles.th}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", userSelect: "none" }} onClick={() => setActiveFilterColumn(activeFilterColumn === 'subject_name' ? null : 'subject_name')}>
                    Tên môn <Filter size={14} color={sortConfig.key === 'subject_name' ? '#106fa6' : '#94a3b8'}/>
                  </div>
                  {activeFilterColumn === 'subject_name' && (
                    <div style={styles.dropdownMenu}>
                      <button style={styles.dropdownItem} onClick={() => handleSort('subject_name', 'asc')} onMouseOver={e=>e.currentTarget.style.background="#f1f5f9"} onMouseOut={e=>e.currentTarget.style.background="transparent"}><SortAsc size={16} color="#64748b"/> Sắp xếp A - Z</button>
                      <button style={styles.dropdownItem} onClick={() => handleSort('subject_name', 'desc')} onMouseOver={e=>e.currentTarget.style.background="#f1f5f9"} onMouseOut={e=>e.currentTarget.style.background="transparent"}><SortDesc size={16} color="#64748b"/> Sắp xếp Z - A</button>
                    </div>
                  )}
                </th>

                <th style={{...styles.th, textAlign: "center"}}>Tín chỉ (LT/TH)</th>
                
                {/* COLUMN: KHOA */}
                <th style={styles.th}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", userSelect: "none" }} onClick={() => setActiveFilterColumn(activeFilterColumn === 'faculty' ? null : 'faculty')}>
                    Khoa / Bộ môn <Filter size={14} color={(sortConfig.key === 'faculty_id' || filters.faculty_id) ? '#106fa6' : '#94a3b8'}/>
                  </div>
                  {activeFilterColumn === 'faculty' && (
                    <div style={{...styles.dropdownMenu, width: "220px"}}>
                      <button style={styles.dropdownItem} onClick={() => handleSort('faculty_id', 'asc')} onMouseOver={e=>e.currentTarget.style.background="#f1f5f9"} onMouseOut={e=>e.currentTarget.style.background="transparent"}><SortAsc size={16} color="#64748b"/> Sắp xếp Khoa A - Z</button>
                      <button style={styles.dropdownItem} onClick={() => handleSort('faculty_id', 'desc')} onMouseOver={e=>e.currentTarget.style.background="#f1f5f9"} onMouseOut={e=>e.currentTarget.style.background="transparent"}><SortDesc size={16} color="#64748b"/> Sắp xếp Khoa Z - A</button>
                      <div style={{ padding: "4px 16px", margin: "6px 0", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", fontSize: "0.8rem", fontWeight: "600", color: "#64748b" }}>Lọc theo Khoa quản lý</div>
                      <div style={{ maxHeight: "180px", overflowY: "auto" }}>
                        <button style={styles.dropdownItem} onClick={() => handleFilter('faculty_id', '')} onMouseOver={e=>e.currentTarget.style.background="#f1f5f9"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                           {!filters.faculty_id ? <Check size={16} color="#10b981"/> : <span style={{width: 16}}/>} Tất cả
                        </button>
                        {uniqueFaculties.map((fac, idx) => (
                          <button key={idx} style={styles.dropdownItem} onClick={() => handleFilter('faculty_id', fac)} onMouseOver={e=>e.currentTarget.style.background="#f1f5f9"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                            {filters.faculty_id === fac ? <Check size={16} color="#10b981"/> : <span style={{width: 16}}/>} {fac}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </th>

                {/* COLUMN: TRẠNG THÁI */}
                <th style={styles.th}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", userSelect: "none" }} onClick={() => setActiveFilterColumn(activeFilterColumn === 'status' ? null : 'status')}>
                    Trạng thái <Filter size={14} color={filters.is_active !== '' ? '#106fa6' : '#94a3b8'}/>
                  </div>
                  {activeFilterColumn === 'status' && (
                    <div style={{...styles.dropdownMenu, width: "180px"}}>
                      <div style={{ padding: "4px 16px", margin: "0 0 6px 0", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", fontSize: "0.8rem", fontWeight: "600", color: "#64748b" }}>Lọc trạng thái</div>
                      <button style={styles.dropdownItem} onClick={() => handleFilter('is_active', '')} onMouseOver={e=>e.currentTarget.style.background="#f1f5f9"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                         {filters.is_active === '' ? <Check size={16} color="#10b981"/> : <span style={{width: 16}}/>} Tất cả
                      </button>
                      <button style={styles.dropdownItem} onClick={() => handleFilter('is_active', 'true')} onMouseOver={e=>e.currentTarget.style.background="#f1f5f9"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                         {filters.is_active === 'true' ? <Check size={16} color="#10b981"/> : <span style={{width: 16}}/>} Active
                      </button>
                      <button style={styles.dropdownItem} onClick={() => handleFilter('is_active', 'false')} onMouseOver={e=>e.currentTarget.style.background="#f1f5f9"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                         {filters.is_active === 'false' ? <Check size={16} color="#10b981"/> : <span style={{width: 16}}/>} Ngưng dạy
                      </button>
                    </div>
                  )}
                </th>

                <th style={styles.th}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", userSelect: "none" }} onClick={() => setActiveFilterColumn(activeFilterColumn === 'updated_at' ? null : 'updated_at')}>
                    Ngày cập nhật <Filter size={14} color={sortConfig.key === 'updated_at' ? '#106fa6' : '#94a3b8'}/>
                  </div>
                  {activeFilterColumn === 'updated_at' && (
                    <div style={styles.dropdownMenu}>
                      <button style={styles.dropdownItem} onClick={() => handleSort('updated_at', 'desc')} onMouseOver={e=>e.currentTarget.style.background="#f1f5f9"} onMouseOut={e=>e.currentTarget.style.background="transparent"}><SortDesc size={16} color="#64748b"/> Mới nhất trước</button>
                      <button style={styles.dropdownItem} onClick={() => handleSort('updated_at', 'asc')} onMouseOver={e=>e.currentTarget.style.background="#f1f5f9"} onMouseOut={e=>e.currentTarget.style.background="transparent"}><SortAsc size={16} color="#64748b"/> Cũ nhất trước</button>
                    </div>
                  )}
                </th>

                <th style={{...styles.th, textAlign: "center", width: "80px"}}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</td></tr>
              ) : currentItems.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Không tìm thấy môn học phù hợp.</td></tr>
              ) : (
                currentItems.map((s, index) => (
                  <tr key={s.subject_id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#f8fafc"} onMouseOut={e => e.currentTarget.style.background = "#fff"}>
                    <td style={{...styles.td, textAlign: "center", fontWeight: "600", color: "#64748b"}}>
                      {indexOfFirstItem + index + 1}
                    </td>
                    <td style={{...styles.td, fontWeight: 700, color: '#0369a1'}}>{s.subject_id}</td>
                    <td style={{...styles.td, fontWeight: 600, color: '#334155'}}>{s.subject_name}</td>
                    <td style={{...styles.td, textAlign: "center"}}>
                      <div style={{ display: "inline-flex", gap: "10px", background: "#f1f5f9", padding: "4px 10px", borderRadius: "8px" }}>
                        <span style={{ color: "#3b82f6", fontWeight: 600 }} title="Lý thuyết">LT: {s.theory_credits ?? 0}</span>
                        <span style={{ color: "#cbd5e1" }}>|</span>
                        <span style={{ color: "#f59e0b", fontWeight: 600 }} title="Thực hành">TH: {s.practical_credits ?? 0}</span>
                      </div>
                    </td>
                    <td style={{...styles.td, fontWeight: 500, color: '#475569'}}>{s.faculty_id || '—'}</td>
                    <td style={styles.td}>
                      {s.is_active !== false ? 
                        <span style={{...styles.badge, background: '#dcfce7', color: '#166534'}}><CheckCircle size={12}/> Active</span> : 
                        <span style={{...styles.badge, background: '#fef2f2', color: '#dc2626'}}><AlertTriangle size={12}/> Ngưng dạy</span>}
                    </td>
                    <td style={{...styles.td, color: '#64748b', fontSize: '0.85rem'}}>
                      {formatDate(s.updated_at || s.created_at)}
                    </td>
                    <td style={{...styles.td, textAlign: "center"}}>
                      <button onClick={() => openModal(s)} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#475569', margin: "0 auto" }} onMouseOver={e=>e.currentTarget.style.background="#f1f5f9"} onMouseOut={e=>e.currentTarget.style.background="#fff"}>
                        <Edit size={14}/> Sửa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {renderPagination()}
      </div>

      {/* 5. MODAL THÊM / CẬP NHẬT */}
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: "blur(2px)" }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 450, maxWidth: '100%', padding: 24, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit size={20}/> {editingId ? 'Cập nhật Môn học' : 'Thêm Môn học'}
              </h3>
              <button onClick={() => setIsOpen(false)} style={{ background: "#e2e8f0", border: "none", cursor: "pointer", color: "#475569", padding: "6px", borderRadius: "50%" }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              <div>
                <label style={styles.label}>Mã môn học *</label>
                <input required disabled={!!editingId} value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value.toUpperCase() })} style={{...styles.input, background: editingId ? "#f1f5f9" : "#fff"}} />
              </div>
              <div>
                <label style={styles.label}>Tên môn học *</label>
                <input required value={form.subject_name} onChange={(e) => setForm({ ...form, subject_name: e.target.value })} style={styles.input} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                <div>
                  <label style={styles.label}>Tín chỉ Lý thuyết</label>
                  <input type="number" min={0} value={form.theory_credits} onChange={(e) => setForm({ ...form, theory_credits: parseInt(e.target.value) || 0 })} style={styles.input} />
                </div>
                <div>
                  <label style={styles.label}>Tín chỉ Thực hành</label>
                  <input type="number" min={0} value={form.practical_credits} onChange={(e) => setForm({ ...form, practical_credits: parseInt(e.target.value) || 0 })} style={styles.input} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                <div>
                  <label style={styles.label}>Ngành đào tạo (mã, cách nhau dấu phẩy)</label>
                  <input value={form.major_ids} onChange={(e) => setForm({ ...form, major_ids: e.target.value })} placeholder="VD: MaCNTT,MaATTT (rỗng = môn đại cương)" style={styles.input} />
                </div>
                <div>
                  <label style={styles.label}>Loại môn (CTĐT)</label>
                  <select value={form.subject_type} onChange={(e) => setForm({ ...form, subject_type: e.target.value })} style={styles.input}>
                    <option value="Bắt buộc">Bắt buộc</option>
                    <option value="Tự chọn">Tự chọn</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={styles.label}>Khoa quản lý</label>
                <select value={form.faculty_id} onChange={(e) => setForm({ ...form, faculty_id: e.target.value })} style={styles.input}>
                  <option value="">-- Chọn khoa --</option>
                  {faculties.map((f) => (
                    <option key={f.faculty_id} value={f.faculty_id}>{f.faculty_id} – {f.faculty_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={styles.label}>Trạng thái</label>
                <select value={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })} style={styles.input}>
                  <option value={true}>Đang hoạt động</option>
                  <option value={false}>Ngưng giảng dạy</option>
                </select>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 15, paddingTop: 15, borderTop: '1px solid #e2e8f0' }}>
                <button type="button" onClick={() => setIsOpen(false)} style={{ ...styles.btn, background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1" }}>Hủy bỏ</button>
                <button type="submit" style={{ ...styles.btn, background: "#106fa6" }}>Lưu thông tin</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}