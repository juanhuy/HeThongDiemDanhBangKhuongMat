import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import StudentInfoCard from './components/StudentInfoCard';
import CourseInfoCard from './components/CourseInfoCard';
import AIAttendance from './components/AIAttendance';
import AttendanceLogs from './components/AttendanceLogs';
import Toast from './components/Toast';
import Login from './components/Login';
import { apiFetch, getStoredUser, getToken, clearSession, setOnUnauthorized } from './api/client';

const API_BASE = "http://127.0.0.1:8000";

const styles = {
  appWrapper: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    backgroundColor: "#f4f8fa"
  },
  mainLayout: {
    display: "grid",
    gridTemplateColumns: "250px 1fr",
    flexGrow: 1
  },
  contentArea: {
    padding: "1.5rem 2rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem"
  },
  welcomeHeader: {
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },
  welcomeText: {
    fontSize: "1.4rem",
    fontWeight: "700",
    color: "#106fa6",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  dateText: {
    fontSize: "0.85rem",
    color: "var(--text-muted)",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  }
};

function App() {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('attendance');
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false });
  const [activeMenu, setActiveMenu] = useState('home');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 900);

  const [studentProfile, setStudentProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const userRole = user?.role ? user.role.toLowerCase() : '';
  const isStudent = userRole === 'sinh_vien' || userRole === 'student';
  const isLecturer = userRole === 'giang_vien' || userRole === 'lecturer';
  const isAdmin = userRole === 'admin';

  if (user && isStudent && (!user.mssv || user.mssv === 'N/A')) {
    user.mssv = user.username.toUpperCase();
  }

  const getVietnameseDate = () => {
    const days = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const d = new Date();
    return `${days[d.getDay()]}, ngày ${d.getDate()} tháng ${d.getMonth() + 1}`;
  };

  // Check if session exists in localStorage (only if user state is not set yet)
  useEffect(() => {
    if (!user) {
      const savedUser = getStoredUser();
      if (savedUser && getToken()) {
        setUser(savedUser);
        fetchStudentProfile(savedUser);
      }
    }
    if (user) {
      fetchLogs();
      fetchNotifications();
    }
    const interval = setInterval(() => {
      if (user) { fetchLogs(); fetchNotifications(); }
    }, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    showToast("Đăng nhập thành công!");
    fetchStudentProfile(userData);
  };

  const handleLogout = () => {
    setUser(null);
    setStudentProfile(null);
    clearSession();
    showToast("Đã đăng xuất khỏi hệ thống.");
  };

  useEffect(() => {
    setOnUnauthorized(handleLogout);
    return () => setOnUnauthorized(null);
  }, [handleLogout]);

  const handleMarkAllAsRead = () => {
    apiFetch(`${API_BASE}/api/auth/notifications/read-all`, { method: "POST" }).catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const fetchNotifications = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/api/auth/notifications`);
      if (res.ok) {
        const data = await res.json();
        setNotifications((data.notifications || []).map(n => ({
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
    // Endpoint /api/admin/students chỉ dành cho Admin; sinh viên/giảng viên
    // dùng profile fallback hiển thị từ dữ liệu đăng nhập.
    const role = (userData?.role || '').toLowerCase();
    if (role !== 'admin') return;
    try {
      const res = await apiFetch(`${API_BASE}/api/admin/students/${mssv}`);
      if (res.ok) {
        const data = await res.json();
        const mapped = {
          mssv: data.student_id,
          ho_ten: data.full_name,
          lop_base: data.administrative_class || 'N/A',
          email: data.email,
          sdt: data.phone_number || 'N/A',
          ngay_sinh: 'N/A',
          gioi_tinh: 'N/A',
          noi_sinh: 'N/A',
          dia_chi: 'N/A'
        };
        setStudentProfile(mapped);
      }
    } catch (e) {
      console.error("Lỗi khi tải thông tin sinh viên:", e);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/api/attendance`);
      if (res.ok) {
        const data = await res.json();
        const newLogs = data.logs || [];
        
        setLogs(prevLogs => {
          // If logged in user is a student, compare incoming logs to trigger checkin alert
          if (user && isStudent && user.mssv) {
            const prevStudentLogs = prevLogs.filter(log => log.mssv === user.mssv);
            const newStudentLogs = newLogs.filter(log => log.mssv === user.mssv);
            
            if (newStudentLogs.length > 0) {
              const latestNew = newStudentLogs[0];
              const latestPrev = prevStudentLogs[0];
              if (!latestPrev || latestNew.id !== latestPrev.id) {
                const newNotif = {
                  id: latestNew.id || Date.now(),
                  message: `Bạn vừa được điểm danh tự động [${latestNew.trang_thai}] tại Buổi học số ${latestNew.ma_buoi_hoc}!`,
                  timestamp: new Date().toLocaleTimeString(),
                  read: false
                };
                setNotifications(prev => [newNotif, ...prev]);
                showToast(`🔔 Hệ thống: Bạn vừa được điểm danh tự động [${latestNew.trang_thai}] tại Buổi học số ${latestNew.ma_buoi_hoc}!`);
              }
            }
          }
          return newLogs;
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // If not logged in, render the login page
  if (!user) {
    return (
      <>
        <Login API_BASE={API_BASE} onLoginSuccess={handleLoginSuccess} />
        <Toast toast={toast} />
      </>
    );
  }

  // Define fallback profile if database loading is in progress or not found
  const profileToRender = studentProfile || {
    mssv: user.mssv || 'N/A',
    ho_ten: user.ho_ten || user.username,
    lop_base: user.lop_base || 'N/A'
  };

  return (
    <div style={styles.appWrapper}>
      <Header 
        studentProfile={profileToRender} 
        onLogout={handleLogout} 
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllAsRead}
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
          {isMobile && (
            <div style={{ marginBottom: "1rem" }}>
              <Sidebar 
                activeMenu={activeMenu} 
                setActiveMenu={setActiveMenu} 
                user={user}
              />
            </div>
          )}
          <div style={styles.welcomeHeader}>
            <h2 style={styles.welcomeText}>
              👋 Chào mừng {isStudent ? profileToRender.ho_ten : (isLecturer ? 'Giảng viên' : 'Quản trị viên')} {isStudent && `(${activeMenu === 'home' ? 'Trang chủ' : activeMenu === 'my_classes' ? 'Lớp học của tôi' : activeMenu === 'course_registration' ? 'Đăng ký học phần' : activeMenu === 'submit_leave' ? 'Xin nghỉ phép' : 'Sinh trắc học'})`}
            </h2>
            <div style={styles.dateText}>
              <Calendar size={14} /> {getVietnameseDate()}
            </div>
          </div>

          {activeMenu === 'home' ? (
            <>
              {isStudent && (
                <>
                  <StudentInfoCard studentProfile={profileToRender} />
                  <CourseInfoCard studentProfile={profileToRender} />
                </>
              )}
              <AttendanceLogs 
                logs={isStudent && user.mssv ? logs.filter(log => log.mssv === user.mssv) : logs} 
              />
            </>
          ) : (
            <AIAttendance 
              key={activeMenu}
              API_BASE={API_BASE} 
              showToast={showToast} 
              onAttendanceLogged={fetchLogs} 
              user={user}
              activeMenu={activeMenu}
              onUnauthorized={handleLogout}
            />
          )}
        </main>
      </div>

      <Toast toast={toast} />
    </div>
  );
}

export default App;
