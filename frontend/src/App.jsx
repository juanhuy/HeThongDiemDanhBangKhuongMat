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

  const [studentProfile, setStudentProfile] = useState(null);

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

  useEffect(() => {
    // Check if session exists in localStorage (only if user state is not set yet)
    if (!user) {
      const savedUser = localStorage.getItem("ptit_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        fetchStudentProfile(parsed.mssv);
      }
    }
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
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
    localStorage.setItem("ptit_user", JSON.stringify(userData));
    showToast("Đăng nhập thành công!");
    fetchStudentProfile(userData.mssv);
  };

  const handleLogout = () => {
    setUser(null);
    setStudentProfile(null);
    localStorage.removeItem("ptit_user");
    showToast("Đã đăng xuất khỏi hệ thống.");
  };

  const fetchStudentProfile = async (mssv) => {
    if (!mssv) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/students/${mssv}`);
      if (res.ok) {
        const data = await res.json();
        setStudentProfile(data);
      }
    } catch (e) {
      console.error("Lỗi khi tải thông tin sinh viên:", e);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/attendance`);
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
      <Header studentProfile={profileToRender} onLogout={handleLogout} />
      
      <div style={styles.mainLayout}>
        <Sidebar 
          activeMenu={activeMenu} 
          setActiveMenu={setActiveMenu} 
          user={user}
        />

         <main style={styles.contentArea}>
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
            />
          )}
        </main>
      </div>

      <Toast toast={toast} />
    </div>
  );
}

export default App;
