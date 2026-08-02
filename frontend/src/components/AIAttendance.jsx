import React, { useState, useRef, useEffect } from 'react';
import {
  Zap, UploadCloud, CheckCircle, XCircle, UserCheck,
  ClipboardList, AlertTriangle, RefreshCw, FileText, Check, AlertOctagon,
  Camera, StopCircle, Trash2, UserPlus, Users, BookOpen
} from 'lucide-react';

const AIAttendance = ({ API_BASE, showToast, onAttendanceLogged, user, activeMenu }) => {
  const rawRole = (user?.role || 'sinh_vien').toLowerCase();
  const role = rawRole === 'student' ? 'sinh_vien' : (rawRole === 'lecturer' ? 'giang_vien' : rawRole);
  const username = user?.username || 'anonymous';

  if (user && role === 'sinh_vien' && (!user.mssv || user.mssv === 'N/A')) {
    user.mssv = user.username.toUpperCase();
  }

  const activeTab = activeMenu;

  // --- Admin Tab States ---
  const [pendingFaces, setPendingFaces] = useState([]);
  const [regMssv, setRegMssv] = useState('');
  const [regName, setRegName] = useState('');
  const [regLop, setRegLop] = useState('');
  const [regPhoto, setRegPhoto] = useState(null);
  const [regPhotoName, setRegPhotoName] = useState('');
  const [regUseWebcam, setRegUseWebcam] = useState(false);
  const [regWebcamStream, setRegWebcamStream] = useState(null);
  const [regPreviewSrc, setRegPreviewSrc] = useState('');
  const regVideoRef = useRef(null);

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
  const [bulkClassCode, setBulkClassCode] = useState('');
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
  const [lecturersList, setLecturersList] = useState([]);
  const [ccLecturer, setCcLecturer] = useState('');
  const [regModeTab, setRegModeTab] = useState('single');
  const [classSearch, setClassSearch] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentClass, setEditStudentClass] = useState('');
  const [scheduleViewMode, setScheduleViewMode] = useState('grid');

  // Week navigation helper functions
  const getMonday = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  const getMondayStr = (date) => {
    const mon = getMonday(date);
    return mon.toISOString().split('T')[0];
  };

  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
    return getMondayStr(new Date());
  });

  const getDaysOfWeek = (monStr) => {
    const mon = new Date(monStr);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      days.push({
        label: i === 6 ? "Chủ Nhật" : `Thứ ${i + 2}`,
        dateStr: d.toISOString().split('T')[0],
        displayDate: `${d.getDate()}/${d.getMonth() + 1}`
      });
    }
    return days;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const recognitionIntervalRef = useRef(null);

  // Stop webcam stream when component unmounts
  useEffect(() => {
    return () => {
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
      }
      if (regWebcamStream) {
        regWebcamStream.getTracks().forEach(track => track.stop());
      }
      if (recognitionIntervalRef.current) {
        clearInterval(recognitionIntervalRef.current);
      }
    };
  }, [webcamStream, regWebcamStream]);

  // Manage webcam recognition interval
  useEffect(() => {
    if (useWebcam && webcamStream) {
      recognitionIntervalRef.current = setInterval(async () => {
        if (videoRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;

          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = video.videoWidth || 640;
          tempCanvas.height = video.videoHeight || 480;
          const tempCtx = tempCanvas.getContext("2d");
          tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

          tempCanvas.toBlob(async (blob) => {
            if (!blob) return;
            const formData = new FormData();
            formData.append("file", blob, "webcam_capture.jpg");

            try {
              const url = `${API_BASE}/api/recognize?phong_hoc=${encodeURIComponent(cameraRoom)}`;
              const res = await fetch(url, {
                method: "POST",
                body: formData
              });
              if (res.ok) {
                const data = await res.json();
                setDetectionLogs(data.results || []);

                if (canvas && video) {
                  canvas.width = video.clientWidth;
                  canvas.height = video.clientHeight;
                  const ctx = canvas.getContext("2d");
                  ctx.clearRect(0, 0, canvas.width, canvas.height);

                  const scaleX = canvas.width / tempCanvas.width;
                  const scaleY = canvas.height / tempCanvas.height;

                  (data.results || []).forEach(resItem => {
                    const [x1, y1, x2, y2] = resItem.box;
                    const bx = x1 * scaleX;
                    const by = y1 * scaleY;
                    const bw = (x2 - x1) * scaleX;
                    const bh = (y2 - y1) * scaleY;

                    const color = resItem.is_known ? "#10b981" : "#ef4444";
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 3;
                    ctx.strokeRect(bx, by, bw, bh);

                    ctx.fillStyle = color;
                    ctx.font = "bold 13px 'Inter', sans-serif";
                    const label = resItem.is_known ? `${resItem.fullname} - ${resItem.trang_thai}` : "Chưa đăng ký";
                    const textWidth = ctx.measureText(label).width;

                    ctx.fillRect(bx, by - 24, textWidth + 14, 24);
                    ctx.fillStyle = "#ffffff";
                    ctx.fillText(label, bx + 7, by - 7);
                  });
                }

                if (onAttendanceLogged) {
                  onAttendanceLogged();
                }
              }
            } catch (err) {
              console.error("Lỗi tự động quét khuôn mặt: ", err);
            }
          }, "image/jpeg");
        }
      }, 500);
    } else {
      if (recognitionIntervalRef.current) {
        clearInterval(recognitionIntervalRef.current);
        recognitionIntervalRef.current = null;
      }
    }

    return () => {
      if (recognitionIntervalRef.current) {
        clearInterval(recognitionIntervalRef.current);
        recognitionIntervalRef.current = null;
      }
    };
  }, [useWebcam, webcamStream, cameraRoom]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      setWebcamStream(stream);
      setUseWebcam(true);
      setRecognizeImageSrc('');
      setRecognizeFile(null);

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

  const startRegWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      setRegWebcamStream(stream);
      setRegUseWebcam(true);
      setRegPreviewSrc('');
      setRegPhoto(null);
      setRegPhotoName('');

      setTimeout(() => {
        if (regVideoRef.current) {
          regVideoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      showToast("Không thể truy cập camera đăng ký: " + err.message, "danger");
    }
  };

  const stopRegWebcam = () => {
    if (regWebcamStream) {
      regWebcamStream.getTracks().forEach(track => track.stop());
      setRegWebcamStream(null);
    }
    setRegUseWebcam(false);
  };

  const captureRegPhoto = () => {
    if (regVideoRef.current) {
      const video = regVideoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `${regMssv || "captured"}_face.jpg`, { type: "image/jpeg" });
          setRegPhoto(file);
          setRegPhotoName(`Ảnh chụp webcam: ${file.name}`);

          const previewUrl = URL.createObjectURL(blob);
          setRegPreviewSrc(previewUrl);
        }
      }, "image/jpeg");

      stopRegWebcam();
    }
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
      fetchSchedules();
    } else if (activeTab === 'teaching_schedule' || activeTab === 'schedule' || activeTab === 'summary_report' || activeTab === 'manual_checkin') {
      fetchSchedules();
      fetchCreditClasses();
    } else if (activeTab === 'course_registration') {
      fetchAvailableClasses();
      fetchStudentClasses();
    } else if (activeTab === 'structure') {
      fetchLecturersList();
      fetchCreditClasses();
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
        fetchStudentClasses();
      } else {
        showToast(data.detail || "Đăng ký học phần thất bại.", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const handleUnregisterCourse = async (classId) => {
    if (!user?.mssv) return;
    if (!window.confirm(`Bạn có chắc chắn muốn hủy đăng ký lớp học phần ${classId} không?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/sinh_vien_lop_tin_chi/${classId}/${user.mssv}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Đã hủy đăng ký lớp học phần ${classId} thành công.`);
        fetchAvailableClasses();
        fetchStudentClasses();
      } else {
        showToast(data.detail || "Hủy đăng ký thất bại.", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const fetchSchedules = async () => {
    try {
      let url = `${API_BASE}/api/lich_hoc_chi_tiet`;
      if (role === 'giang_vien' && user?.lecturer_id) {
        url += `?lecturer_id=${user.lecturer_id}`;
      }
      const res = await fetch(url);
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

  const fetchLecturersList = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/lecturers/`);
      if (res.ok) {
        const data = await res.json();
        setLecturersList(data || []);
      }
    } catch (err) {
      console.error("Lỗi khi tải giảng viên:", err);
    }
  };

  const fetchCreditClasses = async () => {
    try {
      let url = `${API_BASE}/api/lop_tin_chi`;
      if (role === 'giang_vien' && user?.lecturer_id) {
        url += `?lecturer_id=${user.lecturer_id}`;
      }
      const res = await fetch(url);
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

  const handleUnenrollStudent = async (mssv) => {
    if (!selectedClass) return;
    if (!window.confirm(`Bạn có chắc muốn xóa sinh viên ${mssv} khỏi lớp ${selectedClass}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/sinh_vien_lop_tin_chi/${selectedClass}/${mssv}`, {
        method: "DELETE"
      });
      if (res.ok) {
        showToast(`Đã xóa sinh viên ${mssv} khỏi lớp.`);
        fetchEnrolledStudents(selectedClass);
      } else {
        showToast("Xóa thất bại.", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const handleBulkEnroll = async (e) => {
    e.preventDefault();
    if (!bulkClassCode || !selectedClass) {
      showToast("Vui lòng nhập tên lớp hành chính và chọn lớp học phần.", "danger");
      return;
    }
    const formData = new FormData();
    formData.append("ma_lop_tc", selectedClass);
    formData.append("lop_hanh_chinh", bulkClassCode);

    try {
      const res = await fetch(`${API_BASE}/api/sinh_vien_lop_tin_chi/bulk_administrative`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `Đã thêm thành công sinh viên vào lớp.`);
        setBulkClassCode('');
        fetchEnrolledStudents(selectedClass);
      } else {
        showToast(data.detail || "Đăng ký cả lớp thất bại.", "danger");
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
        return { ...cam, isSimulating: !cam.isSimulating };
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
      let url = `${API_BASE}/api/admin/students/`;
      if (role === 'giang_vien' && user?.lecturer_id) {
        url += `?lecturer_id=${user.lecturer_id}`;
      }
      const res = await fetch(url);
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
    // Backend không có chức năng chờ duyệt ảnh nữa vì đã Approved trực tiếp.
    // Trả về mảng rỗng để không bị lỗi 404.
    setPendingFaces([]);
  };

  const fetchLeaveRequests = async () => {
    try {
      let url = `${API_BASE}/api/teacher/leave_requests`;
      if (role === 'giang_vien' && user?.lecturer_id) {
        url += `?lecturer_id=${user.lecturer_id}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLeaveRequests(data.requests || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveFace = async (mssv) => {
    showToast("Backend hiện tại không hỗ trợ duyệt hồ sơ khuôn mặt qua API cũ.", "danger");
    return Promise.resolve();
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

  const exportAttendanceReport = async () => {
    if (!reportClass) {
      showToast("Vui lòng chọn lớp tín chỉ.", "danger");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/reports/attendance/export?ma_lop_tc=${reportClass}`);
      if (!res.ok) {
        showToast("Lỗi khi kết xuất báo cáo.", "danger");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bao_cao_tong_ket_${reportClass}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast("Đã xuất file báo cáo thành công!");
    } catch (err) {
      showToast("Lỗi kết nối khi xuất báo cáo.", "danger");
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
        showToast("Đăng ký hồ sơ sinh viên và khuôn mặt thành công!");
        setRegPhoto(null);
        setRegPhotoName('');
        setRegMssv('');
        setRegName('');
        setRegLop('');
        setRegPreviewSrc('');
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
        fetchSchedules();
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      const res = await subjectService.createSubject({
        ma_mon: subCode,
        ten_mon: subName
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
    if (ccLecturer) {
      formData.append("ma_gv", ccLecturer);
    }

    try {
      const res = await fetch(`${API_BASE}/api/lop_tin_chi`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        showToast("Đã lưu lớp tín chỉ.");
        setCcCode('');
        setCcSub('');
        setCcLecturer('');
        fetchCreditClasses();
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const renderClassManagementTab = () => {
    const filteredCreditClasses = creditClasses.filter(c => {
      return (c.class_id || '').toLowerCase().includes(classSearch.toLowerCase()) ||
        (c.subject_name || '').toLowerCase().includes(classSearch.toLowerCase());
    });

    return (
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "20px", alignItems: "start" }}>

        {/* Cột trái: Danh sách lớp học phần */}
        <div style={{ background: "#ffffff", border: "1px solid #d0e0eb", borderRadius: "10px", padding: "15px", boxShadow: "0 2px 5px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
            <BookOpen size={16} color="#106fa6" />
            <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#106fa6" }}>Lớp Học Phần Đang Mở</span>
          </div>

          <input
            style={{ ...styles.input, width: "100%", padding: "6px 10px", fontSize: "0.78rem", marginBottom: "12px" }}
            placeholder="🔍 Tìm mã lớp, môn học..."
            value={classSearch}
            onChange={(e) => setClassSearch(e.target.value)}
          />

          <div style={{ maxHeight: "400px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
            {filteredCreditClasses.length === 0 ? (
              <p style={{ fontSize: "0.75rem", color: "#94a3b8", textAlign: "center", padding: "10px" }}>Không tìm thấy lớp nào.</p>
            ) : (
              filteredCreditClasses.map(c => {
                const isSelected = selectedClass === c.class_id;
                return (
                  <div
                    key={c.class_id}
                    onClick={() => fetchEnrolledStudents(c.class_id)}
                    style={{
                      padding: "10px 12px",
                      cursor: "pointer",
                      borderRadius: "8px",
                      border: isSelected ? "1px solid #0284c7" : "1px solid #e2edf5",
                      background: isSelected ? "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)" : "#ffffff",
                      transition: "all 0.15s ease",
                      boxShadow: isSelected ? "0 2px 4px rgba(2, 132, 199, 0.08)" : "none"
                    }}
                    className="ptit-class-card"
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "4px" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: "700", color: isSelected ? "#0284c7" : "#1e293b" }}>{c.class_id}</span>
                      <span style={{ fontSize: "0.65rem", padding: "1px 5px", borderRadius: "4px", background: "#f1f5f9", color: "#64748b", fontWeight: "600" }}>{c.subject_id}</span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: "500", marginBottom: "6px" }}>
                      {c.subject_name}
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                      👤 <span style={{ fontStyle: "italic" }}>GV: {c.lecturer_name || "Chưa phân công"}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Cột phải: Chi tiết và Quản lý Đăng ký */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {!selectedClass ? (
            <div style={{ background: "#ffffff", border: "1px solid #d0e0eb", borderRadius: "10px", padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
              <BookOpen size={48} style={{ margin: "0 auto 12px auto", opacity: 0.5, color: "#106fa6" }} />
              <h5 style={{ fontWeight: "700", color: "#1e293b", margin: "0 0 4px 0", fontSize: "0.95rem" }}>Chưa chọn lớp học phần</h5>
              <p style={{ fontSize: "0.78rem", color: "#94a3b8", margin: 0 }}>Vui lòng nhấp chọn một lớp học phần ở cột bên trái để quản lý sinh viên đăng ký học.</p>
            </div>
          ) : (
            <>
              {/* Card thông tin lớp & form đăng ký */}
              <div style={{ background: "#ffffff", border: "1px solid #d0e0eb", borderRadius: "10px", padding: "15px", boxShadow: "0 2px 5px rgba(0,0,0,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
                  <div>
                    <h4 style={{ color: "#1e293b", fontSize: "0.9rem", fontWeight: "700", margin: 0 }}>
                      Quản lý Đăng ký Học: <span style={{ color: "#0284c7" }}>{selectedClass}</span>
                    </h4>
                  </div>

                  {/* Segmented control tabs */}
                  <div style={{ display: "flex", background: "#f1f5f9", padding: "3px", borderRadius: "6px" }}>
                    <button
                      onClick={() => setRegModeTab('single')}
                      style={{
                        border: "none",
                        background: regModeTab === 'single' ? "#ffffff" : "transparent",
                        color: regModeTab === 'single' ? "#0f172a" : "#64748b",
                        padding: "4px 10px",
                        fontSize: "0.72rem",
                        fontWeight: "600",
                        borderRadius: "4px",
                        cursor: "pointer",
                        boxShadow: regModeTab === 'single' ? "0 1px 2px rgba(0,0,0,0.05)" : "none"
                      }}
                    >
                      <UserPlus size={12} style={{ display: "inline", marginRight: "4px", verticalAlign: "middle" }} />
                      Đăng ký đơn lẻ
                    </button>
                    <button
                      onClick={() => setRegModeTab('bulk')}
                      style={{
                        border: "none",
                        background: regModeTab === 'bulk' ? "#ffffff" : "transparent",
                        color: regModeTab === 'bulk' ? "#0f172a" : "#64748b",
                        padding: "4px 10px",
                        fontSize: "0.72rem",
                        fontWeight: "600",
                        borderRadius: "4px",
                        cursor: "pointer",
                        boxShadow: regModeTab === 'bulk' ? "0 1px 2px rgba(0,0,0,0.05)" : "none"
                      }}
                    >
                      <Users size={12} style={{ display: "inline", marginRight: "4px", verticalAlign: "middle" }} />
                      Đăng ký cả lớp HC
                    </button>
                  </div>
                </div>

                {regModeTab === 'single' ? (
                  <form onSubmit={handleEnrollStudent} style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
                    <div style={{ ...styles.formGroup, margin: 0, flex: 1 }}>
                      <label style={styles.label}>MSSV Sinh viên</label>
                      <input
                        style={{ ...styles.input, padding: "8px 12px", fontSize: "0.82rem" }}
                        placeholder="Nhập MSSV sinh viên cần đăng ký (VD: N22DCCN134)"
                        value={enrollMssv}
                        onChange={(e) => setEnrollMssv(e.target.value.toUpperCase())}
                        required
                      />
                    </div>
                    <button type="submit" style={{ ...styles.btn, height: "38px", padding: "0 15px", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                      Thêm vào lớp
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleBulkEnroll} style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
                    <div style={{ ...styles.formGroup, margin: 0, flex: 1 }}>
                      <label style={styles.label}>Tên Lớp Hành Chính</label>
                      <input
                        style={{ ...styles.input, padding: "8px 12px", fontSize: "0.82rem" }}
                        placeholder="Nhập lớp hành chính để thêm cả lớp (VD: D22CQCNPM02-N)"
                        value={bulkClassCode}
                        onChange={(e) => setBulkClassCode(e.target.value.toUpperCase())}
                        required
                      />
                    </div>
                    <button type="submit" style={{ ...styles.btn, height: "38px", padding: "0 15px", fontSize: "0.8rem", backgroundColor: "#0284c7", whiteSpace: "nowrap" }}>
                      Đăng ký cả lớp
                    </button>
                  </form>
                )}
              </div>

              {/* Bảng danh sách thành viên */}
              <div style={{ background: "#ffffff", border: "1px solid #d0e0eb", borderRadius: "10px", padding: "15px", boxShadow: "0 2px 5px rgba(0,0,0,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "#1e293b" }}>
                    Danh sách sinh viên trong lớp học phần
                  </span>
                  <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "20px", background: "#e0f2fe", color: "#0369a1", fontWeight: "700" }}>
                    Sĩ số: {enrolledStudents.length} SV
                  </span>
                </div>

                {enrolledStudents.length === 0 ? (
                  <p style={{ fontSize: "0.75rem", color: "#94a3b8", textAlign: "center", padding: "20px 0" }}>Chưa có sinh viên nào đăng ký vào lớp này.</p>
                ) : (
                  <div style={{ overflowY: "auto", maxHeight: "250px" }}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>MSSV</th>
                          <th style={styles.th}>Họ Tên</th>
                          <th style={styles.th}>Lớp Chuyên Ngành</th>
                          <th style={{ ...styles.th, textAlign: "center" }}>Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrolledStudents.map((st) => (
                          <tr key={st.mssv}>
                            <td style={styles.td}>{st.mssv}</td>
                            <td style={styles.td}><strong>{st.ho_ten}</strong></td>
                            <td style={styles.td}>{st.lop_base}</td>
                            <td style={{ ...styles.td, textAlign: "center" }}>
                              <button
                                onClick={() => handleUnenrollStudent(st.mssv)}
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  color: "#ef4444",
                                  cursor: "pointer",
                                  padding: "4px",
                                  borderRadius: "4px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  transition: "background 0.15s"
                                }}
                                title="Xóa khỏi lớp"
                                onMouseEnter={(e) => e.target.style.background = "#fee2e2"}
                                onMouseLeave={(e) => e.target.style.background = "transparent"}
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
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
        <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0 0 10px 0" }}>
          {role === 'giang_vien' ? "Danh sách Sinh viên các lớp phụ trách" : "Danh sách Sinh viên hệ thống"}
        </h4>

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
                        <br />
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
                        <small>{st.ngay_sinh || 'N/A'}</small><br />
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
      display: "block",
      gridTemplateColumns: "1fr",
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


  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <Zap size={16} /> Bảng điều khiển phân hệ chuyên cần (Quyền: {role.toUpperCase()})
      </div>
      <div style={styles.cardBody}>
        <div style={styles.aiContainer}>
          {/* Trái: Camera mô phỏng quét khuôn mặt (Chỉ dành cho Admin và khi ở tab camera_dashboard) */}
          {role === 'admin' && activeTab === 'camera_dashboard' && (
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
                  onClick={() => { if (useWebcam) { stopWebcam(); } else { startWebcam(); } }}
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
                style={{ ...styles.dropzone, cursor: "default" }}
              >
                {useWebcam ? (
                  <div style={{ ...styles.previewWrapper, width: "100%", height: "100%", position: "relative" }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      style={{ ...styles.previewImage, width: "100%", height: "100%", objectFit: "cover" }}
                      onLoadedMetadata={() => {
                        if (canvasRef.current && videoRef.current) {
                          canvasRef.current.width = videoRef.current.clientWidth || 640;
                          canvasRef.current.height = videoRef.current.clientHeight || 480;
                        }
                      }}
                    />
                    <canvas ref={canvasRef} style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      pointerEvents: "none"
                    }}></canvas>
                  </div>
                ) : (
                  <div style={{ ...styles.dropzonePrompt, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", height: "300px" }}>
                    <Camera size={48} color="#94a3b8" />
                    <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "#64748b", margin: 0 }}>
                      Camera đang tắt
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0 }}>Nhấn "Mở Camera" để bắt đầu nhận diện và điểm danh tự động</p>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => { stopWebcam(); resetRecognition(); }}
                  className="btn btn-secondary"
                  style={{ ...styles.btn, ...styles.btnSecondary, width: "100%" }}
                >
                  Làm mới
                </button>
              </div>

              {detectionLogs.length > 0 && (
                <div style={{ background: "#f8fbfd", padding: "12px", borderRadius: "8px", border: "1px solid #d0e0eb" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#106fa6", display: "block", marginBottom: "8px" }}>
                    Kết quả kiểm tra luồng khuôn mặt:
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {detectionLogs.map((l, idx) => (
                      <div key={idx} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "8px",
                        borderRadius: "6px",
                        background: "#ffffff",
                        border: "1px solid #e2edf5"
                      }}>
                        {l.is_known ? (
                          <>
                            <img
                              src={`${API_BASE}/images/${l.mssv}.jpg`}
                              alt={l.fullname}
                              onError={(e) => { e.target.src = "https://via.placeholder.com/40?text=SV"; }}
                              style={{ width: "45px", height: "45px", borderRadius: "50%", objectFit: "cover", border: "2px solid #10b981" }}
                            />
                            <div style={{ fontSize: "0.8rem", color: "#2a3d4a" }}>
                              <div style={{ fontWeight: "700", color: "#10b981" }}>✓ {l.fullname} ({l.mssv})</div>
                              <div style={{ fontSize: "0.75rem", color: "#54738c" }}>Lớp: {l.lop_base}</div>
                              <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#106fa6" }}>
                                Trạng thái: {l.trang_thai}
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{
                              width: "45px",
                              height: "45px",
                              borderRadius: "50%",
                              background: "#fee2e2",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: "2px solid #ef4444"
                            }}>
                              <span style={{ color: "#ef4444", fontWeight: "bold", fontSize: "1.2rem" }}>?</span>
                            </div>
                            <div style={{ fontSize: "0.8rem", color: "#ef4444", fontWeight: "600" }}>
                              ✗ Không thể điểm danh: Khuôn mặt lạ.
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
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
                      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                        <input
                          type="file"
                          accept="image/*"
                          id="reg-photo-file-ptit-admin"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            if (e.target.files.length > 0) {
                              setRegPhoto(e.target.files[0]);
                              setRegPhotoName(e.target.files[0].name);
                              setRegPreviewSrc(URL.createObjectURL(e.target.files[0]));
                              stopRegWebcam();
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
                        <button
                          type="button"
                          style={{
                            ...styles.btn,
                            ...(regUseWebcam ? { backgroundColor: "#ef4444" } : styles.btnSecondary),
                            padding: "8px 14px",
                            fontSize: "0.8rem"
                          }}
                          onClick={() => { if (regUseWebcam) { stopRegWebcam(); } else { startRegWebcam(); } }}
                        >
                          {regUseWebcam ? "Tắt Camera" : "Chụp từ Camera"}
                        </button>
                      </div>

                      {regUseWebcam && (
                        <div style={{
                          position: "relative",
                          width: "320px",
                          height: "240px",
                          borderRadius: "8px",
                          overflow: "hidden",
                          border: "2px solid #1d92d1",
                          marginBottom: "10px"
                        }}>
                          <video
                            ref={regVideoRef}
                            autoPlay
                            playsInline
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                          <button
                            type="button"
                            onClick={captureRegPhoto}
                            style={{
                              position: "absolute",
                              bottom: "10px",
                              left: "50%",
                              transform: "translateX(-50%)",
                              backgroundColor: "#10b981",
                              color: "#fff",
                              border: "none",
                              borderRadius: "20px",
                              padding: "6px 16px",
                              fontSize: "0.8rem",
                              fontWeight: "bold",
                              cursor: "pointer",
                              boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
                            }}
                          >
                            📸 Chụp hình
                          </button>
                        </div>
                      )}

                      {regPreviewSrc && (
                        <div style={{ marginBottom: "10px" }}>
                          <span style={{ fontSize: "0.75rem", color: "#54738c", display: "block", marginBottom: "4px" }}>Ảnh xem trước:</span>
                          <img
                            src={regPreviewSrc}
                            alt="Registration Preview"
                            style={{ width: "150px", height: "150px", borderRadius: "8px", objectFit: "cover", border: "1px solid #d0e0eb" }}
                          />
                        </div>
                      )}

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
                            <label style={styles.label}>Chọn lớp tín chỉ (Môn học)</label>
                            <select
                              required
                              style={styles.input}
                              value={schClass}
                              onChange={(e) => setSchClass(e.target.value)}
                            >
                              <option value="">-- Chọn lớp tín chỉ --</option>
                              {creditClasses.map(c => (
                                <option key={c.class_id} value={c.class_id}>
                                  {c.class_id} - {c.subject_name}
                                </option>
                              ))}
                            </select>
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
                                      <strong>{s.class_id}</strong><br />
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
                                          📅 {s.study_date}<br />
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
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                    {/* Form tạo môn học */}
                    <div style={{ background: "#f8fbfd", border: "1px solid #d0e0eb", borderRadius: "8px", padding: "15px" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#106fa6", display: "block", marginBottom: "12px" }}>Tạo môn học gốc</span>
                      <form onSubmit={handleCreateSubject}>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Mã môn học</label>
                          <input
                            type="text"
                            placeholder="Mã môn (VD: INT1306)"
                            required
                            style={styles.input}
                            value={subCode}
                            onChange={(e) => setSubCode(e.target.value.toUpperCase())}
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Tên môn học</label>
                          <input
                            type="text"
                            placeholder="Tên môn học"
                            required
                            style={styles.input}
                            value={subName}
                            onChange={(e) => setSubName(e.target.value)}
                          />
                        </div>
                        <button type="submit" style={{ ...styles.btn, width: "100%", marginTop: "10px" }}>Tạo môn học</button>
                      </form>
                    </div>

                    {/* Form tạo lớp tín chỉ */}
                    <div style={{ background: "#f8fbfd", border: "1px solid #d0e0eb", borderRadius: "8px", padding: "15px" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#106fa6", display: "block", marginBottom: "12px" }}>Tạo lớp học phần (Tín chỉ)</span>
                      <form onSubmit={handleCreateCreditClass}>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Mã lớp tín chỉ</label>
                          <input
                            type="text"
                            placeholder="Mã lớp (VD: D22CQCNPM02-N)"
                            required
                            style={styles.input}
                            value={ccCode}
                            onChange={(e) => setCcCode(e.target.value.toUpperCase())}
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Môn học liên kết</label>
                          <input
                            type="text"
                            placeholder="Mã môn học liên kết (VD: INT1306)"
                            required
                            style={styles.input}
                            value={ccSub}
                            onChange={(e) => setCcSub(e.target.value.toUpperCase())}
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Phân công Giảng viên dạy</label>
                          <select
                            style={styles.input}
                            value={ccLecturer}
                            onChange={(e) => setCcLecturer(e.target.value)}
                          >
                            <option value="">-- Không phân công / Tự do --</option>
                            {lecturersList.map(l => (
                              <option key={l.lecturer_id} value={l.lecturer_id}>
                                {l.lecturer_id} - {l.full_name} ({l.department || "Khoa CNTT"})
                              </option>
                            ))}
                          </select>
                        </div>
                        <button type="submit" style={{ ...styles.btn, width: "100%", marginTop: "10px", backgroundColor: "#0284c7" }}>Tạo lớp tín chỉ</button>
                      </form>
                    </div>
                  </div>
                )}
                {activeTab === 'students_list' && renderStudentsListTab()}

                {activeTab === 'class_management' && renderClassManagementTab()}
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
                        <select
                          style={{ ...styles.input, width: "220px" }}
                          value={manualClass}
                          onChange={(e) => setManualClass(e.target.value)}
                        >
                          <option value="">-- Chọn lớp tín chỉ --</option>
                          {creditClasses.map(c => (
                            <option key={c.class_id} value={c.class_id}>
                              {c.class_id} - {c.subject_name}
                            </option>
                          ))}
                        </select>
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
                                <strong>{st.ho_ten}</strong><br />
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
                                <strong>{l.ho_ten}</strong><br />
                                <small style={{ color: "#777" }}>{l.mssv}</small>
                              </td>
                              <td style={styles.td}>
                                <small>Lớp: {l.ma_lop_tc}</small><br />
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
                    <div style={{ display: "flex", gap: "10px", marginBottom: "15px", alignItems: "flex-end" }}>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Chọn lớp tín chỉ giảng dạy</label>
                        <select
                          style={{ ...styles.input, width: "250px" }}
                          value={reportClass}
                          onChange={(e) => setReportClass(e.target.value)}
                        >
                          <option value="">-- Chọn lớp tín chỉ --</option>
                          {creditClasses.map(c => (
                            <option key={c.class_id} value={c.class_id}>
                              {c.class_id} - {c.subject_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button onClick={fetchAttendanceReport} style={{ ...styles.btn, height: "38px" }}>Tổng kết lớp</button>
                      {attendanceReport.length > 0 && (
                        <button onClick={exportAttendanceReport} style={{ ...styles.btn, height: "38px", backgroundColor: "#10b981" }}>Xuất Excel</button>
                      )}
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
                {activeTab === 'class_management' && renderClassManagementTab()}
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
                          if (e.target.files.length > 0) {
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
                                <strong>{c.subject_name}</strong><br />
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

                    {/* Detailed upcoming schedules for student's registered classes */}
                    {studentClasses.length > 0 && (
                      <div style={{ marginTop: "25px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid #e2edf5", paddingBottom: "6px" }}>
                          <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: 0 }}>Thời khóa biểu học tập của tôi</h4>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              type="button"
                              onClick={() => setScheduleViewMode('grid')}
                              style={{
                                ...styles.btn,
                                padding: "4px 8px",
                                fontSize: "0.7rem",
                                backgroundColor: scheduleViewMode === 'grid' ? "#106fa6" : "#ffffff",
                                color: scheduleViewMode === 'grid' ? "#ffffff" : "#475569",
                                border: "1px solid #cbd5e1"
                              }}
                            >
                              📅 Dạng Lịch Tuần
                            </button>
                            <button
                              type="button"
                              onClick={() => setScheduleViewMode('list')}
                              style={{
                                ...styles.btn,
                                padding: "4px 8px",
                                fontSize: "0.7rem",
                                backgroundColor: scheduleViewMode === 'list' ? "#106fa6" : "#ffffff",
                                color: scheduleViewMode === 'list' ? "#ffffff" : "#475569",
                                border: "1px solid #cbd5e1"
                              }}
                            >
                              📋 Dạng Danh Sách
                            </button>
                          </div>
                        </div>

                        {(() => {
                          const myClassIds = (studentClasses || []).map(c => c ? c.class_id : "");
                          const mySchedules = (schedules || []).filter(s => s && myClassIds.includes(s.class_id));

                          if (mySchedules.length === 0) {
                            return <p style={{ fontSize: "0.8rem", color: "#6c8da3", padding: "10px", background: "#f8fbfd", borderRadius: "6px", border: "1px solid #eef2f6" }}>Chưa xếp lịch học cụ thể cho các môn học này.</p>;
                          }

                          if (scheduleViewMode === 'list') {
                            return (
                              <table style={styles.table}>
                                <thead>
                                  <tr>
                                    <th style={styles.th}>Môn học</th>
                                    <th style={styles.th}>Mã lớp</th>
                                    <th style={styles.th}>Ngày học</th>
                                    <th style={styles.th}>Giờ bắt đầu</th>
                                    <th style={styles.th}>Phòng học</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {mySchedules.map((s, idx) => (
                                    <tr key={idx}>
                                      <td style={styles.td}><strong>{s.subject_name || "N/A"}</strong></td>
                                      <td style={styles.td}>{s.class_id || "N/A"}</td>
                                      <td style={styles.td}>{s.study_date || "N/A"}</td>
                                      <td style={styles.td}>{s.start_time ? s.start_time.substring(0, 5) : "N/A"}</td>
                                      <td style={styles.td}>
                                        <span style={{
                                          padding: "3px 6px",
                                          borderRadius: "4px",
                                          backgroundColor: "#f0f9ff",
                                          color: "#0369a1",
                                          fontWeight: "600",
                                          fontSize: "0.75rem"
                                        }}>
                                          🚪 {s.room || "N/A"}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            );
                          }

                          // Grid Mode: Group by day of week
                          const daysOfWeek = getDaysOfWeek(selectedWeekStart);

                          // Filter schedules that fall within the selected week (Monday to Sunday)
                          const weekSchedules = mySchedules.filter(s => {
                            return s.study_date >= selectedWeekStart && s.study_date <= daysOfWeek[6].dateStr;
                          });

                          const weekdays = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];
                          const groupedSchedules = {
                            "Thứ 2": [], "Thứ 3": [], "Thứ 4": [], "Thứ 5": [], "Thứ 6": [], "Thứ 7": [], "Chủ Nhật": []
                          };

                          weekSchedules.forEach(s => {
                            const dateObj = new Date(s.study_date);
                            const day = dateObj.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
                            const dayLabel = day === 0 ? "Chủ Nhật" : `Thứ ${day + 1}`;
                            if (groupedSchedules[dayLabel]) {
                              groupedSchedules[dayLabel].push(s);
                            }
                          });

                          const handlePrevWeek = () => {
                            const prev = new Date(selectedWeekStart);
                            prev.setDate(prev.getDate() - 7);
                            setSelectedWeekStart(prev.toISOString().split('T')[0]);
                          };

                          const handleNextWeek = () => {
                            const next = new Date(selectedWeekStart);
                            next.setDate(next.getDate() + 7);
                            setSelectedWeekStart(next.toISOString().split('T')[0]);
                          };

                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
                              {/* Week Selector UI */}
                              <div style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "12px",
                                background: "#ffffff",
                                padding: "10px 18px",
                                borderRadius: "8px",
                                boxShadow: "0 2px 8px rgba(16, 111, 166, 0.08)",
                                border: "1px solid #d0e0eb",
                                width: "fit-content",
                                alignSelf: "center"
                              }}>
                                <button
                                  type="button"
                                  onClick={handlePrevWeek}
                                  style={{
                                    background: "#1d92d1",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "6px",
                                    padding: "6px 14px",
                                    cursor: "pointer",
                                    fontSize: "0.78rem",
                                    fontWeight: "600",
                                    transition: "background-color 0.2s"
                                  }}
                                  onMouseOver={(e) => e.target.style.backgroundColor = "#106fa6"}
                                  onMouseOut={(e) => e.target.style.backgroundColor = "#1d92d1"}
                                >
                                  ◀ Tuần trước
                                </button>
                                <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#1e293b", minWidth: "180px", textAlign: "center" }}>
                                  📅 {formatDate(selectedWeekStart)} - {formatDate(daysOfWeek[6].dateStr)}
                                </span>
                                <button
                                  type="button"
                                  onClick={handleNextWeek}
                                  style={{
                                    background: "#1d92d1",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "6px",
                                    padding: "6px 14px",
                                    cursor: "pointer",
                                    fontSize: "0.78rem",
                                    fontWeight: "600",
                                    transition: "background-color 0.2s"
                                  }}
                                  onMouseOver={(e) => e.target.style.backgroundColor = "#106fa6"}
                                  onMouseOut={(e) => e.target.style.backgroundColor = "#1d92d1"}
                                >
                                  Tuần sau ▶
                                </button>
                              </div>

                              <div style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                                gap: "10px"
                              }}>
                                {weekdays.map(day => {
                                  const dayInfo = daysOfWeek.find(d => d.label === day);
                                  return (
                                    <div key={day} style={{
                                      background: "#f8fbfd",
                                      border: "1px solid #e2edf5",
                                      borderRadius: "6px",
                                      padding: "8px",
                                      minHeight: "150px"
                                    }}>
                                      <div style={{
                                        fontSize: "0.72rem",
                                        fontWeight: "bold",
                                        color: "#1e293b",
                                        textAlign: "center",
                                        borderBottom: "2px solid #106fa6",
                                        paddingBottom: "4px",
                                        marginBottom: "8px"
                                      }}>
                                        <div>{day}</div>
                                        <div style={{ fontSize: "0.6rem", color: "#64748b", fontWeight: "normal", marginTop: "2px" }}>
                                          {dayInfo ? dayInfo.displayDate : ""}
                                        </div>
                                      </div>

                                      {groupedSchedules[day].length === 0 ? (
                                        <div style={{
                                          fontSize: "0.7rem",
                                          color: "#94a3b8",
                                          textAlign: "center",
                                          marginTop: "20px"
                                        }}>
                                          Trống
                                        </div>
                                      ) : (
                                        groupedSchedules[day].sort((a, b) => (a.start_time || "").localeCompare(b.start_time || "")).map((s, idx) => (
                                          <div key={idx} style={{
                                            background: "#ffffff",
                                            borderLeft: "3px solid #0284c7",
                                            borderRadius: "4px",
                                            padding: "6px",
                                            marginBottom: "6px",
                                            boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                                          }}>
                                            <div style={{ fontSize: "0.7rem", fontWeight: "bold", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={s.subject_name || ""}>
                                              {s.subject_name || "N/A"}
                                            </div>
                                            <div style={{ fontSize: "0.62rem", color: "#64748b", margin: "2px 0" }}>
                                              🕒 {s.start_time ? s.start_time.substring(0, 5) : "N/A"}
                                            </div>
                                            <div style={{ fontSize: "0.62rem", fontWeight: "600", color: "#0369a1" }}>
                                              🚪 {s.room || "N/A"}
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'course_registration' && (
                  <div>
                    {/* Section 1: Enrolled classes & progress */}
                    <div style={{ marginBottom: "25px" }}>
                      <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0 0 10px 0" }}>Lớp Học Phần Đang Theo Học & Tiến Độ</h4>
                      {studentClasses.length === 0 ? (
                        <p style={{ fontSize: "0.8rem", color: "#6c8da3", padding: "10px", background: "#f8fbfd", borderRadius: "6px", border: "1px solid #eef2f6" }}>
                          Bạn chưa đăng ký lớp tín chỉ nào. Vui lòng xem danh sách các lớp học phần bên dưới để đăng ký học.
                        </p>
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
                                <td style={styles.td}><strong>{c.class_id}</strong></td>
                                <td style={styles.td}>
                                  <strong>{c.subject_name}</strong><br />
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

                    {/* Section 2: Available classes to register */}
                    <div>
                      <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0 0 10px 0" }}>Danh Sách Lớp Học Phần Đang Mở</h4>
                      {availableClasses.length === 0 ? (
                        <p style={{ fontSize: "0.8rem", color: "#6c8da3", padding: "10px", background: "#f8fbfd", borderRadius: "6px", border: "1px solid #eef2f6" }}>
                          Hiện tại không có lớp học phần nào khả dụng để đăng ký (Bạn đã đăng ký học tất cả các lớp đang mở).
                        </p>
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
