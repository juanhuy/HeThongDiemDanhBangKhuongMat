import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';
import Toast from './components/common/Toast';
import Login from './components/common/Login';
import AttendanceLogs from './components/common/AttendanceLogs';

import {
  CourseRegistration,
  MyClasses,
  CourseInfoCard,
  SubmitLeave,
  FaceBiometrics,
  StudentTimetable,
} from './components/student';

import {
  TeachingSchedule,
  ManualCheckin,
  SummaryReport,
  LeaveRequests,
  LecturerInfoCard,
  LecturerTimetable,
} from './components/lecturer';

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
} from './components/admin';

// import CreditClassesManagement from './components/admin/CreditClassesManagement/index.jsx';

import { API_BASE } from './api/client';
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
  const [activeMenu, setActiveMenu] = useState('home');
  const [studentProfile, setStudentProfile] = useState(null);
  const [lecturerProfile, setLecturerProfile] = useState(null);

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

  const fetchStudentProfile = async (mssv) => {
    if (!mssv) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/students/${mssv}`);
      if (res.ok) {
        const data = await res.json();
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
      }
    } catch (e) {
      console.error('Lỗi khi tải thông tin sinh viên:', e);
    }
  };

  const fetchLecturerProfile = async (lecturer_id) => {
    if (!lecturer_id) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/lecturers/${lecturer_id}`);
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
      setLogs((prevLogs) => {
        if (user && isStudent && studentMssv) {
          const prevStudentLogs = prevLogs.filter((log) => log.mssv === studentMssv);
          const newStudentLogs = newLogs.filter((log) => log.mssv === studentMssv);
          if (newStudentLogs.length > 0) {
            const latestNew = newStudentLogs[0];
            const latestPrev = prevStudentLogs[0];
            if (!latestPrev || latestNew.id !== latestPrev.id) {
              showToast(
                `🔔 Bạn vừa được điểm danh [${latestNew.trang_thai}] tại Buổi ${latestNew.ma_buoi_hoc}!`
              );
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
    const interval = setInterval(fetchLogs, 5000);
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
    showToast('Đã đăng xuất khỏi hệ thống.');
  };

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
            {isLecturer && <LecturerInfoCard lecturerProfile={lecturerProfileToRender} />}
            <AttendanceLogs
              logs={
                isStudent && studentMssv
                  ? logs.filter((l) => l.mssv === studentMssv)
                  : logs
              }
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

      // —— Lecturer ——
      case 'teaching_schedule':
        return <TeachingSchedule user={user} showToast={showToast} />;
      case 'manual_checkin':
        return <ManualCheckin user={user} showToast={showToast} />;
      case 'summary_report':
        return <SummaryReport user={user} showToast={showToast} />;
      case 'leave_requests':
        return <LeaveRequests API_BASE={API_BASE} showToast={showToast} />;
      case 'lecturer_timetable':
        return <LecturerTimetable user={user} showToast={showToast} />;

      // —— Admin ——
      case 'faculties_management':
        return <FacultiesManagement API_BASE={API_BASE} showToast={showToast} />;
      case 'majors_management':
        return <MajorsManagement API_BASE={API_BASE} showToast={showToast} />;
      case 'class_management':
        return <CreditClassesManagement showToast={showToast} />;
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

      default:
        return (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            Trang đang được cập nhật
          </div>
        );
    }
  };

  return (
    <div style={styles.appWrapper}>
      <Header studentProfile={profileToRender} onLogout={handleLogout} />
      <div style={styles.mainLayout}>
        <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} user={user} />
        <main style={styles.contentArea}>
          <div style={styles.welcomeHeader}>
            <h2 style={styles.welcomeText}>
              👋 Chào mừng{' '}
              {isStudent
                ? profileToRender.ho_ten
                : isLecturer
                  ? 'Giảng viên'
                  : 'Quản trị viên'}
            </h2>
            <div style={styles.dateText}>
              <Calendar size={14} /> {getVietnameseDate()}
            </div>
          </div>
          {renderContent()}
        </main>
      </div>
      <Toast toast={toast} />
    </div>
  );
}

export default App;