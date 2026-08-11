import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Plus, Trash2, Edit, X, Users, UserPlus, Upload, CheckCircle, AlertTriangle, PieChart as PieChartIcon, BarChart2, GraduationCap, Briefcase, BookOpen, Menu, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, SortAsc, SortDesc, Check } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { API_BASE, authFetch } from '../../api/client';

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

const shortenFacultyName = (name) => {
  if (!name) return 'N/A';
  const cleanName = name.replace(/^(Khoa|Bộ môn)\s+/i, '');
  return cleanName.split(/\s+/).map(word => word.charAt(0).toUpperCase()).join('');
};

const LecturersManagement = ({ facultiesList, showToast }) => {
  const [allLecturersList, setAllLecturersList] = useState([]);
  const [fetchedFaculties, setFetchedFaculties] = useState([]);
  const [lecturerSearch, setLecturerSearch] = useState('');
  
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isLecturerModalOpen, setIsLecturerModalOpen] = useState(false);
  const [lecturerToDelete, setLecturerToDelete] = useState(null);
  const [editingLecturerId, setEditingLecturerId] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [activeFilterColumn, setActiveFilterColumn] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filterConfig, setFilterConfig] = useState({ faculty: '', status: '' });
  
  const [lecturerForm, setLecturerForm] = useState({
    lecturer_id: '', full_name: '', email: '', phone_number: '', date_of_birth: '',
    gender: '', citizen_id: '', ethnicity: '', religion: '', nationality: 'Việt Nam',
    address: '', place_of_birth: '', faculty_id: '', academic_title: '',
    position: 'Giảng viên', employment_type: 'Cơ hữu', teaching_status: 'Active'
  });

  const fileInputRef = useRef(null);

  useEffect(() => { fetchAllLecturers(); fetchFaculties(); }, []);

  const fetchFaculties = async () => {
    if (facultiesList && facultiesList.length > 0) return;
    try {
      const res = await authFetch(`${API_BASE}/api/faculties/`);
      if (res.ok) {
        const data = await res.json();
        setFetchedFaculties(Array.isArray(data) ? data : data.items || []);
      }
    } catch (err) { console.error('Lỗi tải khoa:', err); }
  };

  const activeFacultiesList = (facultiesList && facultiesList.length > 0) ? facultiesList : fetchedFaculties;

  const fetchAllLecturers = async () => {
    try {
      const response = await authFetch(`${API_BASE}/api/admin/lecturers/`);
      if (response.ok) {
        const result = await response.json();
        setAllLecturersList(result.items ? result.items : result || []);
      }
    } catch (err) { showToast?.('Lỗi khi tải danh sách giảng viên.', 'danger'); }
  };

  const uniqueFaculties = useMemo(() => {
    const faculties = allLecturersList.map(l => l.faculty?.faculty_name || l.faculty_id || 'Chưa cập nhật');
    return [...new Set(faculties)].filter(Boolean);
  }, [allLecturersList]);

  const uniqueStatuses = useMemo(() => {
    const statuses = allLecturersList.map(l => l.teaching_status || 'Unknown');
    return [...new Set(statuses)].filter(Boolean);
  }, [allLecturersList]);

  const stats = useMemo(() => {
    return {
      total: allLecturersList.length,
      active: allLecturersList.filter(l => l.teaching_status === 'Active').length,
      phds: allLecturersList.filter(l => ['TS', 'PGS.TS', 'GS.TS'].includes(l.academic_title)).length,
      fullTime: allLecturersList.filter(l => l.employment_type === 'Cơ hữu').length,
    };
  }, [allLecturersList]);

  const chartData = useMemo(() => {
    const titleCounts = { 'ThS': 0, 'TS': 0, 'PGS.TS': 0, 'GS.TS': 0, 'Khác': 0 };
    const facultyMap = {};

    allLecturersList.forEach(l => {
      let title = l.academic_title;
      if (!['ThS', 'TS', 'PGS.TS', 'GS.TS'].includes(title)) {
        title = 'Khác';
      }
      titleCounts[title] += 1;

      const fullName = l.faculty ? l.faculty.faculty_name : (l.faculty_id || 'Chưa phân khoa');
      const shortName = shortenFacultyName(fullName);

      if (!facultyMap[shortName]) facultyMap[shortName] = { name: shortName, count: 0 };
      facultyMap[shortName].count += 1;
    });

    const titles = Object.keys(titleCounts).map((key, index) => ({ 
      name: key, 
      value: titleCounts[key], 
      color: COLORS[index % COLORS.length] 
    }));

    const faculties = Object.values(facultyMap).sort((a, b) => b.count - a.count);
    return { titles, faculties };
  }, [allLecturersList]);

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      showToast?.('Đang import dữ liệu...', 'info');
      const res = await authFetch(`${API_BASE}/api/admin/lecturers/import`, { method: 'POST', body: formData });
      const result = await res.json();
      if (res.ok) {
        showToast?.(`Import thành công ${result.success_count} dòng. Lỗi ${result.error_count} dòng.`);
        fetchAllLecturers();
      } else {
        let errMsg = 'Lỗi khi import';
        if (result.detail) errMsg = Array.isArray(result.detail) ? result.detail.map(err => err.msg || JSON.stringify(err)).join(', ') : (typeof result.detail === 'string' ? result.detail : JSON.stringify(result.detail));
        showToast?.(errMsg, 'danger');
      }
    } catch (err) { showToast?.('Lỗi kết nối API', 'danger'); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const generateLecturerId = (list = allLecturersList) => {
    const currentYear = new Date().getFullYear();
    const prefix = `GV${currentYear}`;
    const numbers = list.map(i => i?.lecturer_id || '').filter(v => v.startsWith(prefix)).map(v => parseInt(v.replace(prefix, ''), 10)).filter(num => !isNaN(num));
    return `${prefix}${(numbers.length > 0 ? Math.max(...numbers) : 0) + 1}`.replace(/(\d+)$/, match => match.padStart(3, '0'));
  };

  const openLecturerModal = (lecturer = null) => {
    if (lecturer) {
      setEditingLecturerId(lecturer.lecturer_id);
      setLecturerForm({ ...lecturer, nationality: lecturer.nationality || 'Việt Nam', position: lecturer.position || 'Giảng viên', teaching_status: lecturer.teaching_status || 'Active' });
    } else {
      setEditingLecturerId(null);
      setLecturerForm({ lecturer_id: generateLecturerId(), full_name: '', email: '', phone_number: '', date_of_birth: '', gender: '', citizen_id: '', ethnicity: '', religion: '', nationality: 'Việt Nam', address: '', place_of_birth: '', faculty_id: '', academic_title: '', position: 'Giảng viên', employment_type: 'Cơ hữu', teaching_status: 'Active' });
    }
    setIsLecturerModalOpen(true);
  };

  const handleSaveLecturer = async (e) => {
    e.preventDefault();
    try {
      const isEdit = !!editingLecturerId;
      const url = isEdit ? `${API_BASE}/api/admin/lecturers/${editingLecturerId}` : `${API_BASE}/api/admin/lecturers/`;
      const response = await authFetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lecturerForm) });
      if (!response.ok) {
         const err = await response.json();
         let errMsg = 'Có lỗi xảy ra';
         if (err.detail) errMsg = Array.isArray(err.detail) ? err.detail.map(e => e.msg).join(', ') : (typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail));
         throw new Error(errMsg);
      }
      showToast?.(isEdit ? 'Đã cập nhật giảng viên!' : 'Đã thêm giảng viên!');
      setIsLecturerModalOpen(false);
      fetchAllLecturers();
    } catch (err) { showToast?.(err.message, 'danger'); }
  };

  const confirmDeleteLecturer = async () => {
    if (!lecturerToDelete) return;
    try {
      const response = await authFetch(`${API_BASE}/api/admin/lecturers/${lecturerToDelete.lecturer_id}`, { method: 'DELETE' });
      if (!response.ok) {
         const err = await response.json();
         throw new Error(err.detail ? (typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail)) : 'Lỗi khi xóa');
      }
      showToast?.('Đã xóa giảng viên khỏi hệ thống!');
      setLecturerToDelete(null);
      fetchAllLecturers();
    } catch (err) { showToast?.(err.message, 'danger'); setLecturerToDelete(null); }
  };

  const handleSort = (key, direction) => {
    setSortConfig({ key, direction });
    setActiveFilterColumn(null);
    setCurrentPage(1);
  };

  const handleFilter = (type, value) => {
    setFilterConfig(prev => ({ ...prev, [type]: value }));
    setActiveFilterColumn(null);
    setCurrentPage(1);
  };

  let processedList = allLecturersList.filter(l => {
    const matchSearch = (l.lecturer_id || '').toLowerCase().includes(lecturerSearch.toLowerCase()) ||
      (l.full_name || '').toLowerCase().includes(lecturerSearch.toLowerCase()) ||
      (l.faculty?.faculty_name || l.faculty_id || '').toLowerCase().includes(lecturerSearch.toLowerCase());

    const facultyName = l.faculty?.faculty_name || l.faculty_id || 'Chưa cập nhật';
    const matchFaculty = filterConfig.faculty ? facultyName === filterConfig.faculty : true;
    const matchStatus = filterConfig.status ? l.teaching_status === filterConfig.status : true;

    return matchSearch && matchFaculty && matchStatus;
  });

  if (sortConfig.key) {
    processedList.sort((a, b) => {
      let valA = '', valB = '';
      if (sortConfig.key === 'name') {
        const nameA = (a.full_name || '').trim().split(' ');
        const nameB = (b.full_name || '').trim().split(' ');
        valA = nameA[nameA.length - 1] || '';
        valB = nameB[nameB.length - 1] || '';
      } else if (sortConfig.key === 'faculty') {
        valA = a.faculty?.faculty_name || a.faculty_id || '';
        valB = b.faculty?.faculty_name || b.faculty_id || '';
      }
      const compareResult = valA.localeCompare(valB, 'vi');
      return sortConfig.direction === 'asc' ? compareResult : -compareResult;
    });
  }

  const totalPages = Math.ceil(processedList.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = processedList.slice(indexOfFirstItem, indexOfLastItem);

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    let pages = [];
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    for (let i = startPage; i <= endPage; i++) pages.push(i);

    const btnStyle = { display: "flex", alignItems: "center", justifyContent: "center", minWidth: "32px", height: "32px", padding: "0 8px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", color: "#475569", fontWeight: "500", transition: "all 0.2s", fontSize: "0.85rem" };
    const activeBtnStyle = { ...btnStyle, background: "#7c3aed", color: "#fff", borderColor: "#7c3aed" };
    const disabledBtnStyle = { ...btnStyle, opacity: 0.5, cursor: "not-allowed", background: "#f8fafc" };

    return (
      <div style={{ padding: "12px 20px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
        <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
          Hiển thị <span style={{fontWeight: 600, color: "#334155"}}>{indexOfFirstItem + 1}</span> - <span style={{fontWeight: 600, color: "#334155"}}>{Math.min(indexOfLastItem, processedList.length)}</span> trong tổng <span style={{fontWeight: 600, color: "#334155"}}>{processedList.length}</span> kết quả
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
      
      {/* HEADER & ACTIONS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff", padding: "15px 20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Users size={26} color="#106fa6" />
           <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#106fa6', margin: 0 }}>Quản lý giảng viên</h2>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImport} style={{ display: 'none' }} />
          <button  style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, color: '#334155' }}>
            <Upload size={18} /> Import CSV
          </button>
          <button style={{ ...styles.btn, background: "#106fa6", display: "flex", alignItems: "center", gap: "6px" }} onClick={() => openLecturerModal()}>
            <UserPlus size={18} /> Thêm giảng viên
          </button>
        </div>
      </div>

      {/* THẺ KPI (TOP CARDS) */}
      <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
        <div style={styles.statCard}>
          <div style={styles.statTitle}><Users size={18} color="#3b82f6"/> Tổng giảng viên</div>
          <div style={styles.statValue}>{stats.total}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statTitle}><CheckCircle size={18} color="#10b981"/> Đang giảng dạy</div>
          <div style={styles.statValue}>{stats.active} <span style={{fontSize:"1rem", color:"#94a3b8", fontWeight:"normal"}}>/ {stats.total}</span></div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statTitle}><GraduationCap size={18} color="#8b5cf6"/> Học vị cao</div>
          <div style={styles.statValue}>{stats.phds} <span style={{fontSize:"1rem", color:"#94a3b8", fontWeight:"normal"}}>người</span></div>
        </div>
      </div>

      {/* CHARTS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px" }}>
        <div style={styles.chartBox}>
          <h4 style={{ margin: "0 0 15px 0", color: "#334155", display: "flex", alignItems: "center", gap: "6px", fontSize: "1.05rem" }}>
            <PieChartIcon size={18} color="#64748b"/> Cơ cấu Học hàm / Học vị
          </h4>
          <div style={{ width: "100%", height: "260px" }}>
            {chartData.titles.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData.titles} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value">
                    {chartData.titles.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} người`, 'Số lượng']} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}/>
                  <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                </PieChart>
              </ResponsiveContainer>
            ) : (<div style={{height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8"}}>Chưa có dữ liệu</div>)}
          </div>
        </div>

        <div style={styles.chartBox}>
          <h4 style={{ margin: "0 0 15px 0", color: "#334155", display: "flex", alignItems: "center", gap: "6px", fontSize: "1.05rem" }}>
            <BarChart2 size={18} color="#64748b"/> Số lượng Giảng viên theo Khoa
          </h4>
          <div style={{ width: "100%", height: "230px", marginTop: "10px" }}>
            {chartData.faculties.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.faculties} margin={{ top: 10, right: 10, left: -20, bottom: 45 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 11}} interval={0} angle={-30} textAnchor="end" />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }} formatter={(value) => [`${value} giảng viên`, 'Số lượng']}/>
                  <Bar dataKey="count" name="Giảng viên" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={35} />
                </BarChart>
              </ResponsiveContainer>
            ) : (<div style={{height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8"}}>Chưa có dữ liệu</div>)}
          </div>
        </div>
      </div>

      {/* DANH SÁCH BẢNG */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "visible", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", position: "relative" }}>
        
        {activeFilterColumn && <div style={{position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 15}} onClick={() => setActiveFilterColumn(null)} />}

        <div style={{ padding: "15px 20px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <div style={{position: "relative", maxWidth: "400px"}}>
            <Search size={18} color="#94a3b8" style={{position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)"}}/>
            <input 
              type="text" 
              placeholder="Tìm kiếm theo mã GV, họ tên, khoa..." 
              style={{ ...styles.input, paddingLeft: "36px" }}
              value={lecturerSearch} 
              onChange={(e) => { setLecturerSearch(e.target.value); setCurrentPage(1); }} 
            />
          </div>
        </div>
        
        <div style={{ overflowX: "visible", minHeight: "350px" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{...styles.th, width: "60px", textAlign: "center"}}>STT</th>
                <th style={styles.th}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", userSelect: "none" }} onClick={() => setActiveFilterColumn(activeFilterColumn === 'name' ? null : 'name')}>
                    Giảng viên <Filter size={14} color={sortConfig.key === 'name' ? '#7c3aed' : '#94a3b8'}/>
                  </div>
                  {activeFilterColumn === 'name' && (
                    <div style={styles.dropdownMenu}>
                      <button style={styles.dropdownItem} onClick={() => handleSort('name', 'asc')} onMouseOver={e=>e.currentTarget.style.background="#f1f5f9"} onMouseOut={e=>e.currentTarget.style.background="transparent"}><SortAsc size={16} color="#64748b"/> Sắp xếp tên A - Z</button>
                      <button style={styles.dropdownItem} onClick={() => handleSort('name', 'desc')} onMouseOver={e=>e.currentTarget.style.background="#f1f5f9"} onMouseOut={e=>e.currentTarget.style.background="transparent"}><SortDesc size={16} color="#64748b"/> Sắp xếp tên Z - A</button>
                    </div>
                  )}
                </th>
                <th style={styles.th}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", userSelect: "none" }} onClick={() => setActiveFilterColumn(activeFilterColumn === 'faculty' ? null : 'faculty')}>
                    Đơn vị công tác <Filter size={14} color={(sortConfig.key === 'faculty' || filterConfig.faculty) ? '#7c3aed' : '#94a3b8'}/>
                  </div>
                  {activeFilterColumn === 'faculty' && (
                    <div style={{...styles.dropdownMenu, width: "240px"}}>
                      <button style={styles.dropdownItem} onClick={() => handleSort('faculty', 'asc')} onMouseOver={e=>e.currentTarget.style.background="#f1f5f9"} onMouseOut={e=>e.currentTarget.style.background="transparent"}><SortAsc size={16} color="#64748b"/> Sắp xếp khoa A - Z</button>
                      <button style={styles.dropdownItem} onClick={() => handleSort('faculty', 'desc')} onMouseOver={e=>e.currentTarget.style.background="#f1f5f9"} onMouseOut={e=>e.currentTarget.style.background="transparent"}><SortDesc size={16} color="#64748b"/> Sắp xếp khoa Z - A</button>
                      <div style={{ padding: "4px 16px", margin: "6px 0", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", fontSize: "0.8rem", fontWeight: "600", color: "#64748b" }}>Lọc theo Khoa quản lý</div>
                      <div style={{ maxHeight: "180px", overflowY: "auto" }}>
                        <button style={styles.dropdownItem} onClick={() => handleFilter('faculty', '')} onMouseOver={e=>e.currentTarget.style.background="#f1f5f9"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                           {!filterConfig.faculty ? <Check size={16} color="#10b981"/> : <span style={{width: 16}}/>} Tất cả
                        </button>
                        {uniqueFaculties.map((faculty, idx) => (
                          <button key={idx} style={styles.dropdownItem} onClick={() => handleFilter('faculty', faculty)} onMouseOver={e=>e.currentTarget.style.background="#f1f5f9"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                            {filterConfig.faculty === faculty ? <Check size={16} color="#10b981"/> : <span style={{width: 16}}/>} {faculty}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </th>
                <th style={styles.th}>Liên lạc</th>
                <th style={styles.th}>Phân công</th>
                <th style={styles.th}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", userSelect: "none" }} onClick={() => setActiveFilterColumn(activeFilterColumn === 'status' ? null : 'status')}>
                    Trạng thái <Filter size={14} color={filterConfig.status ? '#7c3aed' : '#94a3b8'}/>
                  </div>
                  {activeFilterColumn === 'status' && (
                    <div style={{...styles.dropdownMenu, width: "200px"}}>
                      <div style={{ padding: "4px 16px", margin: "0 0 6px 0", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", fontSize: "0.8rem", fontWeight: "600", color: "#64748b" }}>Lọc trạng thái</div>
                      <button style={styles.dropdownItem} onClick={() => handleFilter('status', '')} onMouseOver={e=>e.currentTarget.style.background="#f1f5f9"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                         {!filterConfig.status ? <Check size={16} color="#10b981"/> : <span style={{width: 16}}/>} Tất cả
                      </button>
                      {uniqueStatuses.map((status, idx) => (
                        <button key={idx} style={styles.dropdownItem} onClick={() => handleFilter('status', status)} onMouseOver={e=>e.currentTarget.style.background="#f1f5f9"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                          {filterConfig.status === status ? <Check size={16} color="#10b981"/> : <span style={{width: 16}}/>} {status === 'Active' ? 'Đang dạy' : status === 'Inactive' ? 'Ngừng dạy' : status}
                        </button>
                      ))}
                    </div>
                  )}
                </th>
                <th style={{...styles.th, textAlign: "center", width: "80px"}}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Không tìm thấy giảng viên phù hợp.</td></tr>
              ) : (
                currentItems.map((l, index) => (
                  <tr key={l.lecturer_id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#f8fafc"} onMouseOut={e => e.currentTarget.style.background = "#fff"}>
                    <td style={{...styles.td, textAlign: "center", fontWeight: "600", color: "#64748b"}}>
                      {indexOfFirstItem + index + 1}
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: "700", color: "#0f172a" }}>{l.academic_title && l.academic_title !== 'Khác' ? `${l.academic_title}. ` : ''}{l.full_name}</div>
                      <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Mã GV: {l.lecturer_id}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: "600", color: "#334155" }}>{l.faculty ? shortenFacultyName(l.faculty.faculty_name) : shortenFacultyName(l.faculty_id)}</div>
                      <div style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "capitalize" }}>{l.position || 'Giảng viên'}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ color: "#334155", fontWeight: "500", fontSize: "0.85rem" }}>{l.phone_number || '—'}</div>
                      <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{l.email || '—'}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <div style={{ color: "#0369a1", fontWeight: "600", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "4px" }}>
                          <BookOpen size={14}/> {l.assigned_classes || 0} lớp 
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-start" }}>
                        {l.teaching_status === 'Active' ? 
                          <span style={{...styles.badge, background: '#dcfce7', color: '#166534'}}><CheckCircle size={12}/> Đang dạy</span> : 
                          <span style={{...styles.badge, background: '#fef2f2', color: '#dc2626'}}><AlertTriangle size={12}/> Ngừng dạy</span>}
                        <span style={{ background: '#e2e8f0', color: '#475569', padding: "2px 8px", borderRadius: "8px", fontSize: "0.7rem", fontWeight: "600" }}>
                          {l.employment_type || 'Chưa rõ'}
                        </span>
                      </div>
                    </td>
                    <td style={{...styles.td, position: "relative", textAlign: "center"}}>
                      <button onClick={() => setActiveDropdown(activeDropdown === l.lecturer_id ? null : l.lecturer_id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b", padding: "6px", borderRadius: "6px" }} onMouseOver={e => e.currentTarget.style.background = "#e2e8f0"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                        <Menu size={20}/>
                      </button>
                      {activeDropdown === l.lecturer_id && (
                        <>
                          <div style={{position: "fixed", inset: 0, zIndex: 9}} onClick={() => setActiveDropdown(null)} />
                          <div style={{ position: "absolute", right: "50%", top: "70%", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", zIndex: 10, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: "140px" }}>
                            <button onClick={() => { openLecturerModal(l); setActiveDropdown(null); }} style={styles.dropdownItem} onMouseOver={e => e.currentTarget.style.background = "#f8fafc"} onMouseOut={e => e.currentTarget.style.background = "transparent"}><Edit size={16}/> Sửa hồ sơ</button>
                            <button onClick={() => { setLecturerToDelete(l); setActiveDropdown(null); }} style={{...styles.dropdownItem, color: "#ef4444"}} onMouseOver={e => e.currentTarget.style.background = "#fef2f2"} onMouseOut={e => e.currentTarget.style.background = "transparent"}><Trash2 size={16}/> Xóa</button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {renderPagination()}
      </div>

      {/* MODALS */}
      {lecturerToDelete && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.6)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }}>
          <div style={{ background: "#fff", borderRadius: "16px", width: "400px", maxWidth: "95%", padding: "24px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", textAlign: "center" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto", color: "#ef4444" }}><AlertTriangle size={30} /></div>
            <h3 style={{ margin: "0 0 10px 0", color: "#0f172a", fontSize: "1.25rem" }}>Xác nhận xóa giảng viên</h3>
            <p style={{ margin: "0 0 24px 0", color: "#475569", fontSize: "0.95rem", lineHeight: "1.5" }}>Bạn có chắc chắn muốn xóa giảng viên <strong>{lecturerToDelete.full_name}</strong>?</p>
            <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
              <button onClick={() => setLecturerToDelete(null)} style={{ ...styles.btn, background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1", flex: 1 }}>Hủy bỏ</button>
              <button onClick={confirmDeleteLecturer} style={{ ...styles.btn, background: "#ef4444", flex: 1 }}>Có, Xóa ngay</button>
            </div>
          </div>
        </div>
      )}

      {isLecturerModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }}>
          <div style={{ background: "#fff", borderRadius: "16px", width: "700px", maxWidth: "95%", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "95vh" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "8px" }}><Edit size={20}/> {editingLecturerId ? 'Cập nhật Giảng viên' : 'Thêm Giảng viên'}</h3>
              <button onClick={() => setIsLecturerModalOpen(false)} style={{ background: "#e2e8f0", border: "none", cursor: "pointer", color: "#475569", padding: "6px", borderRadius: "50%" }}><X size={20} /></button>
            </div>
            
            <div style={{ padding: "24px", overflowY: "auto" }}>
              <form onSubmit={handleSaveLecturer} style={{ display: "grid", gap: "20px" }}>
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px" }}>
                  <div style={{ fontWeight: "700", color: "#0f172a", marginBottom: "12px" }}>Thông tin tài khoản</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                    <div>
                      <label style={styles.label}>Mã giảng viên</label>
                      <input readOnly={!!editingLecturerId} style={{...styles.input, background: editingLecturerId ? "#f1f5f9" : "#fff"}} value={lecturerForm.lecturer_id} onChange={e => setLecturerForm({...lecturerForm, lecturer_id: e.target.value.toUpperCase()})} />
                    </div>
                    <div>
                      <label style={styles.label}>Trạng thái (Khóa/Mở)</label>
                      <select style={styles.input} value={lecturerForm.teaching_status} onChange={e => setLecturerForm({...lecturerForm, teaching_status: e.target.value})}>
                        <option value="Active">Đang dạy (Mở)</option>
                        <option value="Inactive">Ngừng dạy (Khóa)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: "0 0 12px 0", color: "#334155", borderBottom: "2px solid #f1f5f9", paddingBottom: "8px" }}>Cá nhân & Liên hệ</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={styles.label}>Họ và Tên *</label>
                      <input required style={styles.input} value={lecturerForm.full_name} onChange={e => setLecturerForm({...lecturerForm, full_name: e.target.value})} />
                    </div>
                    <div><label style={styles.label}>Email</label><input style={styles.input} type="email" value={lecturerForm.email} onChange={e => setLecturerForm({...lecturerForm, email: e.target.value})} /></div>
                    <div><label style={styles.label}>Số điện thoại</label><input style={styles.input} value={lecturerForm.phone_number} onChange={e => setLecturerForm({...lecturerForm, phone_number: e.target.value})} /></div>
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: "0 0 12px 0", color: "#334155", borderBottom: "2px solid #f1f5f9", paddingBottom: "8px" }}>Công tác & Phân công</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={styles.label}>Khoa/Bộ môn *</label>
                      <select required style={styles.input} value={lecturerForm.faculty_id} onChange={e => setLecturerForm({...lecturerForm, faculty_id: e.target.value})}>
                        <option value="">-- Chọn Khoa --</option>
                        {activeFacultiesList.map(f => (<option key={f.faculty_id} value={f.faculty_id}>{f.faculty_id} - {f.faculty_name}</option>))}
                      </select>
                    </div>
                    <div>
                      {/* === UPDATE Ở ĐÂY: Thêm các tùy chọn Học hàm / Học vị mới === */}
                      <label style={styles.label}>Học hàm/Học vị</label>
                      <select style={styles.input} value={lecturerForm.academic_title} onChange={e => setLecturerForm({...lecturerForm, academic_title: e.target.value})}>
                        <option value="">-- Chọn --</option>
                        <option value="ThS">ThS (Thạc sĩ)</option>
                        <option value="TS">TS (Tiến sĩ)</option>
                        <option value="PGS.TS">PGS.TS (Phó Giáo sư)</option>
                        <option value="GS.TS">GS.TS (Giáo sư)</option>
                        <option value="KS">KS (Kỹ sư)</option>
                        <option value="CN">CN (Cử nhân)</option>
                        <option value="NCS">NCS (Nghiên cứu sinh)</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                    <div>
                      <label style={styles.label}>Loại hợp đồng</label>
                      <select style={styles.input} value={lecturerForm.employment_type} onChange={e => setLecturerForm({...lecturerForm, employment_type: e.target.value})}>
                        <option value="Cơ hữu">Cơ hữu</option><option value="Thỉnh giảng">Thỉnh giảng</option><option value="Hợp đồng">Hợp đồng</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "15px" }}>
                  <button type="button" style={{ ...styles.btn, background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1" }} onClick={() => setIsLecturerModalOpen(false)}>Đóng lại</button>
                  <button type="submit" style={{ ...styles.btn, background: "#7c3aed" }}>{editingLecturerId ? 'Lưu cập nhật' : 'Tạo giảng viên'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LecturersManagement;