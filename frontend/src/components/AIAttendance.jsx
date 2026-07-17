import React, { useState, useRef, useEffect } from 'react';
import { 
  Zap, UploadCloud, CheckCircle, XCircle, UserCheck, 
  ClipboardList, AlertTriangle, RefreshCw, FileText, Check, AlertOctagon,
  Camera, StopCircle
} from 'lucide-react';

const AIAttendance = ({ API_BASE, showToast, onAttendanceLogged, user, activeMenu }) => {
  const role = user?.role || 'sinh_vien';
  const username = user?.username || 'anonymous';

  const activeTab = activeMenu;

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
  const [useWebcam, setUseWebcam] = useState(false);
  const [webcamStream, setWebcamStream] = useState(null);

  // --- New states for extended requirements ---
  const [creditClasses, setCreditClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [enrollMssv, setEnrollMssv] = useState('');
  const [studentClasses, setStudentClasses] = useState([]);
  const [adminCameras, setAdminCameras] = useState([
    { id: 1, name: "Camera Cửa Lớp A2-301", status: "Online", room: "A2-301", isSimulating: false },
    { id: 2, name: "Camera Bàn Giảng Viên A2-301", status: "Online", room: "A2-301", isSimulating: false },
    { id: 3, name: "Camera Phòng Thực Hành A2-302", status: "Offline", room: "A2-302", isSimulating: false }
  ]);
  const [simulatedLogs, setSimulatedLogs] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentClass, setEditStudentClass] = useState('');
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);

  // Stop webcam stream when component unmounts
  useEffect(() => {
    return () => {
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [webcamStream]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      setWebcamStream(stream);
      setUseWebcam(true);
      setRecognizeImageSrc('');
      setRecognizeFile(null);
      // Wait for a frame to let video mount and assign srcObject
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      showToast("Không thể truy cập camera: " + err.message, "danger");
    }
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
    setUseWebcam(false);
  };


  // Fetch pending actions or reports
  useEffect(() => {
    if (role === 'admin' && activeTab === 'pending_faces') {
      fetchPendingFaces();
    } else if (role === 'giang_vien' && activeTab === 'leave_requests') {
      fetchLeaveRequests();
    } else if (activeTab === 'students_list') {
      fetchStudentsList();
    } else if (activeTab === 'class_management') {
      fetchCreditClasses();
    } else if (activeTab === 'my_classes') {
      fetchStudentClasses();
    } else if (activeTab === 'teaching_schedule' || activeTab === 'schedule') {
      fetchSchedules();
    } else if (activeTab === 'course_registration') {
      fetchAvailableClasses();
    }
  }, [activeTab]);

  const fetchAvailableClasses = async () => {
    if (!user?.mssv) return;
    try {
      const resAll = await fetch(`${API_BASE}/api/lop_tin_chi`);
      const resMy = await fetch(`${API_BASE}/api/students/${user.mssv}/classes`);
      if (resAll.ok && resMy.ok) {
        const dataAll = await resAll.json();
        const dataMy = await resMy.json();
        const myIds = (dataMy.classes || []).map(c => c.class_id);
        const available = (dataAll.classes || []).filter(c => !myIds.includes(c.class_id));
        setAvailableClasses(available);
      }
    } catch (err) {
      console.error("Lỗi khi tải môn học đăng ký:", err);
    }
  };

  const handleRegisterCourse = async (classId) => {
    if (!user?.mssv) return;
    const formData = new FormData();
    formData.append("ma_lop_tc", classId);
    formData.append("mssv", user.mssv);
    try {
      const res = await fetch(`${API_BASE}/api/sinh_vien_lop_tin_chi`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Đăng ký học phần ${classId} thành công!`);
        fetchAvailableClasses();
      } else {
        showToast(data.detail || "Đăng ký học phần thất bại.", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const fetchSchedules = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/lich_hoc_chi_tiet`);
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules || []);
      }
    } catch (err) {
      console.error("Lỗi khi tải lịch học:", err);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa buổi học này không?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/lich_hoc_chi_tiet/${scheduleId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        showToast("Xóa buổi học thành công!");
        fetchSchedules();
      } else {
        showToast("Xóa buổi học thất bại.", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const handleUpdateSchedule = async (e, scheduleId) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("study_date", editDate);
    formData.append("room", editRoom);
    formData.append("start_time", editTime);

    try {
      const res = await fetch(`${API_BASE}/api/lich_hoc_chi_tiet/${scheduleId}`, {
        method: "PUT",
        body: formData
      });
      if (res.ok) {
        showToast("Cập nhật buổi học thành công!");
        setEditingScheduleId(null);
        fetchSchedules();
      } else {
        showToast("Cập nhật buổi học thất bại.", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa sinh viên ${studentId} không?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/students/${studentId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        showToast("Xóa sinh viên thành công!");
        fetchStudentsList();
      } else {
        showToast("Xóa sinh viên thất bại.", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const handleUpdateStudent = async (e, studentId) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/admin/students/${studentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: editStudentName,
          administrative_class: editStudentClass
        })
      });
      if (res.ok) {
        showToast("Cập nhật sinh viên thành công!");
        setEditingStudentId(null);
        fetchStudentsList();
      } else {
        showToast("Cập nhật sinh viên thất bại.", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const fetchCreditClasses = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/lop_tin_chi`);
      if (res.ok) {
        const data = await res.json();
        setCreditClasses(data.classes || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEnrolledStudents = async (classId) => {
    setSelectedClass(classId);
    try {
      const res = await fetch(`${API_BASE}/api/reports/attendance?ma_lop_tc=${classId}`);
      if (res.ok) {
        const data = await res.json();
        setEnrolledStudents(data.report || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEnrollStudent = async (e) => {
    e.preventDefault();
    if (!enrollMssv || !selectedClass) {
      showToast("Vui lòng nhập MSSV và chọn lớp.", "danger");
      return;
    }
    const formData = new FormData();
    formData.append("ma_lop_tc", selectedClass);
    formData.append("mssv", enrollMssv);

    try {
      const res = await fetch(`${API_BASE}/api/sinh_vien_lop_tin_chi`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Đã thêm SV ${enrollMssv} vào lớp ${selectedClass}`);
        setEnrollMssv('');
        fetchEnrolledStudents(selectedClass);
      } else {
        showToast(data.detail || "Thêm sinh viên thất bại.", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const fetchStudentClasses = async () => {
    if (!user?.mssv) return;
    try {
      const res = await fetch(`${API_BASE}/api/students/${user.mssv}/classes`);
      if (res.ok) {
        const data = await res.json();
        setStudentClasses(data.classes || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleCameraSimulation = (cameraId) => {
    setAdminCameras(prev => prev.map(cam => {
      if (cam.id === cameraId) {
        const nextSimulating = !cam.isSimulating;
        if (nextSimulating) {
          showToast(`Đã kích hoạt chế độ tự động điểm danh cho ${cam.name}`);
        } else {
          showToast(`Đã dừng tự động điểm danh cho ${cam.name}`);
        }
        return { ...cam, isSimulating: nextSimulating };
      }
      return cam;
    }));
  };

  // Simulate background scans for active cameras every few seconds
  useEffect(() => {
    const activeCams = adminCameras.filter(c => c.isSimulating && c.status === "Online");
    if (activeCams.length === 0) return;

    const interval = setInterval(async () => {
      // Pick a random active camera and simulate a scan of a student
      const cam = activeCams[Math.floor(Math.random() * activeCams.length)];
      const testMssvs = ["N22DCCN134", "B21DCCN123", "Unknown"];
      const randomMssv = testMssvs[Math.floor(Math.random() * testMssvs.length)];
      
      const timestamp = new Date().toLocaleTimeString();
      let logMsg = "";
      
      if (randomMssv === "Unknown") {
        logMsg = `[${timestamp}] [${cam.room}] Quét thất bại: Khuôn mặt lạ.`;
      } else {
        // Try recording attendance
        try {
          const res = await fetch(`${API_BASE}/api/recognize?phong_hoc=${cam.room}`, {
            method: "POST",
            body: new FormData()
          });
          logMsg = `[${timestamp}] [${cam.room}] Điểm danh tự động thành công SV: ${randomMssv}`;
          if (onAttendanceLogged) {
            onAttendanceLogged();
          }
        } catch (e) {
          logMsg = `[${timestamp}] [${cam.room}] Đã điểm danh tự động SV: ${randomMssv} (Offline simulation)`;
        }
      }

      setSimulatedLogs(prev => [logMsg, ...prev].slice(0, 10));
    }, 4000);

    return () => clearInterval(interval);
  }, [adminCameras]);


  const fetchStudentsList = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/students`);
      if (res.ok) {
        const data = await res.json();
        setStudentsList(data || []);
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
    let fileToUpload = recognizeFile;

    if (useWebcam && videoRef.current) {
      // Capture frame from video
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = videoRef.current.videoWidth || 640;
      tempCanvas.height = videoRef.current.videoHeight || 480;
      const tempCtx = tempCanvas.getContext("2d");
      tempCtx.drawImage(videoRef.current, 0, 0, tempCanvas.width, tempCanvas.height);
      
      const dataUrl = tempCanvas.toDataURL("image/jpeg");
      setRecognizeImageSrc(dataUrl);

      // Convert dataUrl to blob
      const blob = await (await fetch(dataUrl)).blob();
      fileToUpload = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
      setRecognizeFile(fileToUpload);
      
      // Stop webcam so we can display the captured frame and bounding boxes
      stopWebcam();
    }

    if (!fileToUpload) {
      showToast("Vui lòng chụp ảnh hoặc chọn ảnh để đối chiếu.", "danger");
      return;
    }

    const formData = new FormData();
    formData.append("file", fileToUpload);
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
        // Draw bounding boxes after image updates in DOM
        setTimeout(() => {
          drawBoundingBoxes(data.results);
        }, 100);
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
      const mssv = st.mssv || st.student_id || "";
      const ho_ten = st.ho_ten || st.full_name || "";
      const lop_base = st.lop_base || st.administrative_class || "";

      const matchSearch = mssv.toLowerCase().includes(searchKeyword.toLowerCase()) || 
                          ho_ten.toLowerCase().includes(searchKeyword.toLowerCase());
      const matchClass = filterClass ? lop_base.toLowerCase().includes(filterClass.toLowerCase()) : true;
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
                  {role === 'admin' && <th style={styles.th}>Hành động</th>}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((st) => {
                  const mssv = st.mssv || st.student_id || "";
                  const ho_ten = st.ho_ten || st.full_name || "";
                  const lop_base = st.lop_base || st.administrative_class || "";
                  return (
                    <tr key={mssv}>
                      <td style={styles.td}>
                        {editingStudentId === mssv ? (
                          <input 
                            type="text" 
                            style={{ ...styles.input, padding: "2px 6px", fontSize: "0.8rem" }} 
                            value={editStudentName} 
                            onChange={(e) => setEditStudentName(e.target.value)} 
                          />
                        ) : (
                          <strong>{ho_ten}</strong>
                        )}
                        <br/>
                        <small style={{ color: "#777" }}>{mssv}</small>
                      </td>
                      <td style={styles.td}>
                        {editingStudentId === mssv ? (
                          <input 
                            type="text" 
                            style={{ ...styles.input, padding: "2px 6px", fontSize: "0.8rem" }} 
                            value={editStudentClass} 
                            onChange={(e) => setEditStudentClass(e.target.value)} 
                          />
                        ) : (
                          lop_base
                        )}
                      </td>
                      <td style={styles.td}>
                        <small>{st.ngay_sinh || 'N/A'}</small><br/>
                        <small>{st.gioi_tinh || 'N/A'}</small>
                      </td>
                      <td style={styles.td}>
                        <span style={{ 
                          padding: "3px 6px", 
                          borderRadius: "4px", 
                          fontSize: "0.75rem",
                          backgroundColor: st.trang_thai_ho_so === 'Approved' || st.academic_status === 'studying' ? "#e6f8f0" : "#fff7e6",
                          color: st.trang_thai_ho_so === 'Approved' || st.academic_status === 'studying' ? "#10b981" : "#d48806"
                        }}>
                          {st.trang_thai_ho_so || st.academic_status || 'Pending'}
                        </span>
                      </td>
                      {role === 'admin' && (
                        <td style={styles.td}>
                          {editingStudentId === mssv ? (
                            <div style={{ display: "flex", gap: "4px" }}>
                              <button onClick={(e) => handleUpdateStudent(e, mssv)} style={{ ...styles.btn, padding: "3px 6px", fontSize: "0.75rem", backgroundColor: "#10b981" }}>Lưu</button>
                              <button onClick={() => setEditingStudentId(null)} style={{ ...styles.btn, padding: "3px 6px", fontSize: "0.75rem", backgroundColor: "#6b7280" }}>Hủy</button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", gap: "4px" }}>
                              <button 
                                onClick={() => {
                                  setEditingStudentId(mssv);
                                  setEditStudentName(ho_ten);
                                  setEditStudentClass(lop_base);
                                }} 
                                style={{ ...styles.btn, padding: "3px 6px", fontSize: "0.75rem", backgroundColor: "#f59e0b" }}
                              >
                                Sửa
                              </button>
                              <button 
                                onClick={() => handleDeleteStudent(mssv)} 
                                style={{ ...styles.btn, padding: "3px 6px", fontSize: "0.75rem", backgroundColor: "#ef4444" }}
                              >
                                Xóa
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
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
      display: role === 'admin' ? "grid" : "block",
      gridTemplateColumns: role === 'admin' ? "1.3fr 1.2fr" : "1fr",
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
          {/* Trái: Camera mô phỏng quét khuôn mặt (Chỉ dành cho Admin) */}
          {role === 'admin' && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#54738c" }}>Camera tại phòng:</span>
                <input 
                  style={{ ...styles.input, padding: "4px 8px", width: "100px" }} 
                  value={cameraRoom} 
                  onChange={(e) => setCameraRoom(e.target.value)} 
                />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button 
                  type="button"
                  onClick={() => { stopWebcam(); setUseWebcam(false); resetRecognition(); }}
                  style={{ 
                    ...styles.btn, 
                    ...(useWebcam ? styles.btnSecondary : {}),
                    padding: "6px 12px", 
                    fontSize: "0.8rem", 
                    flex: 1 
                  }}
                >
                  <UploadCloud size={14} /> Tải ảnh lên
                </button>
                <button 
                  type="button"
                  onClick={() => { if(useWebcam) { stopWebcam(); } else { startWebcam(); } }}
                  style={{ 
                    ...styles.btn, 
                    ...(!useWebcam ? styles.btnSecondary : { backgroundColor: "#ef4444" }), 
                    padding: "6px 12px", 
                    fontSize: "0.8rem", 
                    flex: 1 
                  }}
                >
                  {useWebcam ? (
                    <>
                      <StopCircle size={14} /> Tắt Camera
                    </>
                  ) : (
                    <>
                      <Camera size={14} /> Mở Camera
                    </>
                  )}
                </button>
              </div>
              
              <div 
                style={styles.dropzone}
                onDragOver={useWebcam ? undefined : (e) => { e.preventDefault(); }}
                onDrop={useWebcam ? undefined : handleFileDrop}
                onClick={useWebcam ? undefined : () => fileInputRef.current.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  style={{ display: "none" }} 
                  onChange={(e) => { if(e.target.files.length > 0) processImage(e.target.files[0]); }} 
                />
                
                {useWebcam ? (
                  <div style={styles.previewWrapper}>
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      style={{ ...styles.previewImage, transform: "scaleX(-1)" }}
                    />
                  </div>
                ) : !recognizeImageSrc ? (
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
                  onClick={() => { stopWebcam(); resetRecognition(); }}
                  className="btn btn-secondary" 
                  style={{ ...styles.btn, ...styles.btnSecondary }}
                >
                  Làm mới
                </button>
                <button onClick={triggerRecognition} style={styles.btn}>
                  {useWebcam ? "Chụp & Điểm danh" : "Quét khuôn mặt (AI Check-in)"}
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
          )}

          {/* Phải: Các phân hệ Quản lý & Nghiệp vụ theo vai trò */}
          <div style={{ 
            borderLeft: role === 'admin' ? "1px solid #d0e0eb" : "none", 
            paddingLeft: role === 'admin' ? "1.5rem" : "0" 
          }}>
            
            {/* TABS CHO ADMIN */}
            {role === 'admin' && (
              <>

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
                  <div>
                    <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0 0 10px 0" }}>Quản lý Lịch Học Phần & Buổi Học</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px", marginBottom: "20px" }}>
                      
                      {/* Left: Create Form */}
                      <div style={{ background: "#f8fbfd", border: "1px solid #d0e0eb", borderRadius: "8px", padding: "12px" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#106fa6", display: "block", marginBottom: "10px" }}>Thêm lịch học mới</span>
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
                          <button type="submit" style={{ ...styles.btn, width: "100%", marginTop: "10px", padding: "8px", fontSize: "0.8rem" }}>Thêm buổi học</button>
                        </form>
                      </div>

                      {/* Right: List of Schedules with Edit / Delete */}
                      <div style={{ background: "#ffffff", border: "1px solid #d0e0eb", borderRadius: "8px", padding: "12px" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#106fa6", display: "block", marginBottom: "10px" }}>Danh sách buổi học hệ thống</span>
                        
                        {schedules.length === 0 ? (
                          <p style={{ fontSize: "0.75rem", color: "#6c8da3" }}>Chưa có buổi học nào.</p>
                        ) : (
                          <div style={{ overflowY: "auto", maxHeight: "380px" }}>
                            <table style={styles.table}>
                              <thead>
                                <tr>
                                  <th style={styles.th}>Buổi</th>
                                  <th style={styles.th}>Lớp tín chỉ</th>
                                  <th style={styles.th}>Thông tin học</th>
                                  <th style={styles.th}>Hành động</th>
                                </tr>
                              </thead>
                              <tbody>
                                {schedules.map((s) => (
                                  <tr key={s.schedule_id}>
                                    <td style={styles.td}><strong>#{s.schedule_id}</strong></td>
                                    <td style={styles.td}>
                                      <strong>{s.class_id}</strong><br/>
                                      <small style={{ color: "#777" }}>{s.subject_name}</small>
                                    </td>
                                    <td style={styles.td}>
                                      {editingScheduleId === s.schedule_id ? (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                          <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} style={{ ...styles.input, padding: "2px 4px", fontSize: "0.75rem" }} />
                                          <input type="text" value={editRoom} onChange={(e) => setEditRoom(e.target.value)} style={{ ...styles.input, padding: "2px 4px", fontSize: "0.75rem" }} />
                                          <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} style={{ ...styles.input, padding: "2px 4px", fontSize: "0.75rem" }} />
                                        </div>
                                      ) : (
                                        <div>
                                          📅 {s.study_date}<br/>
                                          🚪 {s.room} | ⏰ {s.start_time}
                                        </div>
                                      )}
                                    </td>
                                    <td style={styles.td}>
                                      {editingScheduleId === s.schedule_id ? (
                                        <div style={{ display: "flex", gap: "4px" }}>
                                          <button onClick={(e) => handleUpdateSchedule(e, s.schedule_id)} style={{ ...styles.btn, padding: "2px 6px", fontSize: "0.7rem", backgroundColor: "#10b981" }}>Lưu</button>
                                          <button onClick={() => setEditingScheduleId(null)} style={{ ...styles.btn, padding: "2px 6px", fontSize: "0.7rem", backgroundColor: "#6b7280" }}>Hủy</button>
                                        </div>
                                      ) : (
                                        <div style={{ display: "flex", gap: "4px" }}>
                                          <button 
                                            onClick={() => {
                                              setEditingScheduleId(s.schedule_id);
                                              setEditDate(s.study_date);
                                              setEditRoom(s.room);
                                              setEditTime(s.start_time.substring(0, 5));
                                            }} 
                                            style={{ ...styles.btn, padding: "2px 6px", fontSize: "0.7rem", backgroundColor: "#f59e0b" }}
                                          >
                                            Sửa
                                          </button>
                                          <button 
                                            onClick={() => handleDeleteSchedule(s.schedule_id)} 
                                            style={{ ...styles.btn, padding: "2px 6px", fontSize: "0.7rem", backgroundColor: "#ef4444" }}
                                          >
                                            Xóa
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
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
                {activeTab === 'camera_dashboard' && (
                  <div>
                    <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0 0 10px 0" }}>Bảng điều khiển Camera tự động tại các phòng học</h4>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "15px" }}>
                      {adminCameras.map(cam => (
                        <div key={cam.id} style={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          alignItems: "center", 
                          background: "#f8fbfd", 
                          padding: "10px 14px", 
                          borderRadius: "8px", 
                          border: "1px solid #d0e0eb" 
                        }}>
                          <div>
                            <strong>{cam.name}</strong><br/>
                            <small style={{ color: "#54738c" }}>Vị trí: {cam.room} | Trạng thái vật lý: </small>
                            <span style={{ 
                              fontSize: "0.75rem", 
                              fontWeight: "600",
                              color: cam.status === "Online" ? "#10b981" : "#ef4444" 
                            }}>
                              {cam.status}
                            </span>
                          </div>
                          
                          <button 
                            disabled={cam.status !== "Online"}
                            onClick={() => toggleCameraSimulation(cam.id)}
                            style={{ 
                              ...styles.btn, 
                              padding: "6px 12px", 
                              fontSize: "0.75rem",
                              backgroundColor: cam.isSimulating ? "#ef4444" : "#10b981",
                              opacity: cam.status !== "Online" ? 0.5 : 1
                            }}
                          >
                            {cam.isSimulating ? "Tắt tự động" : "Bật tự động"}
                          </button>
                        </div>
                      ))}
                    </div>

                    <div style={{ background: "#1c3240", color: "#38ef7d", fontFamily: "monospace", padding: "12px", borderRadius: "6px", minHeight: "150px", fontSize: "0.75rem" }}>
                      <div style={{ borderBottom: "1px solid #2d4554", paddingBottom: "4px", marginBottom: "6px", color: "#a5b4fc" }}>
                        Console Log nhận dạng trực tuyến (Thời gian thực)
                      </div>
                      {simulatedLogs.length === 0 ? (
                        <div style={{ color: "#64748b" }}>Đang chờ kích hoạt luồng camera tự động...</div>
                      ) : (
                        simulatedLogs.map((log, idx) => (
                          <div key={idx} style={{ marginBottom: "3px" }}>{log}</div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* TABS CHO GIẢNG VIÊN */}
            {role === 'giang_vien' && (
              <>

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
                {activeTab === 'class_management' && (
                  <div>
                    <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0 0 10px 0" }}>Danh sách lớp tín chỉ phụ trách</h4>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                      <div style={{ background: "#ffffff", border: "1px solid #d0e0eb", borderRadius: "8px", padding: "10px", maxHeight: "250px", overflowY: "auto" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#106fa6", display: "block", marginBottom: "8px" }}>Chọn lớp học phần:</span>
                        {creditClasses.length === 0 ? (
                          <p style={{ fontSize: "0.75rem", color: "#6c8da3" }}>Chưa có lớp tín chỉ nào.</p>
                        ) : (
                          creditClasses.map(c => (
                            <div 
                              key={c.class_id}
                              onClick={() => fetchEnrolledStudents(c.class_id)}
                              style={{ 
                                padding: "8px 10px", 
                                cursor: "pointer", 
                                borderRadius: "4px", 
                                fontSize: "0.8rem",
                                marginBottom: "4px",
                                background: selectedClass === c.class_id ? "#e0f2fe" : "transparent",
                                color: selectedClass === c.class_id ? "#0284c7" : "#1c3240",
                                fontWeight: selectedClass === c.class_id ? "600" : "400"
                              }}
                            >
                              📁 {c.class_id} - {c.subject_name}
                            </div>
                          ))
                        )}
                      </div>

                      <div style={{ background: "#ffffff", border: "1px solid #d0e0eb", borderRadius: "8px", padding: "10px" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#106fa6", display: "block", marginBottom: "8px" }}>Đăng ký sinh viên vào lớp học phần:</span>
                        <form onSubmit={handleEnrollStudent}>
                          <div style={styles.formGroup}>
                            <label style={styles.label}>Mã lớp học phần hiện tại</label>
                            <input style={{ ...styles.input, background: "#f1f5f9" }} disabled value={selectedClass || "Vui lòng chọn lớp bên trái"} />
                          </div>
                          <div style={styles.formGroup}>
                            <label style={styles.label}>MSSV của Sinh viên</label>
                            <input 
                              style={styles.input} 
                              placeholder="Nhập MSSV (Ví dụ: N22DCCN134)" 
                              value={enrollMssv} 
                              onChange={(e) => setEnrollMssv(e.target.value.toUpperCase())}
                              required 
                            />
                          </div>
                          <button disabled={!selectedClass} type="submit" style={{ ...styles.btn, width: "100%", padding: "8px", fontSize: "0.8rem" }}>Đăng ký vào lớp</button>
                        </form>
                      </div>
                    </div>

                    {selectedClass && (
                      <div>
                        <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#106fa6", display: "block", marginBottom: "8px" }}>
                          Danh sách sinh viên thuộc lớp: {selectedClass}
                        </span>
                        {enrolledStudents.length === 0 ? (
                          <p style={{ fontSize: "0.75rem", color: "#6c8da3" }}>Chưa có sinh viên nào đăng ký vào lớp này.</p>
                        ) : (
                          <div style={{ overflowY: "auto", maxHeight: "200px" }}>
                            <table style={styles.table}>
                              <thead>
                                <tr>
                                  <th style={styles.th}>MSSV</th>
                                  <th style={styles.th}>Họ Tên</th>
                                  <th style={styles.th}>Lớp Chuyên Ngành</th>
                                </tr>
                              </thead>
                              <tbody>
                                {enrolledStudents.map((st) => (
                                  <tr key={st.mssv}>
                                    <td style={styles.td}>{st.mssv}</td>
                                    <td style={styles.td}><strong>{st.ho_ten}</strong></td>
                                    <td style={styles.td}>{st.lop_base}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'teaching_schedule' && (
                  <div>
                    <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0 0 10px 0" }}>Lịch dạy chi tiết của Giảng viên</h4>
                    {schedules.length === 0 ? (
                      <p style={{ fontSize: "0.8rem", color: "#6c8da3" }}>Chưa có lịch dạy nào được xếp.</p>
                    ) : (
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Mã buổi</th>
                            <th style={styles.th}>Lớp tín chỉ</th>
                            <th style={styles.th}>Môn học</th>
                            <th style={styles.th}>Ngày dạy</th>
                            <th style={styles.th}>Phòng học</th>
                            <th style={styles.th}>Giờ bắt đầu</th>
                          </tr>
                        </thead>
                        <tbody>
                          {schedules.map((s, idx) => (
                            <tr key={idx}>
                              <td style={styles.td}><strong>Buổi {s.schedule_id}</strong></td>
                              <td style={styles.td}>{s.class_id}</td>
                              <td style={styles.td}><strong>{s.subject_name}</strong></td>
                              <td style={styles.td}>{s.study_date}</td>
                              <td style={styles.td}>
                                <span style={{ padding: "3px 6px", borderRadius: "4px", backgroundColor: "#f0f7fc", color: "#106fa6", fontSize: "0.75rem", fontWeight: "600" }}>
                                  🚪 {s.room}
                                </span>
                              </td>
                              <td style={styles.td}>{s.start_time}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </>
            )}

            {/* TABS CHO SINH VIÊN */}
            {role === 'sinh_vien' && (
              <>

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

                {activeTab === 'my_classes' && (
                  <div>
                    <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0 0 10px 0" }}>Lớp học & Tiến trình học tập</h4>
                    {studentClasses.length === 0 ? (
                      <p style={{ fontSize: "0.8rem", color: "#6c8da3" }}>Bạn chưa đăng ký lớp tín chỉ nào.</p>
                    ) : (
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Lớp tín chỉ</th>
                            <th style={styles.th}>Môn học</th>
                            <th style={styles.th}>Số buổi đi học</th>
                            <th style={styles.th}>Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentClasses.map((c, i) => (
                            <tr key={i}>
                              <td style={styles.td}>{c.class_id}</td>
                              <td style={styles.td}>
                                <strong>{c.subject_name}</strong><br/>
                                <small style={{ color: "#777" }}>{c.subject_id}</small>
                              </td>
                              <td style={styles.td}>
                                <strong>{c.attended_sessions}</strong> / {c.total_sessions} buổi
                              </td>
                              <td style={styles.td}>
                                <span style={{ 
                                  padding: "3px 6px", 
                                  borderRadius: "4px", 
                                  fontSize: "0.75rem",
                                  backgroundColor: c.status === 'Active' ? "#e6f8f0" : "#fdf0f0",
                                  color: c.status === 'Active' ? "#10b981" : "#ef4444",
                                  fontWeight: "600"
                                }}>
                                  {c.status === 'Active' ? 'Học tập' : 'Cấm thi'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {activeTab === 'course_registration' && (
                  <div>
                    <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0 0 10px 0" }}>Đăng ký Lớp Học Phần (Tín chỉ)</h4>
                    <p style={{ fontSize: "0.75rem", color: "#6c8da3", marginBottom: "12px" }}>
                      Vui lòng chọn lớp học phần đang mở dưới đây để thực hiện đăng ký học.
                    </p>
                    {availableClasses.length === 0 ? (
                      <p style={{ fontSize: "0.8rem", color: "#6c8da3" }}>Hiện tại không có lớp học phần nào khả dụng để đăng ký (hoặc bạn đã đăng ký tất cả).</p>
                    ) : (
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Mã lớp tín chỉ</th>
                            <th style={styles.th}>Môn học</th>
                            <th style={styles.th}>Mã môn</th>
                            <th style={styles.th}>Hành động</th>
                          </tr>
                        </thead>
                        <tbody>
                          {availableClasses.map((c, i) => (
                            <tr key={i}>
                              <td style={styles.td}><strong>{c.class_id}</strong></td>
                              <td style={styles.td}>{c.subject_name}</td>
                              <td style={styles.td}>{c.subject_id}</td>
                              <td style={styles.td}>
                                <button 
                                  onClick={() => handleRegisterCourse(c.class_id)}
                                  style={{ ...styles.btn, padding: "4px 10px", fontSize: "0.75rem" }}
                                >
                                  Đăng ký học
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
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
