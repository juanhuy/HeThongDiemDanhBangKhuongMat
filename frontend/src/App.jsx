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

  const getVietnameseDate = () => {
    const days = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const d = new Date();
    return `${days[d.getDay()]}, ngày ${d.getDate()} tháng ${d.getMonth() + 1}`;
  };

  useEffect(() => {
    // Check if session exists in localStorage
    const savedUser = localStorage.getItem("ptit_user");
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      fetchStudentProfile(parsed.mssv);
    }
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

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
      const res = await fetch(`${API_BASE}/api/students/${mssv}`);
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
        setLogs(data.logs);
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
          setActiveTab={setActiveTab} 
        />

         <main style={styles.contentArea}>
          <div style={styles.welcomeHeader}>
            <h2 style={styles.welcomeText}>
              👋 Chào mừng {user.role === 'sinh_vien' ? profileToRender.ho_ten : (user.username === 'gv1' ? 'Giảng viên 1' : 'Quản trị viên')}
            </h2>
            <div style={styles.dateText}>
              <Calendar size={14} /> {getVietnameseDate()}
            </div>
          </div>

          {user.role === 'sinh_vien' && (
            <>
              <StudentInfoCard studentProfile={profileToRender} />
              <CourseInfoCard studentProfile={profileToRender} />
            </>
          )}
          
          <AIAttendance 
            API_BASE={API_BASE} 
            showToast={showToast} 
            onAttendanceLogged={fetchLogs} 
            user={user}
          />

          <AttendanceLogs 
            logs={user.role === 'sinh_vien' && user.mssv ? logs.filter(log => log.mssv === user.mssv) : logs} 
          />
        </main>
      </div>

      <Toast toast={toast} />
    </div>
  );
}

export default App;
