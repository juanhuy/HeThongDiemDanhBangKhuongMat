import React, { useState, useRef, useEffect } from 'react';
import { 
  Zap, UploadCloud, CheckCircle, XCircle, UserCheck, 
  ClipboardList, AlertTriangle, RefreshCw, FileText, Check, AlertOctagon 
} from 'lucide-react';

const AIAttendance = ({ API_BASE, showToast, onAttendanceLogged, user }) => {
  const role = user?.role || 'sinh_vien';
  const username = user?.username || 'anonymous';

  // Determine default tab based on role
  const getDefaultTab = () => {
    if (role === 'admin') return 'pending_faces';
    if (role === 'giang_vien') return 'manual_checkin';
    return 'submit_leave';
  };

  const [activeTab, setActiveTab] = useState(getDefaultTab());

  // --- Admin Tab States ---
  const [pendingFaces, setPendingFaces] = useState([]);
  const [regMssv, setRegMssv] = useState('');
  const [regName, setRegName] = useState('');
  const [regLop, setRegLop] = useState('');
  const [regPhoto, setRegPhoto] = useState(null);
  const [regPhotoName, setRegPhotoName] = useState('');
  
  const [schClass, setSchClass] = useState('D22CQCNPM02-N');
  const [schDate, setSchDate] = useState(new Date().toISOString().substring(0, 10));
  const [schRoom, setSchRoom] = useState('A2-301');
  const [schTime, setSchTime] = useState('07:30');

  const [subCode, setSubCode] = useState('');
  const [subName, setSubName] = useState('');
  const [ccCode, setCcCode] = useState('');
  const [ccSub, setCcSub] = useState('');

  // --- Teacher Tab States ---
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [manualMssv, setManualMssv] = useState('');
  const [manualSessionId, setManualSessionId] = useState('1');
  const [manualStatus, setManualStatus] = useState('Đúng giờ');
  const [reportClass, setReportClass] = useState('D22CQCNPM02-N');
  const [attendanceReport, setAttendanceReport] = useState([]);

  // --- Optimization States ---
  const [studentsList, setStudentsList] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [manualClass, setManualClass] = useState('D22CQCNPM02-N');
  const [manualClassStudents, setManualClassStudents] = useState([]);
  const [manualLoading, setManualLoading] = useState(false);

  // --- Student Tab States ---
  const [leaveSessionId, setLeaveSessionId] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveProof, setLeaveProof] = useState('Giấy khám sức khỏe / Lý do cá nhân');

  // --- AI Recognition States ---
  const [recognizeImageSrc, setRecognizeImageSrc] = useState('');
  const [recognizeFile, setRecognizeFile] = useState(null);
  const [cameraRoom, setCameraRoom] = useState('A2-301');
  const [detectionLogs, setDetectionLogs] = useState([]);
  
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);

  // Fetch pending actions or reports
  useEffect(() => {
    if (role === 'admin' && activeTab === 'pending_faces') {
      fetchPendingFaces();
    } else if (role === 'giang_vien' && activeTab === 'leave_requests') {
      fetchLeaveRequests();
    } else if (activeTab === 'students_list') {
      fetchStudentsList();
    }
  }, [activeTab]);

  const fetchStudentsList = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/students`);
      if (res.ok) {
        const data = await res.json();
        setStudentsList(data.students || []);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách sinh viên:", err);
    }
  };

  const fetchManualClassStudents = async () => {
    if (!manualClass) {
      showToast("Vui lòng nhập mã lớp tín chỉ.", "danger");
      return;
    }
    setManualLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports/attendance?ma_lop_tc=${manualClass}`);
      if (res.ok) {
        const data = await res.json();
        setManualClassStudents(data.report || []);
        showToast(`Đã tải danh sách sinh viên lớp ${manualClass}`);
      } else {
        showToast("Lỗi tải danh sách lớp.", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    } finally {
      setManualLoading(false);
    }
  };

  const handleQuickCheckin = async (mssv, status) => {
    if (!manualSessionId) {
      showToast("Vui lòng nhập mã buổi học trước khi điểm danh.", "danger");
      return;
    }
    const formData = new FormData();
    formData.append("mssv", mssv);
    formData.append("ma_buoi_hoc", manualSessionId);
    formData.append("trang_thai", status);
    formData.append("nguoi_xac_nhan", username);

    try {
      const res = await fetch(`${API_BASE}/api/teacher/manual_checkin`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Đã điểm danh '${status}' cho ${mssv}`);
        fetchManualClassStudents();
        if (onAttendanceLogged) onAttendanceLogged();
      } else {
        showToast(data.detail || "Cập nhật thất bại.", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const fetchPendingFaces = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/pending_faces`);
      if (res.ok) {
        const data = await res.json();
        setPendingFaces(data.pending);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/teacher/leave_requests`);
      if (res.ok) {
        const data = await res.json();
        setLeaveRequests(data.requests);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveFace = async (mssv) => {
    const formData = new FormData();
    formData.append("mssv", mssv);
    try {
      const res = await fetch(`${API_BASE}/api/admin/approve_face`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        showToast(`Đã duyệt hồ sơ khuôn mặt cho SV ${mssv}`);
        fetchPendingFaces();
      } else {
        showToast("Lỗi duyệt hồ sơ.", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const handleApproveLeave = async (reqId) => {
    const formData = new FormData();
    formData.append("request_id", reqId);
    formData.append("nguoi_duyet", username);
    try {
      const res = await fetch(`${API_BASE}/api/teacher/approve_leave`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        showToast("Đã duyệt đơn nghỉ phép có phép.");
        fetchLeaveRequests();
        if (onAttendanceLogged) onAttendanceLogged();
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const handleRejectLeave = async (reqId) => {
    const formData = new FormData();
    formData.append("request_id", reqId);
    formData.append("nguoi_duyet", username);
    try {
      const res = await fetch(`${API_BASE}/api/teacher/reject_leave`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        showToast("Đã từ chối đơn nghỉ phép.", "warning");
        fetchLeaveRequests();
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const handleManualCheckinSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("mssv", manualMssv);
    formData.append("ma_buoi_hoc", manualSessionId);
    formData.append("trang_thai", manualStatus);
    formData.append("nguoi_xac_nhan", username);

    try {
      const res = await fetch(`${API_BASE}/api/teacher/manual_checkin`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message);
        setManualMssv('');
        setManualSessionId('');
        if (onAttendanceLogged) onAttendanceLogged();
      } else {
        showToast(data.detail || "Thất bại.", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const fetchAttendanceReport = async () => {
    if (!reportClass) {
      showToast("Vui lòng nhập mã lớp tín chỉ.", "danger");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/reports/attendance?ma_lop_tc=${reportClass}`);
      if (res.ok) {
        const data = await res.json();
        setAttendanceReport(data.report);
        showToast(`Đã tổng kết dữ liệu lớp ${reportClass}`);
      } else {
        showToast("Lỗi truy vấn báo cáo.", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const handleLeaveRequestSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("mssv", user.mssv || "");
    formData.append("ma_buoi_hoc", leaveSessionId);
    formData.append("ly_do", leaveReason);
    formData.append("minh_chung", leaveProof);

    try {
      const res = await fetch(`${API_BASE}/api/student/leave_request`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        showToast("Nộp đơn xin nghỉ phép thành công! Đang chờ Giảng viên duyệt.");
        setLeaveSessionId('');
        setLeaveReason('');
      } else {
        showToast("Không thể gửi đơn xin nghỉ.", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  // AI photo upload for refresh biometrics (updates face_vector and sets Pending)
  const handleRefreshBiometrics = async (e) => {
    e.preventDefault();
    if (!regPhoto) {
      showToast("Vui lòng chọn ảnh chân dung mới.", "danger");
      return;
    }

    const formData = new FormData();
    formData.append("mssv", user.mssv || "");
    formData.append("ho_ten", user.ho_ten || user.username);
    formData.append("lop_base", user.lop_base || "");
    formData.append("file", regPhoto);

    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Đã gửi yêu cầu cập nhật sinh trắc học! Chờ Admin phê duyệt.");
        setRegPhoto(null);
        setRegPhotoName('');
      } else {
        showToast(data.detail || "Cập nhật thất bại.", "danger");
      }
    } catch (err) {
      showToast("Lỗi máy chủ.", "danger");
    }
  };

  const processImage = (file) => {
    if (!file.type.startsWith("image/")) {
      showToast("Vui lòng tải lên file ảnh chân dung.", "danger");
      return;
    }
    setRecognizeFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setRecognizeImageSrc(e.target.result);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processImage(files[0]);
    }
  };

  const triggerRecognition = async () => {
    if (!recognizeFile) {
      showToast("Vui lòng chọn ảnh để đối chiếu.", "danger");
      return;
    }

    const formData = new FormData();
    formData.append("file", recognizeFile);
    showToast("AI đang xử lý quy trình quét điểm danh...");

    try {
      const url = `${API_BASE}/api/recognize?phong_hoc=${encodeURIComponent(cameraRoom)}`;
      const res = await fetch(url, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Nhận diện xong! Ghi nhận điểm danh thành công.`);
        drawBoundingBoxes(data.results);
        setDetectionLogs(data.results);
        if (onAttendanceLogged) {
          onAttendanceLogged();
        }
      } else {
        showToast(data.detail || "Lỗi xử lý đối chiếu", "danger");
      }
    } catch (err) {
      showToast("Hệ thống hủy quét: " + (err.message || "Lỗi kết nối."), "danger");
    }
  };

  const drawBoundingBoxes = (results) => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / img.naturalWidth;
    const scaleY = canvas.height / img.naturalHeight;

    results.forEach(res => {
      const [x1, y1, x2, y2] = res.box;
      const bx = x1 * scaleX;
      const by = y1 * scaleY;
      const bw = (x2 - x1) * scaleX;
      const bh = (y2 - y1) * scaleY;

      const color = res.is_known ? "#10b981" : "#ef4444";

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(bx, by, bw, bh);

      ctx.fillStyle = color;
      ctx.font = "bold 13px 'Inter', sans-serif";
      const label = res.is_known ? `${res.fullname} - ${res.trang_thai}` : "Chưa đăng ký";
      const textWidth = ctx.measureText(label).width;

      ctx.fillRect(bx, by - 24, textWidth + 14, 24);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, bx + 7, by - 7);
    });
  };

  const resetRecognition = () => {
    setRecognizeFile(null);
    setRecognizeImageSrc('');
    setDetectionLogs([]);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regPhoto) {
      showToast("Vui lòng chọn ảnh chân dung sinh viên.", "danger");
      return;
    }

    const formData = new FormData();
    formData.append("mssv", regMssv);
    formData.append("ho_ten", regName);
    formData.append("lop_base", regLop);
    formData.append("file", regPhoto);

    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Đã lưu thông tin hồ sơ ở trạng thái chờ duyệt (Pending)!");
        setRegPhoto(null);
        setRegPhotoName('');
        setRegMssv('');
        setRegName('');
        setRegLop('');
      } else {
        showToast(data.detail || "Đăng ký thất bại.", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ.", "danger");
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    const timeVal = schTime + (schTime.length === 5 ? ":00" : "");
    const formData = new FormData();
    formData.append("ma_lop_tc", schClass);
    formData.append("ngay_hoc", schDate);
    formData.append("phong_hoc", schRoom);
    formData.append("gio_bat_dau", timeVal);

    try {
      const res = await fetch(`${API_BASE}/api/lich_hoc_chi_tiet`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        showToast("Thêm lịch học thành công!");
        setSchRoom('');
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("ma_mon", subCode);
    formData.append("ten_mon", subName);

    try {
      const res = await fetch(`${API_BASE}/api/mon_hoc`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        showToast("Đã lưu môn học mới.");
        setSubCode('');
        setSubName('');
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const handleCreateCreditClass = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("ma_lop_tc", ccCode);
    formData.append("ma_mon", ccSub);

    try {
      const res = await fetch(`${API_BASE}/api/lop_tin_chi`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        showToast("Đã lưu lớp tín chỉ.");
        setCcCode('');
        setCcSub('');
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const renderStudentsListTab = () => {
    const filteredStudents = studentsList.filter(st => {
      const matchSearch = st.mssv.toLowerCase().includes(searchKeyword.toLowerCase()) || 
                          st.ho_ten.toLowerCase().includes(searchKeyword.toLowerCase());
      const matchClass = filterClass ? st.lop_base.toLowerCase().includes(filterClass.toLowerCase()) : true;
      return matchSearch && matchClass;
    });

    return (
      <div>
        <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0 0 10px 0" }}>Danh sách Sinh viên hệ thống</h4>
        
        <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
          <input 
            style={styles.input} 
            placeholder="Tìm theo MSSV, Họ tên..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
          <input 
            style={{ ...styles.input, width: "130px" }} 
            placeholder="Lọc theo Lớp"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
          />
          <button onClick={fetchStudentsList} style={{ ...styles.btn, padding: "8px 12px" }}>
            Làm mới
          </button>
        </div>

        {filteredStudents.length === 0 ? (
          <p style={{ fontSize: "0.8rem", color: "#6c8da3" }}>Không tìm thấy sinh viên nào.</p>
        ) : (
          <div style={{ overflowY: "auto", maxHeight: "400px" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>MSSV / Họ Tên</th>
                  <th style={styles.th}>Lớp Chuyên Ngành</th>
                  <th style={styles.th}>Ngày sinh / Giới tính</th>
                  <th style={styles.th}>Trạng thái Face</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((st) => (
                  <tr key={st.mssv}>
                    <td style={styles.td}>
                      <strong>{st.ho_ten}</strong><br/>
                      <small style={{ color: "#777" }}>{st.mssv}</small>
                    </td>
                    <td style={styles.td}>{st.lop_base}</td>
                    <td style={styles.td}>
                      <small>{st.ngay_sinh || 'N/A'}</small><br/>
                      <small>{st.gioi_tinh || 'N/A'}</small>
                    </td>
                    <td style={styles.td}>
                      <span style={{ 
                        padding: "3px 6px", 
                        borderRadius: "4px", 
                        fontSize: "0.75rem",
                        backgroundColor: st.trang_thai_ho_so === 'Approved' ? "#e6f8f0" : "#fff7e6",
                        color: st.trang_thai_ho_so === 'Approved' ? "#10b981" : "#d48806"
                      }}>
                        {st.trang_thai_ho_so || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const styles = {
    card: {
      backgroundColor: "#ffffff",
      border: "1px solid #d0e0eb",
      borderRadius: "10px",
      overflow: "hidden",
      boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
    },
    cardHeader: {
      backgroundColor: "#ffffff",
      padding: "12px 20px",
      borderBottom: "1px solid #e2edf5",
      color: "#106fa6",
      fontWeight: "600",
      fontSize: "0.95rem",
      display: "flex",
      alignItems: "center",
      gap: "8px"
    },
    cardBody: {
      padding: "20px"
    },
    aiContainer: {
      display: "grid",
      gridTemplateColumns: "1.3fr 1.2fr",
      gap: "1.5rem"
    },
    dropzone: {
      position: "relative",
      width: "100%",
      minHeight: "260px",
      border: "2px dashed #b9d5e8",
      borderRadius: "8px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      cursor: "pointer",
      background: "#f8fbfd",
      overflow: "hidden"
    },
    dropzonePrompt: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "10px",
      textAlign: "center",
      color: "#6c8da3",
      padding: "2rem"
    },
    previewWrapper: {
      position: "relative",
      maxWidth: "100%"
    },
    previewImage: {
      width: "100%",
      display: "block",
      borderRadius: "6px"
    },
    detectionCanvas: {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none"
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      marginBottom: "12px"
    },
    label: {
      fontSize: "0.8rem",
      fontWeight: "600",
      color: "#54738c"
    },
    input: {
      background: "#ffffff",
      border: "1px solid #d0e0eb",
      borderRadius: "6px",
      padding: "8px 12px",
      color: "#1c3240",
      fontSize: "0.9rem",
      outline: "none"
    },
    btn: {
      backgroundColor: "#1d92d1",
      color: "#ffffff",
      border: "none",
      borderRadius: "6px",
      padding: "10px 18px",
      fontSize: "0.9rem",
      fontWeight: "600",
      cursor: "pointer",
      display: "inline-flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "8px",
      transition: "background-color 0.2s"
    },
    btnSecondary: {
      backgroundColor: "#f0f4f8",
      border: "1px solid #d0e0eb",
      color: "#106fa6"
    },
    tabs: {
      display: "flex",
      borderBottom: "1px solid #d0e0eb",
      gap: "1rem",
      marginBottom: "1.25rem",
      flexWrap: "wrap"
    },
    tabBtn: {
      background: "none",
      border: "none",
      color: "#6c8da3",
      fontSize: "0.85rem",
      fontWeight: "500",
      padding: "8px 4px 10px 4px",
      cursor: "pointer",
      position: "relative"
    },
    tabBtnActive: {
      color: "#1d92d1",
      fontWeight: "600"
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      marginTop: "8px",
      fontSize: "0.85rem"
    },
    th: {
      backgroundColor: "#f0f4f8",
      color: "#106fa6",
      textAlign: "left",
      padding: "8px 10px",
      borderBottom: "1px solid #d0e0eb"
    },
    td: {
      padding: "8px 10px",
      borderBottom: "1px solid #eef3f7",
      color: "#2a3d4a"
    }
  };

  if (role === 'sinh_vien') {
    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <ClipboardList size={16} /> Gửi yêu cầu nghỉ phép
        </div>
        <div style={styles.cardBody}>
          <form onSubmit={handleLeaveRequestSubmit}>
            <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0 0 10px 0" }}>Nộp đơn xin phép nghỉ buổi học</h4>
            <div style={styles.formGroup}>
              <label style={styles.label}>Mã buổi học nghỉ phép</label>
              <input 
                type="number" 
                required 
                placeholder="Mã số buổi học trong lịch học (ví dụ: 1)"
                style={styles.input}
                value={leaveSessionId}
                onChange={(e) => setLeaveSessionId(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Lý do xin nghỉ</label>
              <textarea 
                required 
                rows={3}
                placeholder="Nêu rõ lý do (VD: Bị ốm có giấy ra viện, Lý do gia đình...)"
                style={{ ...styles.input, resize: "none" }}
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Minh chứng đính kèm</label>
              <input 
                type="text" 
                style={styles.input}
                value={leaveProof}
                onChange={(e) => setLeaveProof(e.target.value)}
              />
            </div>
            <button type="submit" style={{ ...styles.btn, width: "100%", marginTop: "10px" }}>Nộp đơn xin nghỉ</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <Zap size={16} /> Bảng điều khiển phân hệ chuyên cần (Quyền: {role.toUpperCase()})
      </div>
      <div style={styles.cardBody}>
        <div style={styles.aiContainer}>
          {/* Trái: Camera mô phỏng quét khuôn mặt */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#54738c" }}>Camera tại phòng:</span>
              <input 
                style={{ ...styles.input, padding: "4px 8px", width: "100px" }} 
                value={cameraRoom} 
                onChange={(e) => setCameraRoom(e.target.value)} 
              />
            </div>
            
            <div 
              style={styles.dropzone}
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                style={{ display: "none" }} 
                onChange={(e) => { if(e.target.files.length > 0) processImage(e.target.files[0]); }} 
              />
              
              {!recognizeImageSrc ? (
                <div style={styles.dropzonePrompt}>
                  <UploadCloud size={40} color="#1d92d1" />
                  <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "#106fa6" }}>
                    Tải ảnh từ Camera lớp học để quét tự động (Event-Driven)
                  </p>
                  <p style={{ fontSize: "0.75rem" }}>Bản ghi được đối chiếu và xử lý 6 bước tự động</p>
                </div>
              ) : (
                <div style={styles.previewWrapper}>
                  <img 
                    ref={imageRef} 
                    src={recognizeImageSrc} 
                    alt="Preview" 
                    style={styles.previewImage} 
                    onLoad={() => {
                      if (canvasRef.current && imageRef.current) {
                        canvasRef.current.width = imageRef.current.clientWidth;
                        canvasRef.current.height = imageRef.current.clientHeight;
                      }
                    }}
                  />
                  <canvas ref={canvasRef} style={styles.detectionCanvas}></canvas>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                onClick={resetRecognition}
                className="btn btn-secondary" 
                style={{ ...styles.btn, ...styles.btnSecondary }}
              >
                Làm mới
              </button>
              <button onClick={triggerRecognition} style={styles.btn}>
                Quét khuôn mặt (AI Check-in)
              </button>
            </div>

            {detectionLogs.length > 0 && (
              <div style={{ background: "#f8fbfd", padding: "10px", borderRadius: "6px", border: "1px solid #d0e0eb" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#106fa6" }}>Kết quả kiểm tra luồng khuôn mặt:</span>
                <ul style={{ margin: "5px 0 0 15px", padding: 0, fontSize: "0.8rem" }}>
                  {detectionLogs.map((l, idx) => (
                    <li key={idx} style={{ color: l.is_known ? "#10b981" : "#ef4444" }}>
                      {l.is_known ? `✓ ${l.fullname} (${l.mssv}): Điểm danh trạng thái: ${l.trang_thai}` : `✗ Không thể điểm danh: Khuôn mặt lạ.`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Phải: Các phân hệ Quản lý & Nghiệp vụ theo vai trò */}
          <div style={{ borderLeft: "1px solid #d0e0eb", paddingLeft: "1.5rem" }}>
            
            {/* TABS CHO ADMIN */}
            {role === 'admin' && (
              <>
                <div style={styles.tabs}>
                  <button 
                    style={{ ...styles.tabBtn, ...(activeTab === 'pending_faces' ? styles.tabBtnActive : {}) }}
                    onClick={() => setActiveTab('pending_faces')}
                  >
                    Duyệt hồ sơ Face ID
                  </button>
                  <button 
                    style={{ ...styles.tabBtn, ...(activeTab === 'students_list' ? styles.tabBtnActive : {}) }}
                    onClick={() => setActiveTab('students_list')}
                  >
                    Danh sách SV
                  </button>
                  <button 
                    style={{ ...styles.tabBtn, ...(activeTab === 'attendance' ? styles.tabBtnActive : {}) }}
                    onClick={() => setActiveTab('attendance')}
                  >
                    Đăng ký SV mới
                  </button>
                  <button 
                    style={{ ...styles.tabBtn, ...(activeTab === 'schedule' ? styles.tabBtnActive : {}) }}
                    onClick={() => setActiveTab('schedule')}
                  >
                    Lịch học
                  </button>
                  <button 
                    style={{ ...styles.tabBtn, ...(activeTab === 'structure' ? styles.tabBtnActive : {}) }}
                    onClick={() => setActiveTab('structure')}
                  >
                    Cấu trúc lớp
                  </button>
                </div>

                {activeTab === 'pending_faces' && (
                  <div>
                    <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0 0 10px 0" }}>Hồ sơ ảnh khuôn mặt đang chờ hậu kiểm</h4>
                    {pendingFaces.length === 0 ? (
                      <p style={{ fontSize: "0.8rem", color: "#6c8da3" }}>Hiện không có hồ sơ khuôn mặt nào cần duyệt.</p>
                    ) : (
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>MSSV</th>
                            <th style={styles.th}>Họ Tên</th>
                            <th style={styles.th}>Lớp</th>
                            <th style={styles.th}>Hành động</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingFaces.map((f, i) => (
                            <tr key={i}>
                              <td style={styles.td}>{f.mssv}</td>
                              <td style={styles.td}>{f.ho_ten}</td>
                              <td style={styles.td}>{f.lop_base}</td>
                              <td style={styles.td}>
                                <button 
                                  onClick={() => handleApproveFace(f.mssv)}
                                  style={{ ...styles.btn, padding: "4px 8px", fontSize: "0.75rem" }}
                                >
                                  Duyệt ảnh
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {activeTab === 'attendance' && (
                  <form onSubmit={handleRegister}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>MSSV</label>
                      <input 
                        type="text" 
                        required 
                        style={styles.input} 
                        value={regMssv}
                        onChange={(e) => setRegMssv(e.target.value.toUpperCase())}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Họ tên sinh viên</label>
                      <input 
                        type="text" 
                        required 
                        style={styles.input} 
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Lớp chuyên ngành</label>
                      <input 
                        type="text" 
                        required 
                        style={styles.input} 
                        value={regLop}
                        onChange={(e) => setRegLop(e.target.value)}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Ảnh đại diện / Ảnh gốc chụp thẻ SV</label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        id="reg-photo-file-ptit-admin" 
                        style={{ display: "none" }}
                        onChange={(e) => {
                          if(e.target.files.length > 0) {
                            setRegPhoto(e.target.files[0]);
                            setRegPhotoName(e.target.files[0].name);
                          }
                        }}
                      />
                      <button 
                        type="button" 
                        style={{ ...styles.btn, ...styles.btnSecondary, padding: "8px 14px", fontSize: "0.8rem" }}
                        onClick={() => document.getElementById("reg-photo-file-ptit-admin").click()}
                      >
                        Chọn file ảnh gốc
                      </button>
                      {regPhotoName && (
                        <div style={{ fontSize: "0.75rem", color: "#10b981", marginTop: "4px" }}>
                          ✓ {regPhotoName}
                        </div>
                      )}
                    </div>
                    <button type="submit" style={{ ...styles.btn, width: "100%", marginTop: "10px" }}>Đăng ký (Chờ duyệt)</button>
                  </form>
                )}

                {activeTab === 'schedule' && (
                  <form onSubmit={handleCreateSchedule}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Lớp tín chỉ</label>
                      <input 
                        type="text" 
                        required 
                        style={styles.input} 
                        value={schClass}
                        onChange={(e) => setSchClass(e.target.value)}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Ngày học</label>
                      <input 
                        type="date" 
                        required 
                        style={styles.input} 
                        value={schDate}
                        onChange={(e) => setSchDate(e.target.value)}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Phòng học</label>
                      <input 
                        type="text" 
                        required 
                        style={styles.input} 
                        value={schRoom}
                        onChange={(e) => setSchRoom(e.target.value)}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Giờ bắt đầu</label>
                      <input 
                        type="time" 
                        required 
                        style={styles.input} 
                        value={schTime}
                        onChange={(e) => setSchTime(e.target.value)}
                      />
                    </div>
                    <button type="submit" style={{ ...styles.btn, width: "100%", marginTop: "10px" }}>Thêm buổi học</button>
                  </form>
                )}

                {activeTab === 'structure' && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <form onSubmit={handleCreateSubject}>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Tạo môn học gốc</label>
                        <input 
                          type="text" 
                          placeholder="Mã môn (VD: INT1306)" 
                          required 
                          style={{ ...styles.input, marginBottom: "6px" }}
                          value={subCode}
                          onChange={(e) => setSubCode(e.target.value)}
                        />
                        <input 
                          type="text" 
                          placeholder="Tên môn học" 
                          required 
                          style={styles.input}
                          value={subName}
                          onChange={(e) => setSubName(e.target.value)}
                        />
                      </div>
                      <button type="submit" style={{ ...styles.btn, width: "100%", padding: "8px" }}>Tạo môn học</button>
                    </form>
                  </div>
                )}
                {activeTab === 'students_list' && renderStudentsListTab()}
              </>
            )}

            {/* TABS CHO GIẢNG VIÊN */}
            {role === 'giang_vien' && (
              <>
                <div style={styles.tabs}>
                  <button 
                    style={{ ...styles.tabBtn, ...(activeTab === 'manual_checkin' ? styles.tabBtnActive : {}) }}
                    onClick={() => setActiveTab('manual_checkin')}
                  >
                    Điểm danh thủ công
                  </button>
                  <button 
                    style={{ ...styles.tabBtn, ...(activeTab === 'leave_requests' ? styles.tabBtnActive : {}) }}
                    onClick={() => setActiveTab('leave_requests')}
                  >
                    Đơn xin nghỉ phép
                  </button>
                  <button 
                    style={{ ...styles.tabBtn, ...(activeTab === 'students_list' ? styles.tabBtnActive : {}) }}
                    onClick={() => setActiveTab('students_list')}
                  >
                    Danh sách SV
                  </button>
                  <button 
                    style={{ ...styles.tabBtn, ...(activeTab === 'summary_report' ? styles.tabBtnActive : {}) }}
                    onClick={() => setActiveTab('summary_report')}
                  >
                    Tổng kết & Cấm thi
                  </button>
                </div>

                {activeTab === 'manual_checkin' && (
                  <div>
                    <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0 0 10px 0" }}>Điểm danh nhanh lớp học phần</h4>
                    <div style={{ display: "flex", gap: "10px", marginBottom: "15px", alignItems: "flex-end" }}>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Mã lớp tín chỉ</label>
                        <input 
                          style={styles.input} 
                          value={manualClass}
                          onChange={(e) => setManualClass(e.target.value)}
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Mã buổi học</label>
                        <input 
                          style={{ ...styles.input, width: "80px" }} 
                          value={manualSessionId}
                          onChange={(e) => setManualSessionId(e.target.value)}
                        />
                      </div>
                      <button 
                        onClick={fetchManualClassStudents} 
                        disabled={manualLoading}
                        style={{ ...styles.btn, height: "40px" }}
                      >
                        {manualLoading ? "Đang tải..." : "Tải danh sách"}
                      </button>
                    </div>

                    {manualClassStudents.length > 0 ? (
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>MSSV / Họ Tên</th>
                            <th style={styles.th}>Lớp Base</th>
                            <th style={styles.th}>Điểm danh nhanh</th>
                          </tr>
                        </thead>
                        <tbody>
                          {manualClassStudents.map((st) => (
                            <tr key={st.mssv}>
                              <td style={styles.td}>
                                <strong>{st.ho_ten}</strong><br/>
                                <small style={{ color: "#777" }}>{st.mssv}</small>
                              </td>
                              <td style={styles.td}>{st.lop_base}</td>
                              <td style={styles.td}>
                                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                  <button 
                                    onClick={() => handleQuickCheckin(st.mssv, "Đúng giờ")}
                                    style={{ ...styles.btn, padding: "4px 8px", fontSize: "0.75rem", backgroundColor: "#10b981" }}
                                  >
                                    Đúng giờ
                                  </button>
                                  <button 
                                    onClick={() => handleQuickCheckin(st.mssv, "Đi muộn")}
                                    style={{ ...styles.btn, padding: "4px 8px", fontSize: "0.75rem", backgroundColor: "#f59e0b" }}
                                  >
                                    Muộn
                                  </button>
                                  <button 
                                    onClick={() => handleQuickCheckin(st.mssv, "Có phép")}
                                    style={{ ...styles.btn, padding: "4px 8px", fontSize: "0.75rem", backgroundColor: "#3b82f6" }}
                                  >
                                    Phép
                                  </button>
                                  <button 
                                    onClick={() => handleQuickCheckin(st.mssv, "Vắng không phép")}
                                    style={{ ...styles.btn, padding: "4px 8px", fontSize: "0.75rem", backgroundColor: "#ef4444" }}
                                  >
                                    Vắng
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p style={{ fontSize: "0.8rem", color: "#6c8da3" }}>Vui lòng nhập mã lớp tín chỉ và chọn tải danh sách sinh viên lớp học để điểm danh nhanh.</p>
                    )}

                    <hr style={{ margin: "20px 0", borderColor: "#eef3f7" }} />

                    {/* Single Checkin Form Fallback */}
                    <form onSubmit={handleManualCheckinSubmit}>
                      <h5 style={{ color: "#54738c", fontSize: "0.8rem", margin: "0 0 10px 0" }}>Điểm danh thủ công bằng MSSV</h5>
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>MSSV</label>
                          <input 
                            type="text" 
                            required 
                            placeholder="MSSV cần điểm danh"
                            style={styles.input}
                            value={manualMssv}
                            onChange={(e) => setManualMssv(e.target.value.toUpperCase())}
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Trạng thái</label>
                          <select 
                            style={styles.input}
                            value={manualStatus}
                            onChange={(e) => setManualStatus(e.target.value)}
                          >
                            <option value="Đúng giờ">Đúng giờ</option>
                            <option value="Đi muộn">Đi muộn</option>
                            <option value="Có phép">Có phép</option>
                            <option value="Vắng không phép">Vắng không phép</option>
                          </select>
                        </div>
                        <button type="submit" style={{ ...styles.btn, alignSelf: "flex-end", height: "40px" }}>Cập nhật</button>
                      </div>
                    </form>
                  </div>
                )}

                {activeTab === 'leave_requests' && (
                  <div>
                    <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0 0 10px 0" }}>Đơn nghỉ phép học phần của sinh viên</h4>
                    {leaveRequests.length === 0 ? (
                      <p style={{ fontSize: "0.8rem", color: "#6c8da3" }}>Không có đơn xin nghỉ phép nào cần xử lý.</p>
                    ) : (
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>MSSV</th>
                            <th style={styles.th}>Buổi học</th>
                            <th style={styles.th}>Lý do</th>
                            <th style={styles.th}>Trạng thái</th>
                            <th style={styles.th}>Duyệt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaveRequests.map((l, i) => (
                            <tr key={i}>
                              <td style={styles.td}>
                                <strong>{l.ho_ten}</strong><br/>
                                <small style={{ color: "#777" }}>{l.mssv}</small>
                              </td>
                              <td style={styles.td}>
                                <small>Lớp: {l.ma_lop_tc}</small><br/>
                                <small>Ngày: {l.ngay_hoc}</small>
                              </td>
                              <td style={styles.td}>{l.ly_do}</td>
                              <td style={styles.td}>
                                <span style={{ 
                                  padding: "3px 6px", 
                                  borderRadius: "4px", 
                                  fontSize: "0.75rem",
                                  backgroundColor: l.trang_thai === 'Approved' ? "#e6f8f0" : l.trang_thai === 'Pending' ? "#fff7e6" : "#fdf0f0",
                                  color: l.trang_thai === 'Approved' ? "#10b981" : l.trang_thai === 'Pending' ? "#d48806" : "#ef4444"
                                }}>
                                  {l.trang_thai}
                                </span>
                              </td>
                              <td style={styles.td}>
                                {l.trang_thai === 'Pending' && (
                                  <div style={{ display: "flex", gap: "5px" }}>
                                    <button 
                                      onClick={() => handleApproveLeave(l.id)} 
                                      style={{ ...styles.btn, padding: "3px 6px", fontSize: "0.7rem", backgroundColor: "#10b981" }}
                                    >
                                      Duyệt
                                    </button>
                                    <button 
                                      onClick={() => handleRejectLeave(l.id)} 
                                      style={{ ...styles.btn, padding: "3px 6px", fontSize: "0.7rem", backgroundColor: "#ef4444" }}
                                    >
                                      Hủy
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {activeTab === 'summary_report' && (
                  <div>
                    <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0 0 10px 0" }}>Tổng kết Chuyên cần học kỳ & Cảnh báo Cấm thi</h4>
                    <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
                      <input 
                        style={styles.input} 
                        placeholder="Nhập mã lớp tín chỉ"
                        value={reportClass}
                        onChange={(e) => setReportClass(e.target.value)}
                      />
                      <button onClick={fetchAttendanceReport} style={styles.btn}>Tổng kết lớp</button>
                    </div>

                    {attendanceReport.length > 0 && (
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>MSSV</th>
                            <th style={styles.th}>Họ Tên</th>
                            <th style={styles.th}>Muộn</th>
                            <th style={styles.th}>Vắng KP</th>
                            <th style={styles.th}>Vắng CP</th>
                            <th style={styles.th}>Điểm CC</th>
                            <th style={styles.th}>Tỷ lệ vắng</th>
                            <th style={styles.th}>Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceReport.map((student, idx) => {
                            const isBanned = student.trang_thai === "Cam thi";
                            return (
                              <tr key={idx} style={{ backgroundColor: isBanned ? "#fff2f2" : "transparent" }}>
                                <td style={styles.td}>{student.mssv}</td>
                                <td style={styles.td}>
                                  <strong>{student.ho_ten}</strong>
                                </td>
                                <td style={styles.td}>{student.di_muon}</td>
                                <td style={styles.td}>{student.vang_kp}</td>
                                <td style={styles.td}>{student.co_phep}</td>
                                <td style={{ ...styles.td, fontWeight: "bold" }}>{student.score}</td>
                                <td style={styles.td}>{student.ty_le_vang}%</td>
                                <td style={styles.td}>
                                  {isBanned ? (
                                    <span style={{ color: "#ef4444", fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                                      <AlertOctagon size={12} /> Cấm thi
                                    </span>
                                  ) : (
                                    <span style={{ color: "#10b981", fontWeight: "600" }}>Hợp lệ</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
                {activeTab === 'students_list' && renderStudentsListTab()}
              </>
            )}

            {/* TABS CHO SINH VIÊN */}
            {role === 'sinh_vien' && (
              <>
                <div style={styles.tabs}>
                  <button 
                    style={{ ...styles.tabBtn, ...(activeTab === 'submit_leave' ? styles.tabBtnActive : {}) }}
                    onClick={() => setActiveTab('submit_leave')}
                  >
                    Xin nghỉ phép
                  </button>
                  <button 
                    style={{ ...styles.tabBtn, ...(activeTab === 'refresh_biometrics' ? styles.tabBtnActive : {}) }}
                    onClick={() => setActiveTab('refresh_biometrics')}
                  >
                    Sinh trắc học Face ID
                  </button>
                </div>

                {activeTab === 'submit_leave' && (
                  <form onSubmit={handleLeaveRequestSubmit}>
                    <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0 0 10px 0" }}>Nộp đơn xin phép nghỉ buổi học</h4>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Mã buổi học nghỉ phép</label>
                      <input 
                        type="number" 
                        required 
                        placeholder="Mã số buổi học trong lịch học (ví dụ: 1)"
                        style={styles.input}
                        value={leaveSessionId}
                        onChange={(e) => setLeaveSessionId(e.target.value)}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Lý do xin nghỉ</label>
                      <textarea 
                        required 
                        rows={3}
                        placeholder="Nêu rõ lý do (VD: Bị ốm có giấy ra viện, Lý do gia đình...)"
                        style={{ ...styles.input, resize: "none" }}
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Minh chứng đính kèm</label>
                      <input 
                        type="text" 
                        style={styles.input}
                        value={leaveProof}
                        onChange={(e) => setLeaveProof(e.target.value)}
                      />
                    </div>
                    <button type="submit" style={{ ...styles.btn, width: "100%", marginTop: "10px" }}>Nộp đơn xin nghỉ</button>
                  </form>
                )}

                {activeTab === 'refresh_biometrics' && (
                  <form onSubmit={handleRefreshBiometrics}>
                    <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0 0 10px 0" }}>Làm mới dữ liệu khuôn mặt (Refresh Biometrics)</h4>
                    <p style={{ fontSize: "0.75rem", color: "#6c8da3", lineHeight: "1.35", margin: "0 0 12px 0" }}>
                      Sinh viên được phép cập nhật sinh trắc học mới 6 tháng một lần để đảm bảo độ chính xác nhận dạng đạt ≥99.2%. Ảnh tải lên sẽ cần được Phòng Đào tạo duyệt hậu kiểm trước khi kích hoạt.
                    </p>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Chọn ảnh chân dung Face ID mới</label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        id="refresh-biometric-file" 
                        style={{ display: "none" }}
                        onChange={(e) => {
                          if(e.target.files.length > 0) {
                            setRegPhoto(e.target.files[0]);
                            setRegPhotoName(e.target.files[0].name);
                          }
                        }}
                      />
                      <button 
                        type="button" 
                        style={{ ...styles.btn, ...styles.btnSecondary, padding: "8px 14px", fontSize: "0.8rem" }}
                        onClick={() => document.getElementById("refresh-biometric-file").click()}
                      >
                        Chọn file ảnh chân dung
                      </button>
                      {regPhotoName && (
                        <div style={{ fontSize: "0.75rem", color: "#10b981", marginTop: "4px" }}>
                          ✓ {regPhotoName}
                        </div>
                      )}
                    </div>
                    
                    <button type="submit" style={{ ...styles.btn, width: "100%", marginTop: "10px" }}>Yêu cầu cập nhật Face ID</button>
                  </form>
                )}
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAttendance;
