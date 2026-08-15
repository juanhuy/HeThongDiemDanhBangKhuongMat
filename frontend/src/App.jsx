import React, { useState, useEffect } from 'react';
import { Calendar, X } from 'lucide-react';

import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';
import Toast from './components/common/Toast';
import Login from './components/common/Login';
import AttendanceLogs from './components/common/AttendanceLogs';
import ChatWidget from './components/common/ChatWidget';

import {
  CourseRegistration,
  MyClasses,
  CourseInfoCard,
  SubmitLeave,
  FaceBiometrics,
  StudentTimetable,
  StudentInfoCard,
  MyReport
} from './components/student';

import {
  ManualCheckin,
  SummaryReport,
  LeaveRequests,
  LecturerInfoCard,
  LecturerTimetable,
} from './components/lecturer';
import LecturerClassesManagement from './components/lecturer/LecturerClassesManagement';
import LivePresencePanel from './components/lecturer/LivePresencePanel';
import AdminAnalytics from './components/admin/AdminAnalytics';
import AdminReports from './components/admin/AdminReports';
import {
  CreditClassesManagement,
  LecturersManagement,
  RoomsManagement,
  FacultiesManagement,
  MajorsManagement,
  SubjectsManagement,
  StudentsManagement,
  CameraDashboard,
  PendingFaces,
  ScheduleAdmin,
  AdminHomeDashboard,
  DemoControlsPanel,
} from './components/admin';
import DocumentSystem from './components/documents/DocumentSystem';
import { API_BASE, apiFetch, getStoredUser, getToken, clearSession, setOnUnauthorized, authFetch } from './api/client';
import { attendanceApi } from './api';

const styles = {
  appWrapper: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#f4f8fa',
  },
  mainLayout: {
    display: 'grid',
    gridTemplateColumns: '250px 1fr',
    flexGrow: 1,
  },
  contentArea: {
    padding: '1.5rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  welcomeHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  welcomeText: {
    fontSize: '1.4rem',
    fontWeight: '700',
    color: '#106fa6',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dateText: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
};

function App() {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false });
  const [activeMenu, setActiveMenu] = useState(() => localStorage.getItem('ptit_active_menu') || 'home');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 900);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [studentProfile, setStudentProfile] = useState(null);
  const [lecturerProfile, setLecturerProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [checkoutEnabled, setCheckoutEnabled] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const userRole = user?.role ? user.role.toLowerCase() : '';
  const isStudent = userRole === 'sinh_vien' || userRole === 'student';
  const isLecturer = userRole === 'giang_vien' || userRole === 'lecturer';

  // Chuẩn hóa mssv cho SV (không mutate user gốc)
  const studentMssv =
    isStudent && user
      ? user.mssv && user.mssv !== 'N/A'
        ? user.mssv
        : (user.username || '').toUpperCase()
      : user?.mssv;

  const getVietnameseDate = () => {
    const days = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const d = new Date();
    return `${days[d.getDay()]}, ngày ${d.getDate()} tháng ${d.getMonth() + 1}`;
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 4000);
  };

  const handleMarkAllAsRead = () => {
    apiFetch(`${API_BASE}/api/auth/notifications/read-all`, { method: "POST" }).catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const fetchNotifications = async () => {
    try {
      const data = await apiFetch(`${API_BASE}/api/auth/notifications`);
      if (data && Array.isArray(data.notifications)) {
        setNotifications(data.notifications.map(n => ({
          id: n.id,
          message: n.message ? `${n.title} - ${n.message}` : n.title,
          timestamp: n.timestamp ? new Date(n.timestamp).toLocaleTimeString() : "",
          read: n.is_read,
        })));
      }
    } catch (e) { /* bỏ qua lỗi poll */ }
  };

  const fetchStudentProfile = async (userData) => {
    const mssv = userData?.mssv;
    if (!mssv) return;
    try {
      // Backend cho SV xem hồ sơ CHÍNH MÌNH; GV/Admin xem được mọi SV.
      const data = await apiFetch(`/api/admin/students/${mssv}`);
      setStudentProfile({
        mssv: data.student_id,
        ho_ten: data.full_name,
        lop_base: data.administrative_class || 'N/A',
        email: data.email || 'N/A',
        sdt: data.phone_number || 'N/A',
        ngay_sinh: data.date_of_birth || 'N/A',
        gioi_tinh: data.gender || 'N/A',
        cmnd: data.citizen_id || 'N/A',
        dan_toc: data.ethnicity || 'N/A',
        ton_giao: data.religion || 'N/A',
        quoc_tich: data.nationality || 'N/A',
        noi_sinh: data.place_of_birth || 'N/A',
        dia_chi: data.address || 'N/A',
        major: data.major || 'N/A',
        specialization: data.specialization || 'N/A',
        department: data.department || 'N/A',
        cohort: data.cohort || 'N/A',
        training_program: data.training_program || 'N/A',
        academic_status: data.academic_status || 'Đang học',
      });
    } catch (e) {
      console.error('Lỗi khi tải thông tin sinh viên:', e);
    }
  };

  const fetchLecturerProfile = async (lecturer_id) => {
    if (!lecturer_id) return;
    try {
      const res = await authFetch(`${API_BASE}/api/admin/lecturers/${lecturer_id}`);
      if (res.ok) {
        const data = await res.json();
        setLecturerProfile(data);
      }
    } catch (e) {
      console.error('Lỗi khi tải thông tin giảng viên:', e);
    }
  };

  const fetchLogs = async () => {
    try {
      const data = await attendanceApi.getRecentLogs();
      const newLogs = data.logs || [];
      if (typeof data.checkout_enabled === 'boolean') setCheckoutEnabled(data.checkout_enabled);
      setLogs((prevLogs) => {
        if (user && isStudent && studentMssv) {
          const prevStudentLogs = prevLogs.filter((log) => log.mssv === studentMssv);
          const newStudentLogs = newLogs.filter((log) => log.mssv === studentMssv);
          if (newStudentLogs.length > 0) {
            const latestNew = newStudentLogs[0];
            const latestPrev = prevStudentLogs[0];
            if (!latestPrev || latestNew.id !== latestPrev.id) {
              showToast(`🔔 Bạn vừa được điểm danh [${latestNew.trang_thai}] tại Buổi ${latestNew.ma_buoi_hoc}!`);
            }
          }
        }
        return newLogs;
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Session + logs — chỉ 1 useEffect
  useEffect(() => {
    if (!user) {
      const savedUser = localStorage.getItem('ptit_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setUser(parsed);
          const role = (parsed.role || '').toLowerCase();
          if (role === 'sinh_vien' || role === 'student') {
            fetchStudentProfile(parsed.mssv || parsed.username);
          } else if (role === 'giang_vien' || role === 'lecturer') {
            fetchLecturerProfile(parsed.lecturer_id);
          }
        } catch {
          localStorage.removeItem('ptit_user');
        }
      }
    }

    fetchLogs();
    fetchNotifications();
    const interval = setInterval(() => { fetchLogs(); fetchNotifications(); }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('ptit_user', JSON.stringify(userData));
    showToast('Đăng nhập thành công!');
    const role = (userData.role || '').toLowerCase();
    if (role === 'sinh_vien' || role === 'student') {
      fetchStudentProfile(userData.mssv || userData.username);
    } else if (role === 'giang_vien' || role === 'lecturer') {
      fetchLecturerProfile(userData.lecturer_id);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setStudentProfile(null);
    setLecturerProfile(null);
    setActiveMenu('home');
    localStorage.removeItem('ptit_user');
    localStorage.removeItem('ptit_active_menu');
    showToast('Đã đăng xuất khỏi hệ thống.');
  };

  // Đăng ký callback tự động logout khi API trả 401 (phải đặt sau handleLogout)
  useEffect(() => {
    setOnUnauthorized(handleLogout);
    return () => setOnUnauthorized(null);
  }, [handleLogout]);

  useEffect(() => {
    localStorage.setItem('ptit_active_menu', activeMenu);
  }, [activeMenu]);

  // Chưa đăng nhập
  if (!user) {
    return (
      <>
        <Login API_BASE={API_BASE} onLoginSuccess={handleLoginSuccess} />
        <Toast toast={toast} />
      </>
    );
  }

  const profileToRender = studentProfile || {
    mssv: studentMssv || 'N/A',
    ho_ten: user.ho_ten || user.username,
    lop_base: user.lop_base || 'N/A',
  };

  const lecturerProfileToRender = lecturerProfile || {
    lecturer_id: user.lecturer_id || 'N/A',
    full_name: user.ho_ten || user.username,
  };

  // User object truyền xuống component SV (có mssv chuẩn)
  const userForStudent = isStudent
    ? { ...user, mssv: studentMssv }
    : user;

  const renderContent = () => {
    switch (activeMenu) {
      case 'home':
        return (
          <>
            {isStudent && <CourseInfoCard studentProfile={profileToRender} />}
            {isLecturer && (
              <>
                <LivePresencePanel lecturerId={user?.lecturer_id || user?.username} />
                <LecturerInfoCard lecturerProfile={lecturerProfileToRender} />
              </>
            )}
            {!isStudent && !isLecturer && (
              <>
                <AdminHomeDashboard />
                <AdminAnalytics />
              </>
            )}
            <AttendanceLogs
              logs={
                isStudent && studentMssv
                  ? logs.filter((l) => l.mssv === studentMssv)
                  : logs
              }
              checkoutEnabled={checkoutEnabled}
            />
          </>
        );

      // —— Student ——
      case 'course_registration':
        return <CourseRegistration user={userForStudent} showToast={showToast} />;
      case 'my_classes':
        return <MyClasses user={userForStudent} showToast={showToast} />;
      case 'submit_leave':
        return <SubmitLeave user={userForStudent} showToast={showToast} />;
      case 'refresh_biometrics':
        return <FaceBiometrics user={userForStudent} showToast={showToast} />;
      case 'timetable':
        return <StudentTimetable user={userForStudent} showToast={showToast} />;
      case 'my_report':
        return <MyReport user={userForStudent} showToast={showToast} />;

      // —— Lecturer ——
      case 'lecturer_class_management':
        return <LecturerClassesManagement user={user} showToast={showToast} />;
      case 'manual_checkin':
        return <ManualCheckin user={user} showToast={showToast} />;
      case 'summary_report':
        return <SummaryReport user={user} showToast={showToast} />;
      case 'leave_requests':
        return <LeaveRequests API_BASE={API_BASE} showToast={showToast} />;
      case 'lecturer_timetable':
        return <LecturerTimetable user={user} showToast={showToast} />;

      // —— Admin ——
      case 'admin_class_management':
        return <CreditClassesManagement showToast={showToast} />;
      case 'faculties_management':
        return <FacultiesManagement API_BASE={API_BASE} showToast={showToast} />;
      case 'majors_management':
        return <MajorsManagement API_BASE={API_BASE} showToast={showToast} />;

      case 'lecturers_management':
        return <LecturersManagement API_BASE={API_BASE} showToast={showToast} />;
      case 'rooms_management':
        return <RoomsManagement API_BASE={API_BASE} showToast={showToast} />;
      case 'subjects_management':
        return <SubjectsManagement showToast={showToast} />;
      case 'students_list':
        return <StudentsManagement showToast={showToast} />;
      case 'camera_dashboard':
      case 'attendance':
        return <CameraDashboard showToast={showToast} onAttendanceLogged={fetchLogs} />;
      case 'pending_faces':
        return <PendingFaces showToast={showToast} />;
      case 'schedule':
        return <ScheduleAdmin showToast={showToast} />;
      case 'demo':
        return <DemoControlsPanel showToast={showToast} />;
      case 'admin_reports':
        return <AdminReports showToast={showToast} />;

      // —— Document System (SV + GV + Admin chia sẻ tài liệu) ——
      case 'documents':
        return <DocumentSystem user={user} showToast={showToast} />;

      default:
        return (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            Trang đang được cập nhật
          </div>
        );
    }
  };
  const handleMenuSelect = (menu) => {
    setActiveMenu(menu);
    setMobileMenuOpen(false);
  };

  return (
    <div style={styles.appWrapper}>
      <Header 
        studentProfile={profileToRender} 
        onLogout={handleLogout} 
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllAsRead}
        isMobile={isMobile}
        onToggleMenu={() => setMobileMenuOpen(true)}
      />
      
      <div style={isMobile ? { ...styles.mainLayout, gridTemplateColumns: "1fr" } : styles.mainLayout}>
        {!isMobile && (
          <Sidebar 
            activeMenu={activeMenu} 
            setActiveMenu={setActiveMenu} 
            user={user}
          />
        )}

        <main style={{ ...styles.contentArea, padding: isMobile ? "1rem" : "1.5rem 2rem" }}>
          {renderContent()}
        </main>
      </div>

      {isMobile && mobileMenuOpen && (
        <>
          <div
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)",
              zIndex: 999, animation: "fadeIn 0.2s ease-out"
            }}
          />
          <div style={{
            position: "fixed", top: 0, left: 0, bottom: 0, width: "280px",
            backgroundColor: "#ffffff", zIndex: 1000, overflowY: "auto",
            boxShadow: "4px 0 16px rgba(0,0,0,0.15)",
            animation: "slideInLeft 0.25s ease-out"
          }}>
            <div style={{
              display: "flex", justifyContent: "flex-end", padding: "8px",
              borderBottom: "1px solid #eef3f7"
            }}>
              <button
                onClick={() => setMobileMenuOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", color: "#64748b" }}
                aria-label="Đóng menu"
              >
                <X size={22} />
              </button>
            </div>
            <Sidebar 
              activeMenu={activeMenu} 
              setActiveMenu={handleMenuSelect} 
              user={user}
            />
          </div>
        </>
      )}

      <Toast toast={toast} />
      <ChatWidget />
    </div>
  );
}

export default App;