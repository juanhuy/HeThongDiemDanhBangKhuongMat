import React, { useState, useEffect, useRef, useMemo } from 'react';
import { studentsApi, facultiesApi, majorsApi } from '../../api';
import { buildManualStudentPayload } from '../../utils/studentFormUtils';
import { API_BASE, authFetch } from '../../api/client';
import { Search, Plus, Edit, X, Upload, CheckCircle, AlertTriangle, PieChart as PieChartIcon, BarChart2, Check, Menu, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, SortAsc, SortDesc, Users, UserPlus, ScanFace, Trash2, GraduationCap, Briefcase } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const styles = {
  btn: { padding: "8px 16px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem", color: "#fff", transition: "all 0.2s" },
  input: { padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.95rem", width: "100%", boxSizing: "border-box", background: "#fff" },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", fontSize: "0.95rem" },
  th: { padding: "12px 15px", textAlign: "left", borderBottom: "2px solid #e2e8f0", color: "#475569", fontWeight: "600", whiteSpace: "nowrap", position: "relative" },
  td: { padding: "12px 15px", borderBottom: "1px solid #e2e8f0", verticalAlign: "middle" },
  label: { display: "block", marginBottom: "6px", color: "#334155", fontWeight: "600", fontSize: "0.85rem" },
  badge: { padding: "4px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" },
  statCard: { background: "#fff", padding: "15px 20px", borderRadius: "12px", border: "1px solid #e2e8f0", flex: 1, minWidth: "200px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  statValue: { fontSize: "1.8rem", fontWeight: "700", color: "#0f172a", margin: "8px 0 2px 0" },
  statTitle: { color: "#64748b", fontSize: "0.9rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" },
  chartBox: { background: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", position: "relative" },
  dropdownMenu: { position: "absolute", top: "100%", right: "15px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", zIndex: 20, minWidth: "160px", padding: "8px 0", overflow: "hidden" },
  dropdownItem: { padding: "8px 16px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.85rem", color: "#334155", borderBottom: "1px solid #f1f5f9", background: "transparent", border: "none", width: "100%", textAlign: "left" },
  actionBtn: { background: "none", border: "none", cursor: "pointer", padding: "6px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }
};

const emptyForm = {
  student_id: '', full_name: '', email: '', phone_number: '', administrative_class: '', major_id: '', specialization: '',
  faculty_id: '', cohort: '', training_program: 'Đại học chính quy', academic_status: 'Đang học', gender: 'Nam', citizen_id: '',
  ethnicity: 'Kinh', religion: 'Không', nationality: 'Việt Nam', place_of_birth: '', address: '', date_of_birth: ''
};

const STATUS_COLORS = { 'Đang học': '#10b981', 'Đã tốt nghiệp': '#3b82f6', 'Đã nghỉ': '#ef4444', 'Thôi học': '#ef4444', 'Bảo lưu': '#f59e0b' };
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// Hàm hỗ trợ format định dạng ngày chuẩn yyyy-mm-dd cho thẻ <input type="date">
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  if (dateString.includes('T')) return dateString.split('T')[0];
  return dateString;
};

export default function StudentsManagement({ showToast }) {
  const [students, setStudents] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [majors, setMajors] = useState([]);
  const [adminClasses, setAdminClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // States: Lọc, Sắp xếp & Phân trang
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [activeFilterColumn, setActiveFilterColumn] = useState(null);
  const [filters, setFilters] = useState({ class: '', major: '', status: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // States: Modal
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);

  const [faceStudent, setFaceStudent] = useState(null);
  const [faceStatus, setFaceStatus] = useState({ has_face_data: false, total_vectors: 0 });

  const [createForm, setCreateForm] = useState({ ...emptyForm });
  const [profileForm, setProfileForm] = useState({ ...emptyForm });

  // States: Camera
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);

  const fileInputRef = useRef(null);
  const faceInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [stRes, facRes, majRes] = await Promise.all([
        studentsApi.listStudents(), 
        facultiesApi.listFaculties(), 
        majorsApi.listMajors()
      ]);
      const list = stRes.data || stRes.items || stRes || [];
      setStudents(Array.isArray(list) ? list : []);
      setFaculties(Array.isArray(facRes) ? facRes : facRes.data || []);
      setMajors(Array.isArray(majRes) ? majRes : majRes.data || []);
      
      try {
        const adminClassesRes = await fetch(`${API_BASE}/api/administrative-classes`);
        if (adminClassesRes.ok) {
          const acJson = await adminClassesRes.json();
          // Lấy đúng mảng dữ liệu từ thuộc tính .data của API categories.py
          const acData = acJson.data || acJson.items || acJson || [];
          setAdminClasses(Array.isArray(acData) ? acData : []);
        }
      } catch(e) { console.error("Lỗi lấy danh sách lớp:", e); }
      
    } catch (err) {
      showToast?.(err.message || 'Lỗi tải danh sách sinh viên', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { if (!isFaceModalOpen && streamRef.current) stopCamera(); }, [isFaceModalOpen]);

  // --- THỐNG KÊ & DỮ LIỆU ĐỘNG ---
  const uniqueClassesFromStudents = useMemo(() => [...new Set(students.map(s => s.administrative_class || s.lop_base).filter(Boolean))], [students]);
  const uniqueMajors = useMemo(() => [...new Set(students.map(s => s.major_id || s.major).filter(Boolean))], [students]);
  const uniqueStatuses = useMemo(() => [...new Set(students.map(s => s.academic_status || 'Đang học').filter(Boolean))], [students]);

  // const allAvailableClasses = useMemo(() => {
  //   const apiClasses = adminClasses.map(c => c.class_id || c.name || c);
  //   return [...new Set([...apiClasses, ...uniqueClassesFromStudents])].filter(Boolean).sort();
  // }, [adminClasses, uniqueClassesFromStudents]);

  const allAvailableClasses = useMemo(() => {
    // Trích xuất danh sách lớp chuẩn xác từ dữ liệu API administrative-classes
    const apiClasses = adminClasses.map(c => typeof c === 'string' ? c : (c.class_id || c.name));
    // Kết hợp dự phòng với danh sách lớp quét thực tế từ sinh viên
    return [...new Set([...apiClasses, ...uniqueClassesFromStudents])].filter(Boolean).sort();
  }, [adminClasses, uniqueClassesFromStudents]);

  const stats = useMemo(() => {
    const total = students.length;
    const active = students.filter(s => (s.academic_status || 'Đang học').includes('học')).length;
    const graduated = students.filter(s => (s.academic_status || '') === 'Đã tốt nghiệp').length;

    const statusMap = {};
    const majorStatusMap = {};

    students.forEach(s => {
      const status = s.academic_status || 'Đang học';
      statusMap[status] = (statusMap[status] || 0) + 1;
      const major = s.major_id || 'Khác';
      if (!majorStatusMap[major]) majorStatusMap[major] = {};
      majorStatusMap[major][status] = (majorStatusMap[major][status] || 0) + 1;
    });

    const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));
    const majorStatusData = Object.keys(majorStatusMap).map(major => {
      const item = { major };
      const statuses = majorStatusMap[major];
      Object.keys(statuses).forEach(st => item[st] = statuses[st]);
      return item;
    });

    return { total, active, graduated, statusData, majorStatusData };
  }, [students]);

  // --- LỌC, SẮP XẾP & PHÂN TRANG ---
  const handleSort = (key, direction) => {
    setSortConfig({ key, direction });
    setActiveFilterColumn(null);
    setCurrentPage(1);
  };

  const handleFilter = (type, value) => {
    setFilters(prev => ({ ...prev, [type]: value }));
    setActiveFilterColumn(null);
    setCurrentPage(1);
  };

  const processedStudents = useMemo(() => {
    let filtered = students.filter(s => {
      const id = (s.student_id || s.mssv || '').toLowerCase();
      const name = (s.full_name || s.ho_ten || '').toLowerCase();
      const q = search.toLowerCase();
      return !q || id.includes(q) || name.includes(q);
    });

    if (filters.class) filtered = filtered.filter(s => (s.administrative_class || s.lop_base) === filters.class);
    if (filters.major) filtered = filtered.filter(s => (s.major_id || s.major) === filters.major);
    if (filters.status) filtered = filtered.filter(s => (s.academic_status || 'Đang học') === filters.status);

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let valA = '', valB = '';
        if (sortConfig.key === 'name') {
          const nA = (a.full_name || a.ho_ten || '').trim().split(' ');
          const nB = (b.full_name || b.ho_ten || '').trim().split(' ');
          valA = nA[nA.length - 1] || '';
          valB = nB[nB.length - 1] || '';
        } else if (sortConfig.key === 'id') {
          valA = a.student_id || a.mssv || '';
          valB = b.student_id || b.mssv || '';
        }
        const comp = valA.localeCompare(valB, 'vi');
        return sortConfig.direction === 'asc' ? comp : -comp;
      });
    }

    return filtered;
  }, [students, search, filters, sortConfig]);

  const totalPages = Math.ceil(processedStudents.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = processedStudents.slice(indexOfFirstItem, indexOfLastItem);

  // --- API XỬ LÝ (THÊM, SỬA, XÓA, IMPORT) ---
  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      showToast?.('Đang import dữ liệu...', 'info');
      const res = await authFetch(`${API_BASE}/api/admin/students/import/excel`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Lỗi import');
      showToast?.(data.message || 'Import thành công', 'success');
      fetchAll();
    } catch (err) { showToast?.(err.message, 'danger'); }
    finally { if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = buildManualStudentPayload(createForm);
      Object.keys(payload).forEach(key => {
        if (payload[key] === "") payload[key] = null;
      });

      await studentsApi.createStudent(payload);
      showToast?.('Thêm sinh viên thành công', 'success');
      setIsCreateOpen(false);
      setCreateForm({ ...emptyForm });
      fetchAll();
    } catch (err) { showToast?.(err.message || 'Lỗi thêm SV', 'danger'); }
  };

  const openProfileModal = async (id) => {
    try {
      showToast?.('Đang tải hồ sơ...', 'info');
      const res = await authFetch(`${API_BASE}/api/admin/students/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Lỗi tải thông tin');

      setProfileForm({
        student_id: data.student_id || '',
        full_name: data.profile?.full_name || data.full_name || '',
        email: data.profile?.personal_email || data.email || '',
        phone_number: data.profile?.phone_number || data.phone_number || '',
        administrative_class: data.administrative_class || '',
        major_id: data.major_id || '',
        specialization: data.specialization || '',
        faculty_id: data.faculty_id || '',
        cohort: data.cohort || '',
        training_program: data.training_program || 'Đại học chính quy',
        academic_status: data.academic_status || 'Đang học',
        gender: data.profile?.gender || data.gender || 'Nam',
        citizen_id: data.profile?.citizen_id || data.citizen_id || '',
        ethnicity: data.profile?.ethnicity || data.ethnicity || 'Kinh',
        religion: data.profile?.religion || data.religion || 'Không',
        nationality: data.profile?.nationality || data.nationality || 'Việt Nam',
        place_of_birth: data.profile?.place_of_birth || data.place_of_birth || '',
        address: data.profile?.address || data.address || '',
        date_of_birth: formatDateForInput(data.profile?.date_of_birth || data.date_of_birth)
      });
      setIsProfileModalOpen(true);
    } catch (err) { showToast?.(err.message, 'danger'); }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const payload = buildManualStudentPayload(profileForm);
      Object.keys(payload).forEach(key => {
        if (payload[key] === "") payload[key] = null;
      });

      await studentsApi.updateStudent(profileForm.student_id, payload);
      showToast?.('Cập nhật hồ sơ thành công', 'success');
      setIsProfileModalOpen(false);
      fetchAll();
    } catch (err) { showToast?.(err.message || 'Lỗi cập nhật', 'danger'); }
  };

  const confirmDelete = async () => {
    if (!studentToDelete) return;
    try {
      await studentsApi.deleteStudent(studentToDelete);
      showToast?.('Đã xóa hồ sơ sinh viên!', 'success');
      setStudentToDelete(null);
      setIsProfileModalOpen(false);
      fetchAll();
    } catch (err) { showToast?.(err.message || 'Lỗi xóa', 'danger'); }
  };

  // --- HÀM XỬ LÝ CAMERA / KHUÔN MẶT ---
  const openFaceModal = async (student) => {
    setFaceStudent(student);
    setIsFaceModalOpen(true);
    setFaceStatus({ has_face_data: false, total_vectors: 0 });
    setCameraActive(false);
    setCapturedImage(null);
    if (streamRef.current) stopCamera();
    try {
      const res = await authFetch(`${API_BASE}/api/${student.student_id || student.mssv}/faces`);
      const data = await res.json();
      if (res.ok) setFaceStatus(data);
    } catch (err) { console.error(err); }
  };

  const uploadFaceFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      showToast?.('Đang xử lý hình ảnh...', 'info');
      const res = await authFetch(`${API_BASE}/api/${faceStudent.student_id || faceStudent.mssv}/faces`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Lỗi phân tích khuôn mặt');
      showToast?.('Đã lưu sinh trắc học thành công', 'success');
      openFaceModal(faceStudent);
    } catch (err) { showToast?.(err.message, 'danger'); }
  };

  const handleUploadFace = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await uploadFaceFile(file);
    e.target.value = null;
  };

  const handleCaptureAndUpload = async () => {
    if (!capturedImage) return showToast?.('Chưa chụp ảnh', 'danger');
    const blob = await fetch(capturedImage).then(res => res.blob());
    const file = new File([blob], 'face_capture.jpg', { type: 'image/jpeg' });
    await uploadFaceFile(file);
    stopCamera();
    setCameraActive(false);
    setCapturedImage(null);
  };

  const handleDeleteFace = async () => {
    if (!window.confirm('Xóa dữ liệu khuôn mặt của sinh viên này?')) return;
    try {
      const res = await authFetch(`${API_BASE}/api/${faceStudent.student_id || faceStudent.mssv}/faces`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Lỗi xóa khuôn mặt');
      }
      showToast?.('Đã xóa dữ liệu sinh trắc học', 'success');
      openFaceModal(faceStudent);
    } catch (err) { showToast?.(err.message, 'danger'); }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      setCameraActive(true);
      setCapturedImage(null);
      setTimeout(async () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try { await videoRef.current.play(); } catch (e) { console.error(e); }
        }
      }, 50);
    } catch (err) { showToast?.('Không thể truy cập camera', 'danger'); }
  };

  const stopCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    setCapturedImage(canvas.toDataURL('image/jpeg'));
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Datalist Nơi Sinh dùng chung */}
      <datalist id="provincesList">
        <option value="Hà Nội" /><option value="TP. Hồ Chí Minh" /><option value="Hải Phòng" /><option value="Đà Nẵng" /><option value="Cần Thơ" />
        <option value="Đồng Nai" /><option value="Bình Dương" /><option value="Bà Rịa - Vũng Tàu" /><option value="Thanh Hóa" /><option value="Nghệ An" />
        <option value="Thừa Thiên Huế" /><option value="Khánh Hòa" /><option value="Lâm Đồng" /><option value="Quảng Ninh" /><option value="Đắk Lắk" />
      </datalist>

      <input type="file" accept=".xlsx, .xls, .csv" ref={fileInputRef} onChange={handleImportExcel} style={{ display: 'none' }} />
      <input type="file" accept="image/jpeg, image/png, image/jpg" ref={faceInputRef} onChange={handleUploadFace} style={{ display: 'none' }} />

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff", padding: "15px 20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Users size={26} color="#106fa6" />
           <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#106fa6', margin: 0 }}>Quản lý Sinh viên</h2>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button  style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, color: '#334155' }} onClick={() => fileInputRef.current?.click()}>
            <Upload size={18} /> Import Excel
          </button>
          <button style={{ ...styles.btn, background: "#106fa6", display: "flex", alignItems: "center", gap: "6px" }} onClick={() => { setCreateForm({ ...emptyForm }); setIsCreateOpen(true); }}>
            <UserPlus size={18} /> Thêm sinh viên
          </button>
        </div>
      </div>

      {/* THẺ KPI */}
      <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
        <div style={styles.statCard}><div style={styles.statTitle}><Users size={18} color="#3b82f6" /> Tổng sinh viên</div><div style={styles.statValue}>{stats.total}</div></div>
        <div style={styles.statCard}><div style={styles.statTitle}><CheckCircle size={18} color="#10b981" /> Đang học</div><div style={styles.statValue}>{stats.active} <span style={{ fontSize: "1rem", color: "#94a3b8", fontWeight: "normal" }}>/ {stats.total}</span></div></div>
        <div style={styles.statCard}><div style={styles.statTitle}><GraduationCap size={18} color="#f59e0b" /> Đã tốt nghiệp</div><div style={styles.statValue}>{stats.graduated}</div></div>
        <div style={styles.statCard}><div style={styles.statTitle}><Briefcase size={18} color="#8b5cf6" /> Số Lớp biên chế</div><div style={styles.statValue}>{uniqueClassesFromStudents.length}</div></div>
      </div>

      {/* CHARTS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px" }}>
        <div style={styles.chartBox}>
          <h4 style={{ margin: "0 0 15px 0", color: "#334155", display: "flex", alignItems: "center", gap: "6px", fontSize: "1.05rem" }}><PieChartIcon size={18} color="#64748b" /> Trạng thái học tập</h4>
          <div style={{ width: "100%", height: "260px" }}>
            {stats.statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value">
                    {stats.statusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} sinh viên`, 'Số lượng']} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (<div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>Chưa có dữ liệu</div>)}
          </div>
        </div>

        <div style={styles.chartBox}>
          <h4 style={{ margin: "0 0 15px 0", color: "#334155", display: "flex", alignItems: "center", gap: "6px", fontSize: "1.05rem" }}><BarChart2 size={18} color="#64748b" /> Sinh viên theo Ngành</h4>
          <div style={{ width: "100%", height: "230px", marginTop: "10px" }}>
            {stats.majorStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.majorStatusData} margin={{ top: 10, right: 10, left: -20, bottom: 45 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="major" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11 }} interval={0} angle={-30} textAnchor="end" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  {Object.keys(STATUS_COLORS).map(status => (
                    <Bar key={status} dataKey={status} stackId="a" fill={STATUS_COLORS[status]} maxBarSize={40} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (<div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>Chưa có dữ liệu</div>)}
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "visible", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", position: "relative" }}>
        {activeFilterColumn && <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 15 }} onClick={() => setActiveFilterColumn(null)} />}

        <div style={{ padding: "15px 20px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <div style={{ position: "relative", maxWidth: "400px" }}>
            <Search size={18} color="#94a3b8" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
            <input type="text" placeholder="Tìm kiếm theo MSSV hoặc Họ tên..." style={{ ...styles.input, paddingLeft: "36px" }} value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
          </div>
        </div>

        <div style={{ overflowX: "visible", minHeight: "350px" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: "50px", textAlign: "center" }}>STT</th>
                <th style={{ ...styles.th, width: "60px", textAlign: "center" }} title="Sinh trắc khuôn mặt FaceID">FaceID</th>
                <th style={styles.th}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", userSelect: "none" }} onClick={() => setActiveFilterColumn(activeFilterColumn === 'id' ? null : 'id')}>
                    MSSV <Filter size={14} color={sortConfig.key === 'id' ? '#106fa6' : '#94a3b8'} />
                  </div>
                  {activeFilterColumn === 'id' && (
                    <div style={styles.dropdownMenu}>
                      <button style={styles.dropdownItem} onClick={() => handleSort('id', 'asc')}><SortAsc size={16} color="#64748b" /> Sắp xếp A - Z</button>
                      <button style={styles.dropdownItem} onClick={() => handleSort('id', 'desc')}><SortDesc size={16} color="#64748b" /> Sắp xếp Z - A</button>
                    </div>
                  )}
                </th>
                <th style={styles.th}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", userSelect: "none" }} onClick={() => setActiveFilterColumn(activeFilterColumn === 'name' ? null : 'name')}>
                    Họ và Tên <Filter size={14} color={sortConfig.key === 'name' ? '#106fa6' : '#94a3b8'} />
                  </div>
                  {activeFilterColumn === 'name' && (
                    <div style={styles.dropdownMenu}>
                      <button style={styles.dropdownItem} onClick={() => handleSort('name', 'asc')}><SortAsc size={16} color="#64748b" /> Sắp xếp Tên A - Z</button>
                      <button style={styles.dropdownItem} onClick={() => handleSort('name', 'desc')}><SortDesc size={16} color="#64748b" /> Sắp xếp Tên Z - A</button>
                    </div>
                  )}
                </th>
                <th style={styles.th}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", userSelect: "none" }} onClick={() => setActiveFilterColumn(activeFilterColumn === 'class' ? null : 'class')}>
                    Lớp Biên chế <Filter size={14} color={filters.class ? '#106fa6' : '#94a3b8'} />
                  </div>
                  {activeFilterColumn === 'class' && (
                    <div style={{ ...styles.dropdownMenu, width: "200px" }}>
                      <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                        <button style={styles.dropdownItem} onClick={() => handleFilter('class', '')}>{!filters.class && <Check size={16} color="#10b981" />} Tất cả Lớp</button>
                        {allAvailableClasses.map(c => (
                          <button key={c} style={styles.dropdownItem} onClick={() => handleFilter('class', c)}>{filters.class === c && <Check size={16} color="#10b981" />} {c}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </th>
                <th style={styles.th}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", userSelect: "none" }} onClick={() => setActiveFilterColumn(activeFilterColumn === 'major' ? null : 'major')}>
                    Ngành Học <Filter size={14} color={filters.major ? '#106fa6' : '#94a3b8'} />
                  </div>
                  {activeFilterColumn === 'major' && (
                    <div style={{ ...styles.dropdownMenu, width: "250px" }}>
                      <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                        <button style={styles.dropdownItem} onClick={() => handleFilter('major', '')}>{!filters.major && <Check size={16} color="#10b981" />} Tất cả Ngành</button>
                        {uniqueMajors.map(m => (
                          <button key={m} style={styles.dropdownItem} onClick={() => handleFilter('major', m)}>{filters.major === m && <Check size={16} color="#10b981" />} {m}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </th>
                <th style={styles.th}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", userSelect: "none" }} onClick={() => setActiveFilterColumn(activeFilterColumn === 'status' ? null : 'status')}>
                    Trạng thái <Filter size={14} color={filters.status ? '#106fa6' : '#94a3b8'} />
                  </div>
                  {activeFilterColumn === 'status' && (
                    <div style={{ ...styles.dropdownMenu, width: "200px" }}>
                      <button style={styles.dropdownItem} onClick={() => handleFilter('status', '')}>{!filters.status && <Check size={16} color="#10b981" />} Tất cả</button>
                      {uniqueStatuses.map(s => (
                        <button key={s} style={styles.dropdownItem} onClick={() => handleFilter('status', s)}>{filters.status === s && <Check size={16} color="#10b981" />} {s}</button>
                      ))}
                    </div>
                  )}
                </th>
                <th style={{ ...styles.th, textAlign: "center", width: "80px" }}>Hồ sơ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</td></tr>
              ) : currentItems.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Không tìm thấy kết quả phù hợp.</td></tr>
              ) : (
                currentItems.map((s, index) => {
                  const id = s.student_id || s.mssv;
                  const isLearning = (s.academic_status || 'Đang học').includes('học');
                  return (
                    <tr key={id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#f8fafc"} onMouseOut={e => e.currentTarget.style.background = "#fff"}>
                      <td style={{ ...styles.td, textAlign: "center", fontWeight: "600", color: "#64748b" }}>{indexOfFirstItem + index + 1}</td>
                      <td style={{ ...styles.td, textAlign: "center" }}>
                        <button onClick={() => openFaceModal(s)} style={{ ...styles.actionBtn, background: '#ede9fe', color: '#8b5cf6', margin: '0 auto' }} title="Quản lý FaceID">
                          <ScanFace size={18} />
                        </button>
                      </td>
                      <td style={{ ...styles.td, fontWeight: 700, color: '#106fa6' }}>{id}</td>
                      <td style={{ ...styles.td, fontWeight: 600, color: '#334155' }}>{s.full_name || s.ho_ten}</td>
                      <td style={{ ...styles.td, color: '#475569' }}>{s.administrative_class || s.lop_base || '—'}</td>
                      <td style={{ ...styles.td, color: '#475569' }}>{s.major_id || s.major || '—'}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, background: isLearning ? '#dcfce7' : '#f1f5f9', color: isLearning ? '#16a34a' : '#64748b' }}>
                          {isLearning ? <CheckCircle size={12} /> : <AlertTriangle size={12} />} {s.academic_status || 'Đang học'}
                        </span>
                      </td>

                      <td style={{ ...styles.td, textAlign: "center" }}>
                        <button
                          onClick={() => openProfileModal(id)}
                          style={{ background: "transparent", border: "1px solid #cbd5e1", cursor: "pointer", color: "#475569", padding: "6px 12px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "6px", margin: "0 auto", fontSize: "0.85rem", fontWeight: "600" }}
                          onMouseOver={e => e.currentTarget.style.background = "#f1f5f9"}
                          onMouseOut={e => e.currentTarget.style.background = "transparent"}
                          title="Xem và Chỉnh sửa hồ sơ"
                        >
                          <Menu size={16} /> Xem
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        {totalPages > 1 && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
            <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
              Hiển thị <span style={{ fontWeight: 600, color: "#334155" }}>{indexOfFirstItem + 1}</span> - <span style={{ fontWeight: 600, color: "#334155" }}>{Math.min(indexOfLastItem, processedStudents.length)}</span> trong tổng <span style={{ fontWeight: 600, color: "#334155" }}>{processedStudents.length}</span> kết quả
            </div>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} style={{ ...styles.btn, background: currentPage === 1 ? '#f8fafc' : '#fff', color: currentPage === 1 ? '#94a3b8' : '#475569', border: '1px solid #cbd5e1', padding: "6px 10px" }}><ChevronLeft size={16} /></button>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} style={{ ...styles.btn, background: currentPage === totalPages ? '#f8fafc' : '#fff', color: currentPage === totalPages ? '#94a3b8' : '#475569', border: '1px solid #cbd5e1', padding: "6px 10px" }}><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* --- MODAL XÁC NHẬN XÓA --- */}
      {studentToDelete && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.6)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }}>
          <div style={{ background: "#fff", borderRadius: "16px", width: "400px", maxWidth: "95%", padding: "24px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", textAlign: "center" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto", color: "#ef4444" }}>
              <AlertTriangle size={30} />
            </div>
            <h3 style={{ margin: "0 0 10px 0", color: "#0f172a", fontSize: "1.25rem" }}>Xác nhận xóa sinh viên</h3>
            <p style={{ margin: "0 0 24px 0", color: "#475569", fontSize: "0.95rem", lineHeight: "1.5" }}>
              Bạn có chắc chắn muốn xóa toàn bộ dữ liệu của sinh viên <strong>{studentToDelete}</strong>?<br />Hành động này sẽ không thể hoàn tác!
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
              <button onClick={() => setStudentToDelete(null)} style={{ ...styles.btn, background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1", flex: 1 }}>Hủy bỏ</button>
              <button onClick={confirmDelete} style={{ ...styles.btn, background: "#ef4444", flex: 1 }}>Có, Xóa ngay</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL GỘP: CHI TIẾT & CHỈNH SỬA --- */}
      {isProfileModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: "blur(2px)" }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 850, maxWidth: '100%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit size={20} /> Hồ sơ & Cập nhật: <span style={{ color: "#106fa6" }}>{profileForm.student_id}</span>
              </h3>
              <button onClick={() => setIsProfileModalOpen(false)} style={{ background: '#e2e8f0', border: 'none', borderRadius: '50%', padding: '6px', cursor: 'pointer', color: '#475569' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

                {/* CỘT TRÁI: NHÂN THÂN */}
                <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <h4 style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: 10, color: '#334155', marginTop: 0, marginBottom: 16, fontSize: "1.05rem" }}>Thông tin nhân thân</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div><label style={styles.label}>Họ và Tên</label><input required value={profileForm.full_name || ''} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} style={styles.input} /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div><label style={styles.label}>Ngày sinh</label><input type="date" value={profileForm.date_of_birth || ''} onChange={(e) => setProfileForm({ ...profileForm, date_of_birth: e.target.value })} style={styles.input} /></div>
                      <div>
                        <label style={styles.label}>Giới tính</label>
                        <select value={profileForm.gender || ''} onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })} style={styles.input}>
                          <option value="">-- Chọn --</option><option value="Nam">Nam</option><option value="Nữ">Nữ</option>
                        </select>
                      </div>
                    </div>
                    <div><label style={styles.label}>CCCD/CMND</label><input value={profileForm.citizen_id || ''} onChange={(e) => setProfileForm({ ...profileForm, citizen_id: e.target.value })} style={styles.input} /></div>
                    <div><label style={styles.label}>Email cá nhân</label><input type="email" value={profileForm.email || ''} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} style={styles.input} /></div>
                    <div><label style={styles.label}>Số điện thoại</label><input value={profileForm.phone_number || ''} onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })} style={styles.input} /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={styles.label}>Dân tộc</label>
                        <select value={profileForm.ethnicity || ''} onChange={(e) => setProfileForm({ ...profileForm, ethnicity: e.target.value })} style={styles.input}>
                          <option value="Kinh">Kinh</option><option value="Tày">Tày</option><option value="Thái">Thái</option>
                          <option value="Mường">Mường</option><option value="Khmer">Khmer</option><option value="Hoa">Hoa</option>
                          <option value="Nùng">Nùng</option><option value="H'Mông">H'Mông</option><option value="Khác">Khác</option>
                        </select>
                      </div>
                      <div>
                        <label style={styles.label}>Tôn giáo</label>
                        <select value={profileForm.religion || ''} onChange={(e) => setProfileForm({ ...profileForm, religion: e.target.value })} style={styles.input}>
                          <option value="Không">Không</option><option value="Phật giáo">Phật giáo</option><option value="Công giáo">Công giáo</option>
                          <option value="Tin Lành">Tin Lành</option><option value="Cao Đài">Cao Đài</option><option value="Hòa Hảo">Hòa Hảo</option>
                          <option value="Hồi giáo">Hồi giáo</option><option value="Khác">Khác</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={styles.label}>Nơi sinh</label>
                      <input list="provincesList" value={profileForm.place_of_birth || ''} onChange={(e) => setProfileForm({ ...profileForm, place_of_birth: e.target.value })} style={styles.input} placeholder="Nhập hoặc chọn..." />
                    </div>
                    <div><label style={styles.label}>Địa chỉ thường trú</label><input value={profileForm.address || ''} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} style={styles.input} /></div>
                  </div>
                </div>

                {/* CỘT PHẢI: HỌC THUẬT */}
                <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <h4 style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: 10, color: '#334155', marginTop: 0, marginBottom: 16, fontSize: "1.05rem" }}>Thông tin học thuật</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div><label style={styles.label}>Mã Sinh Viên</label><input disabled value={profileForm.student_id || ''} style={{ ...styles.input, background: "#e2e8f0", fontWeight: 700, color: "#106fa6", cursor: "not-allowed" }} /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={styles.label}>Lớp biên chế</label>
                        <select value={profileForm.administrative_class || ''} onChange={(e) => setProfileForm({ ...profileForm, administrative_class: e.target.value })} style={styles.input}>
                          <option value="">-- Chọn lớp --</option>
                          {allAvailableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={styles.label}>Niên khóa (Khóa)</label>
                        <select value={profileForm.cohort || ''} onChange={(e) => setProfileForm({ ...profileForm, cohort: e.target.value })} style={styles.input}>
                          <option value="">-- Chọn khóa --</option>
                          <option value="2020-2025">2020-2025</option><option value="2021-2026">2021-2026</option>
                          <option value="2022-2027">2022-2027</option><option value="2023-2028">2023-2028</option>
                          <option value="2024-2029">2024-2029</option><option value="2025-2030">2025-2030</option>
                          <option value="Khác">Khác</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={styles.label}>Trạng thái học tập</label>
                      <select value={profileForm.academic_status || ''} onChange={(e) => setProfileForm({ ...profileForm, academic_status: e.target.value })} style={{ ...styles.input, color: "#16a34a", fontWeight: 600 }}>
                        <option value="Đang học">Đang học</option><option value="Bảo lưu">Bảo lưu</option><option value="Đã tốt nghiệp">Đã tốt nghiệp</option><option value="Thôi học">Thôi học</option><option value="Đã nghỉ">Đã nghỉ</option>
                      </select>
                    </div>
                    <div>
                      <label style={styles.label}>Ngành học</label>
                      <select value={profileForm.major_id || ''} onChange={(e) => setProfileForm({ ...profileForm, major_id: e.target.value })} style={styles.input}>
                        <option value="">-- Chọn ngành --</option>
                        {majors.map((m) => <option key={m.major_id} value={m.major_id}>{m.major_id} - {m.major_name}</option>)}
                      </select>
                    </div>
                    <div><label style={styles.label}>Chuyên ngành hẹp</label><input value={profileForm.specialization || ''} onChange={(e) => setProfileForm({ ...profileForm, specialization: e.target.value })} style={styles.input} /></div>
                    <div>
                      <label style={styles.label}>Khoa quản lý</label>
                      <select value={profileForm.faculty_id || ''} onChange={(e) => setProfileForm({ ...profileForm, faculty_id: e.target.value })} style={styles.input}>
                        <option value="">-- Chọn khoa --</option>
                        {faculties.map((f) => <option key={f.faculty_id} value={f.faculty_id}>{f.faculty_name || f.faculty_id}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={styles.label}>Hệ đào tạo</label>
                      <select value={profileForm.training_program || ''} onChange={(e) => setProfileForm({ ...profileForm, training_program: e.target.value })} style={styles.input}>
                        <option value="Đại học chính quy">Đại học chính quy</option><option value="Chất lượng cao">Chất lượng cao</option><option value="Liên thông đại học">Liên thông đại học</option><option value="Vừa làm vừa học">Vừa làm vừa học</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: 'flex', justifyContent: 'space-between', alignItems: "center" }}>
                <button type="button" onClick={() => setStudentToDelete(profileForm.student_id)} style={{ ...styles.btn, background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca", display: "flex", alignItems: "center", gap: "6px" }}><Trash2 size={16} /> Xóa hồ sơ này</button>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" onClick={() => setIsProfileModalOpen(false)} style={{ ...styles.btn, background: "#fff", color: "#475569", border: "1px solid #cbd5e1" }}>Đóng</button>
                  <button type="submit" style={{ ...styles.btn, background: "#106fa6" }}>Lưu cập nhật</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL THÊM SINH VIÊN TÙY CHỌN --- */}
      {isCreateOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: "blur(2px)" }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 850, maxWidth: '100%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}><UserPlus size={20} /> Thêm sinh viên mới</h3>
              <button onClick={() => setIsCreateOpen(false)} style={{ background: '#e2e8f0', border: 'none', borderRadius: '50%', padding: '6px', cursor: 'pointer', color: '#475569' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

                {/* CỘT TRÁI: NHÂN THÂN */}
                <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <h4 style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: 10, color: '#334155', marginTop: 0, marginBottom: 16, fontSize: "1.05rem" }}>Thông tin nhân thân</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div><label style={styles.label}>Họ và Tên *</label><input required value={createForm.full_name || ''} onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })} style={styles.input} /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div><label style={styles.label}>Ngày sinh</label><input type="date" value={createForm.date_of_birth || ''} onChange={(e) => setCreateForm({ ...createForm, date_of_birth: e.target.value })} style={styles.input} /></div>
                      <div>
                        <label style={styles.label}>Giới tính</label>
                        <select value={createForm.gender || ''} onChange={(e) => setCreateForm({ ...createForm, gender: e.target.value })} style={styles.input}>
                          <option value="">-- Chọn --</option><option value="Nam">Nam</option><option value="Nữ">Nữ</option>
                        </select>
                      </div>
                    </div>
                    <div><label style={styles.label}>CCCD/CMND</label><input value={createForm.citizen_id || ''} onChange={(e) => setCreateForm({ ...createForm, citizen_id: e.target.value })} style={styles.input} /></div>
                    <div><label style={styles.label}>Email cá nhân</label><input type="email" value={createForm.email || ''} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} style={styles.input} /></div>
                    <div><label style={styles.label}>Số điện thoại</label><input value={createForm.phone_number || ''} onChange={(e) => setCreateForm({ ...createForm, phone_number: e.target.value })} style={styles.input} /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={styles.label}>Dân tộc</label>
                        <select value={createForm.ethnicity || ''} onChange={(e) => setCreateForm({ ...createForm, ethnicity: e.target.value })} style={styles.input}>
                          <option value="Kinh">Kinh</option><option value="Tày">Tày</option><option value="Thái">Thái</option>
                          <option value="Mường">Mường</option><option value="Khmer">Khmer</option><option value="Hoa">Hoa</option>
                          <option value="Nùng">Nùng</option><option value="H'Mông">H'Mông</option><option value="Khác">Khác</option>
                        </select>
                      </div>
                      <div>
                        <label style={styles.label}>Tôn giáo</label>
                        <select value={createForm.religion || ''} onChange={(e) => setCreateForm({ ...createForm, religion: e.target.value })} style={styles.input}>
                          <option value="Không">Không</option><option value="Phật giáo">Phật giáo</option><option value="Công giáo">Công giáo</option>
                          <option value="Tin Lành">Tin Lành</option><option value="Cao Đài">Cao Đài</option><option value="Hòa Hảo">Hòa Hảo</option>
                          <option value="Hồi giáo">Hồi giáo</option><option value="Khác">Khác</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={styles.label}>Nơi sinh</label>
                      <input list="provincesList" value={createForm.place_of_birth || ''} onChange={(e) => setCreateForm({ ...createForm, place_of_birth: e.target.value })} style={styles.input} placeholder="Nhập hoặc chọn..." />
                    </div>
                    <div><label style={styles.label}>Địa chỉ thường trú</label><input value={createForm.address || ''} onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })} style={styles.input} /></div>
                  </div>
                </div>

                {/* CỘT PHẢI: HỌC THUẬT */}
                <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <h4 style={{ borderBottom: '2px solid #cbd5e1', paddingBottom: 10, color: '#334155', marginTop: 0, marginBottom: 16, fontSize: "1.05rem" }}>Thông tin học thuật</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div><label style={styles.label}>Mã Sinh Viên *</label><input required value={createForm.student_id || ''} onChange={(e) => setCreateForm({ ...createForm, student_id: e.target.value.toUpperCase() })} style={styles.input} /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={styles.label}>Lớp biên chế</label>
                        <select value={createForm.administrative_class || ''} onChange={(e) => setCreateForm({ ...createForm, administrative_class: e.target.value })} style={styles.input}>
                          <option value="">-- Chọn lớp --</option>
                          {allAvailableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={styles.label}>Niên khóa (Khóa)</label>
                        <select value={createForm.cohort || ''} onChange={(e) => setCreateForm({ ...createForm, cohort: e.target.value })} style={styles.input}>
                          <option value="">-- Chọn khóa --</option>
                          <option value="2020-2025">2020-2025</option><option value="2021-2026">2021-2026</option>
                          <option value="2022-2027">2022-2027</option><option value="2023-2028">2023-2028</option>
                          <option value="2024-2029">2024-2029</option><option value="2025-2030">2025-2030</option>
                          <option value="Khác">Khác</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={styles.label}>Trạng thái học tập</label>
                      <select value={createForm.academic_status || ''} onChange={(e) => setCreateForm({ ...createForm, academic_status: e.target.value })} style={{ ...styles.input, color: "#16a34a", fontWeight: 600 }}>
                        <option value="Đang học">Đang học</option><option value="Bảo lưu">Bảo lưu</option>
                      </select>
                    </div>
                    <div>
                      <label style={styles.label}>Ngành học</label>
                      <select value={createForm.major_id || ''} onChange={(e) => setCreateForm({ ...createForm, major_id: e.target.value })} style={styles.input}>
                        <option value="">-- Chọn ngành --</option>
                        {majors.map((m) => <option key={m.major_id} value={m.major_id}>{m.major_id} - {m.major_name}</option>)}
                      </select>
                    </div>
                    <div><label style={styles.label}>Chuyên ngành hẹp</label><input value={createForm.specialization || ''} onChange={(e) => setCreateForm({ ...createForm, specialization: e.target.value })} style={styles.input} /></div>
                    <div>
                      <label style={styles.label}>Khoa quản lý</label>
                      <select value={createForm.faculty_id || ''} onChange={(e) => setCreateForm({ ...createForm, faculty_id: e.target.value })} style={styles.input}>
                        <option value="">-- Chọn khoa --</option>
                        {faculties.map((f) => <option key={f.faculty_id} value={f.faculty_id}>{f.faculty_name || f.faculty_id}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={styles.label}>Hệ đào tạo</label>
                      <select value={createForm.training_program || ''} onChange={(e) => setCreateForm({ ...createForm, training_program: e.target.value })} style={styles.input}>
                        <option value="Đại học chính quy">Đại học chính quy</option><option value="Chất lượng cao">Chất lượng cao</option><option value="Liên thông đại học">Liên thông đại học</option><option value="Vừa làm vừa học">Vừa làm vừa học</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" onClick={() => setIsCreateOpen(false)} style={{ ...styles.btn, background: "#fff", color: "#475569", border: "1px solid #cbd5e1" }}>Hủy bỏ</button>
                <button type="submit" style={{ ...styles.btn, background: "#106fa6" }}>Tạo hồ sơ mới</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL SINH TRẮC FACE ID --- */}
      {isFaceModalOpen && faceStudent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: "blur(2px)" }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 600, maxWidth: '100%', padding: 24, maxHeight: '90vh', overflowY: 'auto', boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', color: '#0f172a', display: "flex", alignItems: "center", gap: "8px" }}><ScanFace size={22} color="#8b5cf6" /> Sinh trắc học: {faceStudent.full_name || faceStudent.ho_ten}</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>MSSV: {faceStudent.student_id || faceStudent.mssv}</p>
              </div>
              <button onClick={() => { setIsFaceModalOpen(false); stopCamera(); setCameraActive(false); }} style={{ background: '#e2e8f0', border: 'none', borderRadius: '50%', padding: '6px', cursor: 'pointer', color: '#475569' }}><X size={20} /></button>
            </div>

            <div style={{ padding: 16, background: faceStatus.has_face_data ? '#dcfce7' : '#fef2f2', border: `1px solid ${faceStatus.has_face_data ? '#bbf7d0' : '#fecaca'}`, borderRadius: 12, marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 8px', color: faceStatus.has_face_data ? '#16a34a' : '#dc2626', display: "flex", alignItems: "center", gap: "6px" }}>
                {faceStatus.has_face_data ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                {faceStatus.has_face_data ? 'Đã có dữ liệu khuôn mặt' : 'Chưa có dữ liệu khuôn mặt'}
              </h4>
              <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>Hệ thống ghi nhận: <b>{faceStatus.total_vectors || 0}</b> vector đặc trưng.</p>
            </div>

            <div style={{ marginBottom: 20 }}>
              {!cameraActive && !capturedImage && (
                <button onClick={startCamera} style={{ padding: '14px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer', width: '100%', fontSize: '1rem', display: "flex", justifyContent: "center", gap: "8px" }}>
                  <ScanFace size={20} /> Mở Camera Nhận diện
                </button>
              )}
              {(cameraActive || capturedImage) && (
                <div style={{ marginTop: 8, background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div style={{ position: 'relative', background: '#0f172a', borderRadius: 8, overflow: 'hidden', width: '100%', paddingTop: '75%', boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5)" }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {!capturedImage && <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'contain' }} muted playsInline />}
                      {capturedImage && <img src={capturedImage} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                      <canvas ref={canvasRef} style={{ display: 'none' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {cameraActive && !capturedImage && (
                      <>
                        <button onClick={capturePhoto} style={{ ...styles.btn, background: '#10b981', flex: '1 1 auto', padding: "10px" }}>📸 Chụp ảnh</button>
                        <button onClick={stopCamera} style={{ ...styles.btn, background: '#ef4444', flex: '1 1 auto', padding: "10px" }}>Đóng camera</button>
                      </>
                    )}
                    {capturedImage && (
                      <>
                        <button onClick={handleCaptureAndUpload} style={{ ...styles.btn, background: '#8b5cf6', flex: '1 1 auto', padding: "10px" }}>✅ Lưu & đăng ký</button>
                        <button onClick={retakePhoto} style={{ ...styles.btn, background: '#f59e0b', flex: '1 1 auto', padding: "10px" }}>Chụp lại</button>
                        <button onClick={() => { setCapturedImage(null); stopCamera(); setCameraActive(false); }} style={{ ...styles.btn, background: '#64748b', flex: '1 1 auto', padding: "10px" }}>Hủy</button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
              <button onClick={() => faceInputRef.current.click()} style={{ ...styles.btn, background: '#8b5cf6', padding: "12px" }}>
                {faceStatus.has_face_data ? 'Cập nhật ảnh từ file máy tính' : 'Đăng ký khuôn mặt từ file máy tính'}
              </button>
              {faceStatus.has_face_data && (
                <button onClick={handleDeleteFace} style={{ ...styles.btn, background: '#fff', color: '#dc2626', border: '1px solid #fecaca', padding: "12px" }}>
                  Xóa toàn bộ dữ liệu khuôn mặt
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}