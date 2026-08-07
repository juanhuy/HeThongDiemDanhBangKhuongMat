import React, { useState, useEffect, useRef } from 'react';
import { studentsApi, facultiesApi, majorsApi } from '../../api';
import { buildManualStudentPayload } from '../../utils/studentFormUtils';
import { API_BASE } from '../../api/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';

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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28FD0', '#F06292', '#42A5F5'];
const STATUS_COLORS = {
  'Đang học': '#4CAF50',
  'Đã tốt nghiệp': '#2196F3',
  'Đã nghỉ': '#FF5722',
  'Bảo lưu': '#FFC107',
};

export const TRAINING_PROGRAM_OPTIONS = [
    { value: 'DAI_TRA', label: 'Đại trà' },
    { value: 'NANG_CAO', label: 'Nâng cao' },
];

export default function StudentsManagement({ showToast }) {
  const [students, setStudents] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [majors, setMajors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterMajor, setFilterMajor] = useState('');

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);

  const [selected, setSelected] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [faceStudent, setFaceStudent] = useState(null);
  const [faceStatus, setFaceStatus] = useState({ has_face_data: false, total_vectors: 0 });

  const [createForm, setCreateForm] = useState({ ...emptyForm });
  const [editForm, setEditForm] = useState({
    phone_number: '',
    email: '',
    address: '',
    academic_status: '',
  });

  // Camera states
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);

  const fileInputRef = useRef(null);
  const faceInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // --- Fetch data ---
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
      showToast?.(err.message || 'Lỗi tải danh sách sinh viên', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (!isFaceModalOpen && streamRef.current) {
      stopCamera();
    }
  }, [isFaceModalOpen]);

  // --- Filter ---
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

  // --- Statistics ---
  const computeStats = () => {
    const total = students.length;
    const statusMap = {};
    const cohortStatusMap = {};
    const majorStatusMap = {};
    const classStatusMap = {};

    students.forEach(s => {
      const status = s.academic_status || 'Đang học';
      statusMap[status] = (statusMap[status] || 0) + 1;

      const cohort = s.cohort || 'Chưa xác định';
      if (!cohortStatusMap[cohort]) cohortStatusMap[cohort] = {};
      cohortStatusMap[cohort][status] = (cohortStatusMap[cohort][status] || 0) + 1;

      const major = s.major_id || 'Chưa xác định';
      if (!majorStatusMap[major]) majorStatusMap[major] = {};
      majorStatusMap[major][status] = (majorStatusMap[major][status] || 0) + 1;

      const cls = s.administrative_class || 'Chưa xác định';
      if (!classStatusMap[cls]) classStatusMap[cls] = {};
      classStatusMap[cls][status] = (classStatusMap[cls][status] || 0) + 1;
    });

    const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));
    const cohortStatusData = Object.keys(cohortStatusMap).map(cohort => {
      const item = { cohort };
      const statuses = cohortStatusMap[cohort];
      Object.keys(statuses).forEach(st => item[st] = statuses[st]);
      return item;
    });
    const majorStatusData = Object.keys(majorStatusMap).map(major => {
      const item = { major };
      const statuses = majorStatusMap[major];
      Object.keys(statuses).forEach(st => item[st] = statuses[st]);
      return item;
    });
    const classStatusData = Object.keys(classStatusMap).map(cls => {
      const item = { class: cls };
      const statuses = classStatusMap[cls];
      Object.keys(statuses).forEach(st => item[st] = statuses[st]);
      return item;
    });

    return { total, statusData, cohortStatusData, majorStatusData, classStatusData };
  };

  const stats = computeStats();

  // --- CRUD ---
  const openDetail = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/students/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Lỗi tải chi tiết');
      setDetailData(data);
      setIsDetailOpen(true);
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

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
      showToast?.('Thêm sinh viên thành công', 'success');
      setIsCreateOpen(false);
      setCreateForm({ ...emptyForm });
      fetchAll();
    } catch (err) {
      showToast?.(err.message || 'Lỗi thêm SV', 'error');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selected) return;
    const id = selected.student_id || selected.mssv;
    try {
      await studentsApi.updateStudent(id, editForm);
      showToast?.('Cập nhật thành công', 'success');
      setIsEditOpen(false);
      fetchAll();
    } catch (err) {
      showToast?.(err.message || 'Lỗi cập nhật', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Xóa toàn bộ dữ liệu của sinh viên ${id}?`)) return;
    try {
      await studentsApi.deleteStudent(id);
      showToast?.('Đã xóa sinh viên', 'success');
      fetchAll();
    } catch (err) {
      showToast?.(err.message || 'Lỗi xóa', 'error');
    }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/admin/students/import/excel`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Lỗi import');
      showToast?.(data.message || 'Import thành công', 'success');
      fetchAll();
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setLoading(false);
      e.target.value = null;
    }
  };

  // --- Face management ---
  const openFaceModal = async (student) => {
    setFaceStudent(student);
    setIsFaceModalOpen(true);
    setFaceStatus({ has_face_data: false, total_vectors: 0 });
    setCameraActive(false);
    setCapturedImage(null);
    if (streamRef.current) stopCamera();
    try {
      const res = await fetch(`${API_BASE}/api/${student.student_id}/faces`);
      const data = await res.json();
      if (res.ok) setFaceStatus(data);
    } catch (err) {
      console.error(err);
    }
  };

  const uploadFaceFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/api/${faceStudent.student_id}/faces`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Lỗi phân tích khuôn mặt');
      showToast?.('Đã trích xuất & lưu sinh trắc học thành công', 'success');
      openFaceModal(faceStudent);
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  const handleUploadFace = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await uploadFaceFile(file);
    e.target.value = null;
  };

  const handleCaptureAndUpload = async () => {
    if (!capturedImage) {
      showToast?.('Chưa chụp ảnh, vui lòng chụp trước', 'error');
      return;
    }
    const blob = await fetch(capturedImage).then(res => res.blob());
    const file = new File([blob], 'face_capture.jpg', { type: 'image/jpeg' });
    await uploadFaceFile(file);
    stopCamera();
    setCameraActive(false);
    setCapturedImage(null);
  };

  const handleDeleteFace = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa dữ liệu khuôn mặt của sinh viên này?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/${faceStudent.student_id}/faces`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Lỗi xóa khuôn mặt');
      }
      showToast?.('Đã xóa dữ liệu sinh trắc học', 'success');
      openFaceModal(faceStudent);
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  // --- Camera functions ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      setCameraActive(true);
      setCapturedImage(null);
      
      // Đợi React render thẻ <video> rồi mới gán stream
      setTimeout(async () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (e) {
            console.error("Lỗi khi play video:", e);
          }
        }
      }, 50);
    } catch (err) {
      showToast?.('Không thể truy cập camera: ' + err.message, 'error');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg');
    setCapturedImage(dataUrl);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  // --- Styles ---
  const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.9rem', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600, color: '#334155' };
  const valueStyle = { display: 'block', fontSize: 14, color: '#0f172a', padding: '8px 12px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' };

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      
      {/* Hidden file inputs */}
      <input type="file" accept=".xlsx, .xls, .csv" ref={fileInputRef} onChange={handleImportExcel} style={{ display: 'none' }} />
      <input type="file" accept="image/jpeg, image/png, image/jpg" ref={faceInputRef} onChange={handleUploadFace} style={{ display: 'none' }} />

      {/* Header */}
      <div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
        <h2 style={{ margin: 0, color: '#106fa6', fontSize: '1.15rem' }}>Quản lý Sinh viên</h2>
        <button onClick={() => { setCreateForm({ ...emptyForm }); setIsCreateOpen(true); }} style={{ padding: '8px 16px', background: '#106fa6', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
          + Thêm SV
        </button>
      </div>

      {/* ====== Statistics (always visible) ====== */}
      <div style={{ padding: '20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
          <div style={{ background: '#fff', padding: 16, borderRadius: 8, textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 14, color: '#64748b' }}>Tổng số SV</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#0f172a' }}>{stats.total}</div>
          </div>
          <div style={{ background: '#fff', padding: 16, borderRadius: 8, height: 220, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: 14, color: '#334155', textAlign: 'center' }}>Trạng thái</h4>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={30} outerRadius={60} paddingAngle={2} dataKey="value" label>
                  {stats.statusData.map((_, idx) => <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background: '#fff', padding: 16, borderRadius: 8, height: 220, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: 14, color: '#334155', textAlign: 'center' }}>Theo khóa & trạng thái</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.cohortStatusData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="cohort" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                {Object.keys(STATUS_COLORS).map(status => (
                  <Bar key={status} dataKey={status} stackId="a" fill={STATUS_COLORS[status]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: '#fff', padding: 16, borderRadius: 8, height: 220, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: 14, color: '#334155', textAlign: 'center' }}>Theo ngành & trạng thái</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.majorStatusData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="major" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                {Object.keys(STATUS_COLORS).map(status => (
                  <Bar key={status} dataKey={status} fill={STATUS_COLORS[status]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background: '#fff', padding: 16, borderRadius: 8, height: 220, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: 14, color: '#334155', textAlign: 'center' }}>Theo lớp BC & trạng thái</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.classStatusData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="class" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                {Object.keys(STATUS_COLORS).map(status => (
                  <Bar key={status} dataKey={status} fill={STATUS_COLORS[status]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ====== Filter & Import toolbar (between charts and table) ====== */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', background: '#fafafa' }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="MSSV / Họ tên / Lớp..." style={{ ...inputStyle, width: 200 }} />
        <input value={filterClass} onChange={(e) => setFilterClass(e.target.value)} placeholder="Lọc lớp BC" style={{ ...inputStyle, width: 120 }} />
        <select value={filterMajor} onChange={(e) => setFilterMajor(e.target.value)} style={{ ...inputStyle, width: 160 }}>
          <option value="">Tất cả ngành</option>
          {majors.map((m) => (
            <option key={m.major_id} value={m.major_id}>{m.major_name || m.major_id}</option>
          ))}
        </select>
        <button onClick={() => fileInputRef.current.click()} style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
          Import Excel
        </button>
      </div>

      {/* ====== Student Table ====== */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>MSSV</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Họ tên</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Lớp BC</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Khoa</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Ngành</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Trạng thái</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center', color: '#64748b' }}>Đang tải...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center', color: '#94a3b8' }}>Không có dữ liệu</td></tr>
            ) : (
              filtered.map((s) => {
                const id = s.student_id || s.mssv;
                return (
                  <tr key={id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0369a1' }}>{id}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{s.full_name || s.ho_ten}</td>
                    <td style={{ padding: '10px 12px' }}>{s.administrative_class || s.lop_base || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{s.faculty_id || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{s.major_id || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 600,
                        background: (s.academic_status || '').includes('học') ? '#dcfce7' : '#f1f5f9',
                        color: (s.academic_status || '').includes('học') ? '#16a34a' : '#64748b',
                      }}>
                        {s.academic_status || 'Đang học'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openDetail(id)} style={{ padding: '4px 8px', border: '1px solid #0ea5e9', borderRadius: 6, background: '#e0f2fe', color: '#0369a1', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Chi tiết</button>
                        <button onClick={() => openFaceModal(s)} style={{ padding: '4px 8px', border: '1px solid #8b5cf6', borderRadius: 6, background: '#ede9fe', color: '#6d28d9', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Sinh trắc</button>
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

      {/* ====== MODALS ====== */}

      {/* Detail Modal */}
      {isDetailOpen && detailData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 800, maxWidth: '100%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>Hồ sơ sinh viên: <span style={{ color: '#0369a1' }}>{detailData.student_id}</span></h3>
              <button onClick={() => setIsDetailOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>
            <div style={{ padding: 24, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <h4 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 8, color: '#334155', marginTop: 0 }}>Thông tin nhân thân</h4>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div><label style={labelStyle}>Họ và Tên</label><span style={valueStyle}>{detailData.profile?.full_name || detailData.full_name || '—'}</span></div>
                  <div><label style={labelStyle}>Ngày sinh</label><span style={valueStyle}>{detailData.profile?.date_of_birth || detailData.date_of_birth || '—'}</span></div>
                  <div><label style={labelStyle}>Giới tính</label><span style={valueStyle}>{detailData.profile?.gender || detailData.gender || '—'}</span></div>
                  <div><label style={labelStyle}>CCCD/CMND</label><span style={valueStyle}>{detailData.profile?.citizen_id || detailData.citizen_id || '—'}</span></div>
                  <div><label style={labelStyle}>Email cá nhân</label><span style={valueStyle}>{detailData.profile?.personal_email || detailData.email || '—'}</span></div>
                  <div><label style={labelStyle}>Số điện thoại</label><span style={valueStyle}>{detailData.profile?.phone_number || detailData.phone_number || '—'}</span></div>
                  <div><label style={labelStyle}>Nơi sinh</label><span style={valueStyle}>{detailData.profile?.place_of_birth || detailData.place_of_birth || '—'}</span></div>
                  <div><label style={labelStyle}>Địa chỉ</label><span style={valueStyle}>{detailData.profile?.address || detailData.address || '—'}</span></div>
                </div>
              </div>
              <div>
                <h4 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 8, color: '#334155', marginTop: 0 }}>Thông tin học thuật</h4>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div><label style={labelStyle}>Mã SV</label><span style={valueStyle}>{detailData.student_id}</span></div>
                  <div><label style={labelStyle}>Lớp biên chế</label><span style={valueStyle}>{detailData.administrative_class || '—'}</span></div>
                  <div><label style={labelStyle}>Trạng thái</label><span style={{...valueStyle, color: '#16a34a', fontWeight: 600}}>{detailData.academic_status || 'Đang học'}</span></div>
                  <div><label style={labelStyle}>Chuyên ngành</label><span style={valueStyle}>{detailData.specialization || '—'}</span></div>
                  <div><label style={labelStyle}>Ngành (Mã)</label><span style={valueStyle}>{detailData.major_id || '—'}</span></div>
                  <div><label style={labelStyle}>Khoa</label><span style={valueStyle}>{detailData.faculty_id || '—'}</span></div>
                  <div><label style={labelStyle}>Khóa (Cohort)</label><span style={valueStyle}>{detailData.cohort || '—'}</span></div>
                  <div><label style={labelStyle}>Hệ đào tạo</label><span style={valueStyle}>{detailData.training_program || '—'}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== Face Modal with Camera ====== */}
      {isFaceModalOpen && faceStudent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 600, maxWidth: '100%', padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>Sinh trắc học: {faceStudent.full_name || faceStudent.ho_ten}</h3>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: 14 }}>MSSV: {faceStudent.student_id || faceStudent.mssv}</p>

            <div style={{ padding: 16, background: faceStatus.has_face_data ? '#dcfce7' : '#fef2f2', borderRadius: 8, marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 8px', color: faceStatus.has_face_data ? '#16a34a' : '#dc2626' }}>
                {faceStatus.has_face_data ? '✅ Đã có dữ liệu khuôn mặt' : '❌ Chưa có dữ liệu khuôn mặt'}
              </h4>
              <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>
                Hệ thống ghi nhận: <b>{faceStatus.total_vectors || 0}</b> vector đặc trưng.
              </p>
            </div>

            {/* Camera area */}
            <div style={{ marginBottom: 16 }}>
              {!cameraActive && !capturedImage && (
                <button onClick={startCamera} style={{ padding: '12px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', width: '100%', fontSize: '1rem' }}>
                  📷 Mở camera
                </button>
              )}
              {(cameraActive || capturedImage) && (
                <div style={{ marginTop: 8 }}>
                  <div style={{
                    position: 'relative',
                    background: '#000',
                    borderRadius: 8,
                    overflow: 'hidden',
                    width: '100%',
                    paddingTop: '75%', // 4:3 aspect ratio
                  }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {!capturedImage && (
                        <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'contain' }} muted playsInline />
                      )}
                      {capturedImage && (
                        <img src={capturedImage} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      )}
                      <canvas ref={canvasRef} style={{ display: 'none' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {cameraActive && !capturedImage && (
                      <>
                        <button onClick={capturePhoto} style={{ padding: '10px 20px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', flex: '1 1 auto' }}>
                          📸 Chụp ảnh
                        </button>
                        <button onClick={stopCamera} style={{ padding: '10px 20px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', flex: '1 1 auto' }}>
                          Đóng camera
                        </button>
                      </>
                    )}
                    {capturedImage && (
                      <>
                        <button onClick={handleCaptureAndUpload} style={{ padding: '10px 20px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', flex: '1 1 auto' }}>
                          ✅ Lưu & đăng ký
                        </button>
                        <button onClick={retakePhoto} style={{ padding: '10px 20px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', flex: '1 1 auto' }}>
                          Chụp lại
                        </button>
                        <button onClick={() => { setCapturedImage(null); stopCamera(); setCameraActive(false); }} style={{ padding: '10px 20px', background: '#64748b', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', flex: '1 1 auto' }}>
                          Hủy
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Other actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => faceInputRef.current.click()} style={{ padding: '10px 16px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                {faceStatus.has_face_data ? 'Cập nhật ảnh từ file' : 'Đăng ký khuôn mặt từ file'}
              </button>
              {faceStatus.has_face_data && (
                <button onClick={handleDeleteFace} style={{ padding: '10px 16px', background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                  Xóa dữ liệu khuôn mặt
                </button>
              )}
              <button onClick={() => { setIsFaceModalOpen(false); stopCamera(); setCameraActive(false); }} style={{ padding: '10px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
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
              <div>
                <label style={labelStyle}>Chương trình đào tạo</label>
                <select value={createForm.training_program} onChange={(e) => setCreateForm({ ...createForm, training_program: e.target.value })} style={inputStyle}>
                  <option value="">-- Chọn --</option>
                  {TRAINING_PROGRAM_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
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

      {/* Edit Modal */}
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