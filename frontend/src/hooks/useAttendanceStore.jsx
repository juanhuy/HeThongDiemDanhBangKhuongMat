import { useState, useRef, useEffect } from "react";
import { BookOpen, Trash2, UserPlus, Users, FileText } from "lucide-react";
import { apiFetch } from "../api/client";

export const useAttendanceStore = ({ API_BASE, showToast, onAttendanceLogged, user, activeMenu, onUnauthorized }) => {
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
  const [subCredits, setSubCredits] = useState('3');
  const [ccCode, setCcCode] = useState('');
  const [ccSub, setCcSub] = useState('');

  // --- Teacher Tab States ---
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [manualMssv, setManualMssv] = useState('');
  const [manualSessionId, setManualSessionId] = useState('1');
  const [manualStatus, setManualStatus] = useState('Đúng giờ');
  const [reportClass, setReportClass] = useState('D22CQCNPM02-N');
  const [attendanceReport, setAttendanceReport] = useState([]);
  const [reportFromDate, setReportFromDate] = useState('');
  const [reportToDate, setReportToDate] = useState('');
  const [lecturerReport, setLecturerReport] = useState(null);
  const [subjectReport, setSubjectReport] = useState(null);
  const [myReport, setMyReport] = useState(null);
  const [facultyReport, setFacultyReport] = useState(null);
  const [facultyCohort, setFacultyCohort] = useState('');
  const [facultyClass, setFacultyClass] = useState('');
  const [facultyDept, setFacultyDept] = useState('');
  const [reportSubject, setReportSubject] = useState('');
  const [reportLecturer, setReportLecturer] = useState('');
  const [reportSearch, setReportSearch] = useState('');
  const [reportPage, setReportPage] = useState(1);
  const [adminSummary, setAdminSummary] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [debouncedClassSearch, setDebouncedClassSearch] = useState('');
  const [studentPage, setStudentPage] = useState(1);

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

  // --- Active Liveness States ---
  const [activeChallenge, setActiveChallenge] = useState(null); // 'TURN_LEFT', 'TURN_RIGHT', 'LOOK_UP', 'LOOK_DOWN'
  const [challengePassed, setChallengePassed] = useState(false);
  const [challengePrompt, setChallengePrompt] = useState('');
  const [currentFace, setCurrentFace] = useState(null);

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
  const [newLecturerId, setNewLecturerId] = useState('');
  const [newLecturerName, setNewLecturerName] = useState('');
  const [newLecturerEmail, setNewLecturerEmail] = useState('');
  const [newLecturerDept, setNewLecturerDept] = useState('');
  const [editingLecturerId, setEditingLecturerId] = useState(null);
  const [editLecturerName, setEditLecturerName] = useState('');
  const [editLecturerEmail, setEditLecturerEmail] = useState('');
  const [editLecturerDept, setEditLecturerDept] = useState('');
  const [subjectsList, setSubjectsList] = useState([]);
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [editSubjectName, setEditSubjectName] = useState('');
  const [editSubjectCredits, setEditSubjectCredits] = useState('');
  const [editSubjectSemester, setEditSubjectSemester] = useState('');
  const [editSubjectPrereq, setEditSubjectPrereq] = useState('');
  const [editingClassId, setEditingClassId] = useState(null);
  const [editClassLecturer, setEditClassLecturer] = useState('');
  const [editClassCapacity, setEditClassCapacity] = useState('');
  const [editClassSemester, setEditClassSemester] = useState('');
  const [editClassCohort, setEditClassCohort] = useState('');
  const [editClassStatus, setEditClassStatus] = useState('');
  const [myLeaveRequests, setMyLeaveRequests] = useState([]);
  const [classSchedules, setClassSchedules] = useState([]);
  const [regModeTab, setRegModeTab] = useState('single');
  const [classSearch, setClassSearch] = useState('');

  // Debounce tìm kiếm (phải đặt SAU khi khai báo searchKeyword/classSearch/filterClass)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchKeyword), 300);
    return () => clearTimeout(t);
  }, [searchKeyword]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedClassSearch(classSearch), 300);
    return () => clearTimeout(t);
  }, [classSearch]);
  useEffect(() => { setStudentPage(1); }, [debouncedSearch, filterClass]);

  const [editDate, setEditDate] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentClass, setEditStudentClass] = useState('');
  const [scheduleViewMode, setScheduleViewMode] = useState('grid');

  // --- States cho chuẩn hóa đăng ký học phần ---
  const [registrationInfo, setRegistrationInfo] = useState(null);
  const [totalCredits, setTotalCredits] = useState(0);
  const [subSemester, setSubSemester] = useState('');
  const [subPrereq, setSubPrereq] = useState('');
  const [ccSemester, setCcSemester] = useState('');
  const [ccYear, setCcYear] = useState('');
  const [ccCapacity, setCcCapacity] = useState('50');
  const [ccCohort, setCcCohort] = useState('');

  // --- States cho Bảng điều khiển DEMO ---
  const [demoControls, setDemoControls] = useState(null);
  const [demoSaving, setDemoSaving] = useState(false);

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
  const activeChallengeRef = useRef(null);
  const challengePassedRef = useRef(false);
  const challengeTimerRef = useRef(null);

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

  // Manage webcam recognition loop (Adaptive requestAnimationFrame request-response loop)
  useEffect(() => {
    let active = true;
    let isProcessing = false;

    const processFrame = async () => {
      if (!active) return;
      if (!useWebcam || !webcamStream) return;
      if (isProcessing) {
        requestAnimationFrame(processFrame);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2) {
        isProcessing = true;

        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = video.videoWidth || 640;
        tempCanvas.height = video.videoHeight || 480;
        const tempCtx = tempCanvas.getContext("2d");
        tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

        tempCanvas.toBlob(async (blob) => {
          if (!blob) {
            isProcessing = false;
            requestAnimationFrame(processFrame);
            return;
          }
          const formData = new FormData();
          formData.append("file", blob, "webcam_capture.jpg");

          try {
            const isChallengeActive = !challengePassedRef.current;
            const url = `${API_BASE}/api/recognize?phong_hoc=${encodeURIComponent(cameraRoom)}${isChallengeActive ? '&challenge_only=true' : ''}`;
            const res = await apiFetch(url, {
              method: "POST",
              body: formData
            });
            if (res.ok && active) {
              const data = await res.json();
              setDetectionLogs(data.results || []);

              // Logic Active Challenge
              if (data.results && data.results.length > 0) {
                 const mainFace = data.results[0]; // Ưu tiên khuôn mặt đầu tiên
                 if (mainFace.is_known && mainFace.is_real) {
                    if (isChallengeActive) {
                       // Nếu chưa có challenge nào, khởi tạo
                       if (!activeChallengeRef.current) {
                           const challenges = ['TURN_LEFT', 'TURN_RIGHT', 'LOOK_UP', 'LOOK_DOWN'];
                           const prompts = {
                               'TURN_LEFT': 'Vui lòng quay mặt sang TRÁI',
                               'TURN_RIGHT': 'Vui lòng quay mặt sang PHẢI',
                               'LOOK_UP': 'Vui lòng ngẩng mặt lên TRÊN',
                               'LOOK_DOWN': 'Vui lòng cúi mặt XUỐNG'
                           };
                           const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];
                           activeChallengeRef.current = randomChallenge;
                           setActiveChallenge(randomChallenge);
                           setChallengePrompt(prompts[randomChallenge]);
                       } else {
                           // Đã có challenge, kiểm tra xem vượt qua chưa
                           const { yaw, pitch } = mainFace.active_state || {yaw: 0, pitch: 0};
                           let passed = false;
                           if (activeChallengeRef.current === 'TURN_LEFT' && yaw < -20) passed = true;
                           else if (activeChallengeRef.current === 'TURN_RIGHT' && yaw > 20) passed = true;
                           else if (activeChallengeRef.current === 'LOOK_UP' && pitch < -15) passed = true;
                           else if (activeChallengeRef.current === 'LOOK_DOWN' && pitch > 15) passed = true;

                           if (passed) {
                               challengePassedRef.current = true;
                               setChallengePassed(true);
                               setChallengePrompt("Thử thách thành công! Đang điểm danh...");
                               
                               // Đặt hẹn giờ để reset trạng thái cho người tiếp theo sau 4 giây
                               if (challengeTimerRef.current) clearTimeout(challengeTimerRef.current);
                               challengeTimerRef.current = setTimeout(() => {
                                   activeChallengeRef.current = null;
                                   challengePassedRef.current = false;
                                   setActiveChallenge(null);
                                   setChallengePassed(false);
                                   setChallengePrompt("");
                               }, 4000);
                           }
                       }
                    }
                 }
              } else {
                 // Không thấy ai trong khung hình liên tục, có thể reset nhanh
                 if (activeChallengeRef.current && !challengePassedRef.current) {
                    // Tùy chọn: có thể đếm khung hình trống để reset
                 }
              }

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

                  let color;
                  let label;

                  if (resItem.is_real === false) {
                    color = "#f97316"; // Orange
                    label = resItem.trang_thai || "Giả mạo khuôn mặt";
                  } else if (resItem.is_known) {
                    color = "#10b981"; // Green
                    label = `${resItem.fullname} - ${resItem.trang_thai}`;
                  } else {
                    color = "#ef4444"; // Red
                    label = resItem.trang_thai || "Chưa đăng ký";
                  }

                  ctx.strokeStyle = color;
                  ctx.lineWidth = 3;
                  ctx.strokeRect(bx, by, bw, bh);

                  ctx.fillStyle = color;
                  ctx.font = "bold 13px 'Inter', sans-serif";
                  
                  if (activeChallengeRef.current && !challengePassedRef.current && resItem.is_known && resItem.is_real !== false) {
                      label = `[CHALLENGE] ${resItem.fullname}`;
                  }
                  const textWidth = ctx.measureText(label).width;

                  ctx.fillRect(bx, by - 24, textWidth + 14, 24);
                  ctx.fillStyle = "#ffffff";
                  ctx.fillText(label, bx + 7, by - 7);
                });
              }

              if (onAttendanceLogged && challengePassedRef.current) {
                onAttendanceLogged();
              }
            }
          } catch (err) {
            console.error("Lỗi tự động quét khuôn mặt: ", err);
          } finally {
            isProcessing = false;
            // Delay 60ms to prevent absolute CPU hogging but still keep it very fast (~15 FPS)
            setTimeout(() => {
              if (active) requestAnimationFrame(processFrame);
            }, 60);
          }
        }, "image/jpeg", 0.7);
      } else {
        requestAnimationFrame(processFrame);
      }
    };

    if (useWebcam && webcamStream) {
      requestAnimationFrame(processFrame);
    }

    return () => {
      active = false;
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
    } else if (activeTab === 'lecturers') {
      fetchLecturersList();
    } else if (activeTab === 'class_management') {
      fetchCreditClasses();
    } else if (activeTab === 'my_classes') {
      fetchStudentClasses();
      fetchSchedules();
    } else if (activeTab === 'teaching_schedule' || activeTab === 'schedule' || activeTab === 'summary_report' || activeTab === 'manual_checkin') {
      fetchSchedules();
      fetchCreditClasses();
    } else if (activeTab === 'course_registration') {
      fetchRegistrationInfo();
      fetchAvailableClasses();
      fetchStudentClasses();
    } else if (activeTab === 'submit_leave') {
      fetchMyLeaveRequests();
    } else if (activeTab === 'my_report') {
      fetchMyReport();
    } else if (activeTab === 'structure') {
      fetchLecturersList();
      fetchCreditClasses();
      fetchSubjectsList();
    } else if (activeTab === 'demo') {
      fetchDemoControls();
    }
  }, [activeTab]);

  const fetchRegistrationInfo = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/api/registration/info`);
      if (res.ok) {
        const data = await res.json();
        setRegistrationInfo(data);
      }
    } catch (err) {
      console.error("Lỗi khi tải thông tin đợt đăng ký:", err);
    }
  };

  const fetchDemoControls = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/api/admin/demo/controls`);
      if (res.ok) {
        const data = await res.json();
        setDemoControls(data.controls || {});
      }
    } catch (err) {
      console.error("Lỗi khi tải bảng điều khiển demo:", err);
    }
  };

  const handleDemoToggle = async (key, value) => {
    const prev = { ...(demoControls || {}) };
    setDemoControls(prevState => ({ ...(prevState || {}), [key]: value }));
    setDemoSaving(true);
    try {
      const res = await apiFetch(`${API_BASE}/api/admin/demo/controls`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value })
      });
      const data = await res.json();
      if (res.ok) {
        setDemoControls(data.controls || { ...prev, [key]: value });
        showToast(value ? `Đã bật "${key}".` : `Đã tắt "${key}".`, "success");
      } else {
        setDemoControls(prevState => ({ ...(prevState || {}), [key]: !value }));
        showToast(data.detail || "Cập nhật demo thất bại.", "danger");
      }
    } catch (err) {
      setDemoControls(prevState => ({ ...(prevState || {}), [key]: !value }));
      showToast("Lỗi kết nối.", "danger");
    } finally {
      setDemoSaving(false);
    }
  };

  const DEMO_TOGGLES = [
    { key: "demo_mode", label: "Chế độ DEMO (bật tổng thể)", hint: "Bật banner cảnh báo DEMO khắp hệ thống." },
    { key: "bypass_registration_window", label: "Bỏ qua đợt đăng ký (mở/đóng)", hint: "Cho phép đăng ký kể cả khi ngoài thời gian mở/đóng." },
    { key: "bypass_semester", label: "Bỏ qua học kỳ / niên khóa", hint: "Đăng ký được lớp thuộc học kỳ khác với học kỳ đang mở." },
    { key: "bypass_capacity", label: "Bỏ qua sĩ số tối đa lớp", hint: "Đăng ký vào lớp đã đủ chỗ." },
    { key: "bypass_prerequisites", label: "Bỏ qua môn tiên quyết", hint: "Đăng ký môn dù chưa học môn tiên quyết." },
    { key: "bypass_credit_limit", label: "Bỏ qua giới hạn tín chỉ", hint: "Đăng ký vượt quá số tín chỉ tối đa cho phép." },
    { key: "bypass_eligibility", label: "Bỏ qua học vụ & khóa học", hint: "Cho phép sinh viên bảo lưu / sai khóa đăng ký." },
    { key: "bypass_duplicate_subject", label: "Cho phép đăng ký trùng môn", hint: "Đăng ký cùng một môn học ở nhiều lớp." },
    { key: "allow_unenroll_after_attendance", label: "Cho phép hủy đăng ký dù đã điểm danh", hint: "Bỏ chặn khi sinh viên đã có buổi điểm danh trong lớp." },
    { key: "allow_after_hours_leave", label: "Cho phép nộp đơn nghỉ sau giờ học", hint: "Cho nộp đơn nghỉ kể cả khi buổi học đã bắt đầu." },
    { key: "allow_override_present_leave", label: "Cho phép duyệt đơn ghi đè buổi có mặt", hint: "Duyệt đơn nghỉ sẽ ghi đè buổi sinh viên đã có mặt thành Có phép." }
  ];

  const fetchAvailableClasses = async () => {
    if (!user?.mssv) return;
    try {
      const resAll = await apiFetch(`${API_BASE}/api/lop_tin_chi`);
      const resMy = await apiFetch(`${API_BASE}/api/students/${user.mssv}/classes`);
      let regSem = null;
      try {
        const resReg = await apiFetch(`${API_BASE}/api/registration/info`);
        if (resReg.ok) {
          const regData = await resReg.json();
          setRegistrationInfo(regData);
          regSem = regData?.semester;
        }
      } catch (e) { /* bỏ qua */ }
      if (resAll.ok && resMy.ok) {
        const dataAll = await resAll.json();
        const dataMy = await resMy.json();
        const myIds = (dataMy.classes || []).map(c => c.class_id);
        const available = (dataAll.classes || [])
          .filter(c => !myIds.includes(c.class_id))
          .filter(c => (c.status || 'Active').toLowerCase() === 'active')
          .filter(c => c.semester == null || regSem == null || Number(c.semester) === Number(regSem));
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
      const res = await apiFetch(`${API_BASE}/api/sinh_vien_lop_tin_chi`, {
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
      const res = await apiFetch(`${API_BASE}/api/sinh_vien_lop_tin_chi/${classId}/${user.mssv}`, {
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
    setFetching(true);
    try {
      let url = `${API_BASE}/api/lich_hoc_chi_tiet`;
      if (role === 'giang_vien' && user?.lecturer_id) {
        url += `?lecturer_id=${user.lecturer_id}`;
      }
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules || []);
      }
    } catch (err) {
      console.error("Lỗi khi tải lịch học:", err);
    }
   finally { setFetching(false); }
};

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa buổi học này không?")) return;
    try {
      const res = await apiFetch(`${API_BASE}/api/lich_hoc_chi_tiet/${scheduleId}`, {
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
      const res = await apiFetch(`${API_BASE}/api/lich_hoc_chi_tiet/${scheduleId}`, {
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
      const res = await apiFetch(`${API_BASE}/api/admin/students/${studentId}`, {
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
      const res = await apiFetch(`${API_BASE}/api/admin/students/${studentId}`, {
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
      const res = await apiFetch(`${API_BASE}/api/admin/lecturers`);
      if (res.ok) {
        const data = await res.json();
        setLecturersList(data || []);
      }
    } catch (err) {
      console.error("Lỗi khi tải giảng viên:", err);
    }
  };

  const fetchSubjectsList = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/api/subjects`);
      if (res.ok) {
        setSubjectsList(await res.json());
      }
    } catch (err) {
      console.error("Lỗi tải môn học:", err);
    }
  };

  const fetchMyLeaveRequests = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/api/student/leave_requests`);
      if (res.ok) {
        const data = await res.json();
        setMyLeaveRequests(data.requests || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchClassSchedules = async (classId) => {
    try {
      const res = await apiFetch(`${API_BASE}/api/lich_hoc_chi_tiet?class_id=${classId}`);
      if (res.ok) {
        const data = await res.json();
        setClassSchedules(data.schedules || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateLecturer = async (e) => {
    e.preventDefault();
    if (!newLecturerEmail) {
      showToast("Vui lòng nhập email giảng viên.", "danger");
      return;
    }
    try {
      const res = await apiFetch(`${API_BASE}/api/admin/lecturers/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lecturer_id: newLecturerId,
          full_name: newLecturerName,
          email: newLecturerEmail,
          department: newLecturerDept || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Đã tạo giảng viên ${newLecturerName}`);
        setNewLecturerId(''); setNewLecturerName(''); setNewLecturerEmail(''); setNewLecturerDept('');
        fetchLecturersList();
      } else {
        showToast(data.detail || "Lỗi tạo giảng viên.", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const handleUpdateLecturer = async (e, lecturerId) => {
    e.preventDefault();
    try {
      const res = await apiFetch(`${API_BASE}/api/admin/lecturers/${lecturerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: editLecturerName,
          department: editLecturerDept || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Đã cập nhật giảng viên.");
        setEditingLecturerId(null);
        fetchLecturersList();
      } else {
        showToast(data.detail || "Lỗi cập nhật.", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const handleDeleteLecturer = async (lecturerId) => {
    if (!window.confirm(`Xóa giảng viên ${lecturerId}? Tài khoản liên kết sẽ bị khóa.`)) return;
    try {
      const res = await apiFetch(`${API_BASE}/api/admin/lecturers/${lecturerId}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Đã xóa giảng viên.");
        fetchLecturersList();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.detail || "Lỗi xóa giảng viên.", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const handleUpdateSubject = async (e, subjectId) => {
    e.preventDefault();
    try {
      const res = await apiFetch(`${API_BASE}/api/subjects/${subjectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_name: editSubjectName,
          credits: editSubjectCredits ? Number(editSubjectCredits) : null,
          semester: editSubjectSemester ? Number(editSubjectSemester) : null,
          prerequisites: editSubjectPrereq || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Đã cập nhật môn học.");
        setEditingSubjectId(null);
        fetchSubjectsList();
      } else {
        showToast(data.detail || "Lỗi cập nhật môn học.", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!window.confirm(`Xóa môn học ${subjectId}? Các lớp tín chỉ liên quan sẽ bị xóa theo.`)) return;
    try {
      const res = await apiFetch(`${API_BASE}/api/subjects/${subjectId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(`Đã xóa môn học ${subjectId}.`);
        fetchSubjectsList();
        fetchCreditClasses();
      } else {
        showToast(data.detail || "Lỗi xóa môn học.", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const handleUpdateClass = async (e, classId) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      if (editClassLecturer) fd.append("ma_gv", editClassLecturer);
      if (editClassCapacity) fd.append("si_so_toi_da", editClassCapacity);
      if (editClassSemester) fd.append("hoc_ky", editClassSemester);
      if (editClassCohort) fd.append("khoa", editClassCohort);
      if (editClassStatus) fd.append("trang_thai", editClassStatus);
      const res = await apiFetch(`${API_BASE}/api/lop_tin_chi/${classId}`, { method: "PUT", body: fd });
      const data = await res.json();
      if (res.ok) {
        showToast(`Đã cập nhật lớp ${classId}.`);
        setEditingClassId(null);
        fetchCreditClasses();
      } else {
        showToast(data.detail || "Lỗi cập nhật lớp.", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const handleDeleteClass = async (classId) => {
    if (!window.confirm(`Xóa lớp tín chỉ ${classId}? Lịch học, điểm danh và đăng ký liên quan sẽ bị xóa.`)) return;
    try {
      const res = await apiFetch(`${API_BASE}/api/lop_tin_chi/${classId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(`Đã xóa lớp ${classId}.`);
        fetchCreditClasses();
      } else {
        showToast(data.detail || "Lỗi xóa lớp.", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const fetchCreditClasses = async () => {
    setFetching(true);
    try {
      let url = `${API_BASE}/api/lop_tin_chi`;
      if (role === 'giang_vien' && user?.lecturer_id) {
        url += `?lecturer_id=${user.lecturer_id}`;
      }
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setCreditClasses(data.classes || []);
      }
    } catch (err) {
      console.error(err);
    }
   finally { setFetching(false); }
};

  const fetchEnrolledStudents = async (classId) => {
    setSelectedClass(classId);
    try {
      const res = await apiFetch(`${API_BASE}/api/reports/attendance?ma_lop_tc=${classId}`);
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
      const res = await apiFetch(`${API_BASE}/api/sinh_vien_lop_tin_chi`, {
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
      const res = await apiFetch(`${API_BASE}/api/sinh_vien_lop_tin_chi/${selectedClass}/${mssv}`, {
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
      const res = await apiFetch(`${API_BASE}/api/sinh_vien_lop_tin_chi/bulk_administrative`, {
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
      const res = await apiFetch(`${API_BASE}/api/students/${user.mssv}/classes`);
      if (res.ok) {
        const data = await res.json();
        setStudentClasses(data.classes || []);
        setTotalCredits(data.total_credits || 0);
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
          const res = await apiFetch(`${API_BASE}/api/recognize?phong_hoc=${cam.room}`, {
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
    setFetching(true);
    try {
      let url = `${API_BASE}/api/admin/students`;
      if (role === 'giang_vien' && user?.lecturer_id) {
        url += `?lecturer_id=${user.lecturer_id}`;
      }
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setStudentsList(data || []);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách sinh viên:", err);
    }
   finally { setFetching(false); }
};

  const fetchManualClassStudents = async () => {
    if (!manualClass) {
      showToast("Vui lòng nhập mã lớp tín chỉ.", "danger");
      return;
    }
    setManualLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/api/reports/attendance?ma_lop_tc=${manualClass}`);
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
      const res = await apiFetch(`${API_BASE}/api/teacher/manual_checkin`, {
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
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setLeaveRequests(data.requests || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveFace = async (mssv) => {
    const formData = new FormData();
    formData.append("mssv", mssv);
    try {
      const res = await apiFetch(`${API_BASE}/api/admin/approve_face`, {
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
    if (!window.confirm("Duyệt đơn nghỉ phép này? Buổi học sẽ được tính là 'Có phép'.")) return;
    const formData = new FormData();
    formData.append("request_id", reqId);
    formData.append("nguoi_duyet", username);
    try {
      const res = await apiFetch(`${API_BASE}/api/teacher/approve_leave`, {
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
    if (!window.confirm("Từ chối đơn nghỉ phép này? Buổi học sẽ được tính là 'Vắng không phép'.")) return;
    const formData = new FormData();
    formData.append("request_id", reqId);
    formData.append("nguoi_duyet", username);
    try {
      const res = await apiFetch(`${API_BASE}/api/teacher/reject_leave`, {
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
      const res = await apiFetch(`${API_BASE}/api/teacher/manual_checkin`, {
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
      let url = `${API_BASE}/api/reports/attendance?ma_lop_tc=${reportClass}`;
      if (reportFromDate) url += `&from_date=${reportFromDate}`;
      if (reportToDate) url += `&to_date=${reportToDate}`;
      const res = await apiFetch(url);
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

  const fetchLecturerReport = async () => {
    try {
      let url = `${API_BASE}/api/reports/lecturer`;
      if (role === 'giang_vien' && user?.lecturer_id) url += `?lecturer_id=${user.lecturer_id}`;
      else if (reportLecturer) url += `?lecturer_id=${reportLecturer}`;
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setLecturerReport(data);
        setSubjectReport(null);
        setReportPage(1);
      } else {
        showToast("Lỗi tải báo cáo giảng viên.", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const fetchSubjectReport = async () => {
    if (!reportSubject) {
      showToast("Vui lòng chọn môn học.", "danger");
      return;
    }
    try {
      const res = await apiFetch(`${API_BASE}/api/reports/subject?subject_id=${reportSubject}`);
      if (res.ok) {
        const data = await res.json();
        setSubjectReport(data);
        setLecturerReport(null);
        setReportPage(1);
      } else {
        showToast("Lỗi tải báo cáo môn học.", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const downloadBlob = async (url, filename) => {
    try {
      const res = await apiFetch(url);
      if (!res.ok) {
        showToast("Lỗi khi xuất file.", "danger");
        return;
      }
      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(objectUrl);
      showToast("Đã xuất file Excel.");
    } catch (err) {
      showToast("Lỗi kết nối khi xuất file.", "danger");
    }
  };

  const exportLecturerReport = () => {
    let url = `${API_BASE}/api/reports/lecturer/export`;
    if (role === 'giang_vien' && user?.lecturer_id) url += `?lecturer_id=${user.lecturer_id}`;
    else if (reportLecturer) url += `?lecturer_id=${reportLecturer}`;
    downloadBlob(url, "bao_cao_giang_vien.xlsx");
  };

  const exportSubjectReport = () => {
    if (!reportSubject) { showToast("Vui lòng chọn môn học.", "danger"); return; }
    downloadBlob(`${API_BASE}/api/reports/subject/export?subject_id=${reportSubject}`, `bao_cao_mon_${reportSubject}.xlsx`);
  };

  const exportMyReport = () => {
    downloadBlob(`${API_BASE}/api/reports/student/export`, "bao_cao_ca_nhan.xlsx");
  };

  const exportFacultyReport = () => {
    let url = `${API_BASE}/api/admin/reports/faculty/export?`;
    if (facultyCohort) url += `cohort=${facultyCohort}&`;
    if (facultyClass) url += `administrative_class=${encodeURIComponent(facultyClass)}&`;
    if (facultyDept) url += `department=${encodeURIComponent(facultyDept)}&`;
    downloadBlob(url, "bao_cao_khoa.xlsx");
  };

  const fetchMyReport = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/api/reports/student`);
      if (res.ok) {
        const data = await res.json();
        setMyReport(data);
      } else {
        showToast("Lỗi tải báo cáo của bạn.", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const fetchFacultyReport = async () => {
    try {
      let url = `${API_BASE}/api/admin/reports/faculty?`;
      if (facultyCohort) url += `cohort=${facultyCohort}&`;
      if (facultyClass) url += `administrative_class=${encodeURIComponent(facultyClass)}&`;
      if (facultyDept) url += `department=${encodeURIComponent(facultyDept)}&`;
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setFacultyReport(data);
      } else {
        showToast("Lỗi tải báo cáo.", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const fetchAdminSummary = async () => {
    setFetching(true);
    try {
      const res = await apiFetch(`${API_BASE}/api/admin/reports/summary`);
      if (res.ok) {
        const data = await res.json();
        setAdminSummary(data);
      } else {
        showToast("Lỗi tải báo cáo tổng hợp.", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
   finally { setFetching(false); }
};

  const exportAttendanceReport = async () => {
    if (!reportClass) {
      showToast("Vui lòng chọn lớp tín chỉ.", "danger");
      return;
    }
    try {
      let exportUrl = `${API_BASE}/api/reports/attendance/export?ma_lop_tc=${reportClass}`;
      if (reportFromDate) exportUrl += `&from_date=${reportFromDate}`;
      if (reportToDate) exportUrl += `&to_date=${reportToDate}`;
      const res = await apiFetch(exportUrl);
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
      const res = await apiFetch(`${API_BASE}/api/student/leave_request`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        showToast("Nộp đơn xin nghỉ phép thành công! Đang chờ Giảng viên duyệt.");
        setLeaveSessionId('');
        setLeaveReason('');
        fetchMyLeaveRequests();
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
      const res = await apiFetch(`${API_BASE}/api/register`, {
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
      const blob = await (await window.fetch(dataUrl)).blob();
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
      const res = await apiFetch(url, {
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
      const res = await apiFetch(`${API_BASE}/api/register`, {
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
      const res = await apiFetch(`${API_BASE}/api/lich_hoc_chi_tiet`, {
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
    if (!subCode || !subName) {
      showToast("Vui lòng nhập mã và tên môn học.", "danger");
      return;
    }

    try {
      const res = await apiFetch(`${API_BASE}/api/subjects/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_id: subCode,
          subject_name: subName,
          credits: subCredits ? Number(subCredits) : null,
          semester: subSemester ? Number(subSemester) : null,
          prerequisites: subPrereq || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Đã thêm môn học mới.");
        setSubCode('');
        setSubName('');
        setSubSemester('');
        setSubPrereq('');
        setSubCredits('3');
        fetchSubjectsList();
      } else {
        showToast(data.detail || "Lưu môn học thất bại.", "danger");
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
    if (ccSemester) formData.append("hoc_ky", ccSemester);
    if (ccYear) formData.append("nam_hoc", ccYear);
    if (ccCapacity) formData.append("si_so_toi_da", ccCapacity);
    if (ccCohort) formData.append("khoa", ccCohort);

    try {
      const res = await apiFetch(`${API_BASE}/api/lop_tin_chi`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Đã lưu lớp tín chỉ.");
        setCcCode('');
        setCcSub('');
        setCcLecturer('');
        setCcSemester('');
        setCcYear('');
        setCcCapacity('50');
        setCcCohort('');
        fetchCreditClasses();
      } else {
        showToast(data.detail || "Lưu lớp tín chỉ thất bại.", "danger");
      }
    } catch (err) {
      showToast("Lỗi kết nối.", "danger");
    }
  };

  const renderClassManagementTab = () => {
    const filteredCreditClasses = creditClasses.filter(c => {
      return (c.class_id || '').toLowerCase().includes(debouncedClassSearch.toLowerCase()) ||
        (c.subject_name || '').toLowerCase().includes(debouncedClassSearch.toLowerCase());
    });

    return (
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "20px", alignItems: "start" }}>

        {/* Báo cáo tổng hợp toàn hệ thống */}
        <div style={{ gridColumn: "1 / -1", background: "#ffffff", border: "1px solid #d0e0eb", borderRadius: "10px", padding: "15px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <FileText size={16} color="#106fa6" />
            <strong style={{ color: "#106fa6" }}>Báo cáo tổng hợp toàn hệ thống</strong>
            <button onClick={fetchAdminSummary} style={{ ...styles.btn, marginLeft: "auto", padding: "5px 12px", fontSize: "0.8rem" }}>Xem báo cáo</button>
          </div>
          {adminSummary && (
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "10px" }}>
              {[
                ["Lớp tín chỉ", adminSummary.tong_lop],
                ["Sinh viên", adminSummary.tong_sv],
                ["Tổng buổi học", adminSummary.tong_buoi_hoc],
                ["SV cấm thi", adminSummary.so_sv_cam_thi],
              ].map(([label, value]) => (
                <div key={label} style={{ background: "#f8fbfd", border: "1px solid #d0e0eb", borderRadius: "8px", padding: "10px 16px", minWidth: "130px" }}>
                  <div style={{ fontSize: "1.3rem", fontWeight: "700", color: "#106fa6" }}>{value ?? 0}</div>
                  <div style={{ fontSize: "0.75rem", color: "#54738c" }}>{label}</div>
                </div>
              ))}
            </div>
          )}
          {adminSummary && adminSummary.at_risk && adminSummary.at_risk.length > 0 && (
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "#ef4444", margin: "6px 0" }}>⚠ Danh sách SV cấm thi:</div>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>MSSV</th>
                    <th style={styles.th}>Họ Tên</th>
                    <th style={styles.th}>Lớp</th>
                    <th style={styles.th}>Lớp TC</th>
                    <th style={styles.th}>Tỷ lệ vắng</th>
                    <th style={styles.th}>Điểm CC</th>
                  </tr>
                </thead>
                <tbody>
                  {adminSummary.at_risk.map((s, i) => (
                    <tr key={i}>
                      <td style={styles.td}>{s.mssv}</td>
                      <td style={styles.td}>{s.ho_ten}</td>
                      <td style={styles.td}>{s.lop_base}</td>
                      <td style={styles.td}>{s.ma_lop_tc}</td>
                      <td style={{ ...styles.td, color: "#ef4444", fontWeight: "600" }}>{s.ty_le_vang}%</td>
                      <td style={styles.td}>{s.score}</td>
                    </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           )}

          {/* Báo cáo cấp khóa / lớp hành chính / khoa */}
          <div style={{ background: "#ffffff", border: "1px solid #d0e0eb", borderRadius: "10px", padding: "15px", marginTop: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <FileText size={16} color="#7c3aed" />
              <strong style={{ color: "#7c3aed" }}>Báo cáo theo Khóa / Lớp hành chính / Khoa</strong>
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end", marginBottom: "12px" }}>
              <div>
                <label style={styles.label}>Khóa</label>
                <input type="text" placeholder="VD: D22" value={facultyCohort} onChange={(e) => setFacultyCohort(e.target.value)} style={{ ...styles.input, width: "100px" }} />
              </div>
              <div>
                <label style={styles.label}>Lớp hành chính</label>
                <input type="text" placeholder="VD: D22CQCNPM01" value={facultyClass} onChange={(e) => setFacultyClass(e.target.value)} style={{ ...styles.input, width: "160px" }} />
              </div>
              <div>
                <label style={styles.label}>Khoa</label>
                <input type="text" placeholder="VD: CNTT" value={facultyDept} onChange={(e) => setFacultyDept(e.target.value)} style={{ ...styles.input, width: "140px" }} />
              </div>
              <button onClick={fetchFacultyReport} style={{ ...styles.btn, padding: "8px 16px", fontSize: "0.85rem", backgroundColor: "#7c3aed" }}>Xem báo cáo</button>
              <button onClick={exportFacultyReport} style={{ ...styles.btn, padding: "8px 16px", fontSize: "0.85rem", backgroundColor: "#10b981" }}>Xuất Excel</button>
            </div>

            {facultyReport && (
              <>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "10px", alignItems: "center" }}>
                  <div style={{ background: "#f8fbfd", border: "1px solid #d0e0eb", borderRadius: "8px", padding: "8px 14px" }}>
                    <div style={{ fontSize: "1.2rem", fontWeight: "700", color: "#106fa6" }}>{facultyReport.tong_sv}</div>
                    <div style={{ fontSize: "0.75rem", color: "#54738c" }}>Sinh viên</div>
                  </div>
                  <div style={{ background: "#fdf0f0", border: "1px solid #fca5a5", borderRadius: "8px", padding: "8px 14px" }}>
                    <div style={{ fontSize: "1.2rem", fontWeight: "700", color: "#ef4444" }}>{facultyReport.so_sv_cam_thi}</div>
                    <div style={{ fontSize: "0.75rem", color: "#54738c" }}>Cấm thi</div>
                  </div>
                  <input type="text" placeholder="🔍 Tìm MSSV / Họ tên..." value={reportSearch} onChange={(e) => { setReportSearch(e.target.value); setReportPage(1); }} style={{ ...styles.input, marginLeft: "auto", maxWidth: "240px" }} />
                </div>
                {(() => {
                  const q = reportSearch.toLowerCase();
                  const filtered = facultyReport.students.filter(s => !q || (s.mssv + ' ' + s.ho_ten).toLowerCase().includes(q));
                  const pageSize = 15;
                  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
                  const page = Math.min(reportPage, pages);
                  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
                  return filtered.length > 0 ? (
                    <>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>MSSV</th>
                            <th style={styles.th}>Họ Tên</th>
                            <th style={styles.th}>Lớp HC</th>
                            <th style={styles.th}>Khóa</th>
                            <th style={styles.th}>Số lớp</th>
                            <th style={styles.th}>Tổng buổi</th>
                            <th style={styles.th}>Vắng</th>
                            <th style={styles.th}>Tỷ lệ vắng</th>
                            <th style={styles.th}>Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((s, i) => (
                            <tr key={i} style={{ backgroundColor: s.cam_thi ? "#fff2f2" : "transparent" }}>
                              <td style={styles.td}>{s.mssv}</td>
                              <td style={styles.td}>{s.ho_ten}</td>
                              <td style={styles.td}>{s.lop_base}</td>
                              <td style={styles.td}>{s.cohort}</td>
                              <td style={styles.td}>{s.so_lop}</td>
                              <td style={styles.td}>{s.tong_buoi}</td>
                              <td style={styles.td}>{s.tong_vang}</td>
                              <td style={styles.td}>{s.ty_le_vang}%</td>
                              <td style={{ ...styles.td, fontWeight: "600", color: s.cam_thi ? "#ef4444" : "#10b981" }}>
                                {s.cam_thi ? "Cấm thi" : "Hợp lệ"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {pages > 1 && (
                        <div style={{ display: "flex", gap: "10px", alignItems: "center", justifyContent: "flex-end", marginTop: "8px" }}>
                          <button onClick={() => setReportPage(Math.max(1, reportPage - 1))} disabled={reportPage <= 1} style={{ ...styles.btn, padding: "3px 10px", fontSize: "0.75rem", backgroundColor: reportPage <= 1 ? "#cbd5e1" : "#1d92d1" }}>‹ Trước</button>
                          <span style={{ fontSize: "0.8rem", color: "#54738c" }}>{page} / {pages}</span>
                          <button onClick={() => setReportPage(Math.min(pages, reportPage + 1))} disabled={reportPage >= pages} style={{ ...styles.btn, padding: "3px 10px", fontSize: "0.75rem", backgroundColor: reportPage >= pages ? "#cbd5e1" : "#1d92d1" }}>Sau ›</button>
                        </div>
                      )}
                    </>
                  ) : (
                    <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Không có sinh viên phù hợp.</span>
                  );
                })()}
              </>
            )}
          </div>
        </div>

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
                    {role === 'admin' && (
                      <div style={{ display: "flex", gap: "4px", marginTop: "8px" }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => { setEditingClassId(c.class_id); setEditClassLecturer(c.lecturer_id || ""); setEditClassCapacity(c.max_students ?? ""); setEditClassSemester(c.semester ?? ""); setEditClassCohort(c.cohort || ""); setEditClassStatus(c.status || "Active"); }}
                          style={{ ...styles.btn, padding: "2px 8px", fontSize: "0.7rem", backgroundColor: "#f59e0b" }}
                        >Sửa</button>
                        <button onClick={() => handleDeleteClass(c.class_id)} style={{ ...styles.btn, padding: "2px 8px", fontSize: "0.7rem", backgroundColor: "#ef4444" }}>Xóa</button>
                      </div>
                    )}
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
              {editingClassId && (
                <form onSubmit={(e) => handleUpdateClass(e, editingClassId)} style={{ background: "#fffbeb", border: "1px solid #f59e0b", borderRadius: "10px", padding: "15px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <strong style={{ color: "#b45309", fontSize: "0.85rem" }}>Sửa lớp {editingClassId}</strong>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={styles.label}>Giảng viên phụ trách</label>
                      <select value={editClassLecturer} onChange={(e) => setEditClassLecturer(e.target.value)} style={styles.input}>
                        <option value="">-- Chưa phân công --</option>
                        {lecturersList.map((l) => <option key={l.lecturer_id} value={l.lecturer_id}>{l.lecturer_id} - {l.full_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={styles.label}>Sĩ số tối đa</label>
                      <input type="number" min="1" value={editClassCapacity} onChange={(e) => setEditClassCapacity(e.target.value)} style={styles.input} />
                    </div>
                    <div>
                      <label style={styles.label}>Học kỳ</label>
                      <input type="number" min="1" max="16" value={editClassSemester} onChange={(e) => setEditClassSemester(e.target.value)} style={styles.input} />
                    </div>
                    <div>
                      <label style={styles.label}>Khóa (cohort)</label>
                      <input type="text" value={editClassCohort} onChange={(e) => setEditClassCohort(e.target.value)} style={styles.input} />
                    </div>
                    <div>
                      <label style={styles.label}>Trạng thái</label>
                      <select value={editClassStatus} onChange={(e) => setEditClassStatus(e.target.value)} style={styles.input}>
                        <option value="Active">Active</option>
                        <option value="Planning">Planning</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                    <button type="submit" style={{ ...styles.btn, padding: "6px 14px", fontSize: "0.8rem", backgroundColor: "#10b981" }}>Lưu thay đổi</button>
                    <button type="button" onClick={() => setEditingClassId(null)} style={{ ...styles.btn, padding: "6px 14px", fontSize: "0.8rem", backgroundColor: "#6b7280" }}>Hủy</button>
                  </div>
                </form>
              )}
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

      const matchSearch = mssv.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        ho_ten.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchClass = filterClass ? lop_base.toLowerCase().includes(filterClass.toLowerCase()) : true;
      return matchSearch && matchClass;
    });

    // Phân trang client-side
    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
    const currentPage = Math.min(studentPage, totalPages);
    const pageStudents = filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
                {pageStudents.map((st) => {
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
                          backgroundColor: st.trang_thai_ho_so === 'Approved' || st.academic_status === 'Đang học' ? "#e6f8f0" : "#fff7e6",
                          color: st.trang_thai_ho_so === 'Approved' || st.academic_status === 'Đang học' ? "#10b981" : "#d48806"
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
            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button onClick={() => setStudentPage(currentPage - 1)} disabled={currentPage <= 1} style={{ ...styles.btn, padding: "4px 12px", fontSize: "0.8rem", backgroundColor: currentPage <= 1 ? "#cbd5e1" : "#1d92d1" }}>‹ Trước</button>
                <span style={{ fontSize: "0.8rem", color: "#54738c" }}>{currentPage} / {totalPages} (tổng {filteredStudents.length})</span>
                <button onClick={() => setStudentPage(currentPage + 1)} disabled={currentPage >= totalPages} style={{ ...styles.btn, padding: "4px 12px", fontSize: "0.8rem", backgroundColor: currentPage >= totalPages ? "#cbd5e1" : "#1d92d1" }}>Sau ›</button>
              </div>
            )}
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

  return {
    pendingFaces, setPendingFaces, regMssv, setRegMssv, regName, setRegName, regLop, setRegLop, regPhoto, setRegPhoto, regPhotoName, setRegPhotoName, regUseWebcam, setRegUseWebcam, regWebcamStream, setRegWebcamStream, regPreviewSrc, setRegPreviewSrc, schClass, setSchClass, schDate, setSchDate, schRoom, setSchRoom, schTime, setSchTime, subCode, setSubCode, subName, setSubName, subCredits, setSubCredits, ccCode, setCcCode, ccSub, setCcSub, leaveRequests, setLeaveRequests, manualMssv, setManualMssv, manualSessionId, setManualSessionId, manualStatus, setManualStatus, reportClass, setReportClass, attendanceReport, setAttendanceReport, studentsList, setStudentsList, searchKeyword, setSearchKeyword, filterClass, setFilterClass, manualClass, setManualClass, manualClassStudents, setManualClassStudents, manualLoading, setManualLoading, leaveSessionId, setLeaveSessionId, leaveReason, setLeaveReason, leaveProof, setLeaveProof, recognizeImageSrc, setRecognizeImageSrc, recognizeFile, setRecognizeFile, cameraRoom, setCameraRoom, detectionLogs, setDetectionLogs, useWebcam, setUseWebcam, webcamStream, setWebcamStream, activeChallenge, setActiveChallenge, challengePassed, setChallengePassed, challengePrompt, setChallengePrompt, currentFace, setCurrentFace, creditClasses, setCreditClasses, selectedClass, setSelectedClass, enrolledStudents, setEnrolledStudents, enrollMssv, setEnrollMssv, bulkClassCode, setBulkClassCode, studentClasses, setStudentClasses, adminCameras, setAdminCameras, simulatedLogs, setSimulatedLogs, schedules, setSchedules, availableClasses, setAvailableClasses, editingScheduleId, setEditingScheduleId, lecturersList, setLecturersList, ccLecturer, setCcLecturer, regModeTab, setRegModeTab, classSearch, setClassSearch, editDate, setEditDate, editRoom, setEditRoom, editTime, setEditTime, editingStudentId, setEditingStudentId, editStudentName, setEditStudentName, editStudentClass, setEditStudentClass, scheduleViewMode, setScheduleViewMode, registrationInfo, setRegistrationInfo, totalCredits, setTotalCredits, subSemester, setSubSemester, subPrereq, setSubPrereq, ccSemester, setCcSemester, ccYear, setCcYear, ccCapacity, setCcCapacity, ccCohort, setCcCohort, demoControls, setDemoControls, demoSaving, setDemoSaving, selectedWeekStart, setSelectedWeekStart, fileInputRef, imageRef, canvasRef, videoRef, regVideoRef, API_BASE, role, username, activeTab, startWebcam, stopWebcam, startRegWebcam, stopRegWebcam, captureRegPhoto, fetchRegistrationInfo, fetchDemoControls, handleDemoToggle, DEMO_TOGGLES, fetchAvailableClasses, handleRegisterCourse, handleUnregisterCourse, fetchSchedules, handleDeleteSchedule, handleUpdateSchedule, handleDeleteStudent, handleUpdateStudent, fetchLecturersList, fetchCreditClasses, fetchEnrolledStudents, handleEnrollStudent, handleUnenrollStudent, handleBulkEnroll, fetchStudentClasses, toggleCameraSimulation, fetchStudentsList, fetchManualClassStudents, handleQuickCheckin, fetchPendingFaces, fetchLeaveRequests, handleApproveFace, handleApproveLeave, handleRejectLeave, handleManualCheckinSubmit, fetchAttendanceReport, exportAttendanceReport, handleLeaveRequestSubmit, handleRefreshBiometrics, processImage, handleFileDrop, triggerRecognition, drawBoundingBoxes, resetRecognition, handleRegister, handleCreateSchedule, handleCreateSubject, handleCreateCreditClass,     renderStudentsListTab, renderClassManagementTab, formatDate, getDaysOfWeek, reportFromDate, setReportFromDate, reportToDate, setReportToDate, lecturerReport, setLecturerReport, subjectReport, setSubjectReport, fetchLecturerReport, fetchSubjectReport, exportLecturerReport, exportSubjectReport, exportMyReport, exportFacultyReport, reportSubject, setReportSubject, reportLecturer, setReportLecturer, reportSearch, setReportSearch, reportPage, setReportPage, myReport, setMyReport, fetchMyReport, facultyReport, setFacultyReport, facultyCohort, setFacultyCohort, facultyClass, setFacultyClass, facultyDept, setFacultyDept, fetchFacultyReport, adminSummary, setAdminSummary, fetchAdminSummary, fetching, setFetching, studentPage, setStudentPage, newLecturerId, setNewLecturerId, newLecturerName, setNewLecturerName, newLecturerEmail, setNewLecturerEmail, newLecturerDept, setNewLecturerDept, editingLecturerId, setEditingLecturerId, editLecturerName, setEditLecturerName, editLecturerEmail, setEditLecturerEmail, editLecturerDept, setEditLecturerDept, subjectsList, setSubjectsList, editingSubjectId, setEditingSubjectId, editSubjectName, setEditSubjectName, editSubjectCredits, setEditSubjectCredits, editSubjectSemester, setEditSubjectSemester, editSubjectPrereq, setEditSubjectPrereq, editingClassId, setEditingClassId, editClassLecturer, setEditClassLecturer, editClassCapacity, setEditClassCapacity, editClassSemester, setEditClassSemester, editClassCohort, setEditClassCohort, editClassStatus, setEditClassStatus, myLeaveRequests, setMyLeaveRequests, classSchedules, setClassSchedules, fetchSubjectsList, fetchMyLeaveRequests, fetchClassSchedules, handleCreateLecturer, handleUpdateLecturer, handleDeleteLecturer, handleUpdateSubject, handleDeleteSubject, handleUpdateClass, handleDeleteClass, styles,
  };
};
