import React from 'react';
import { 
  Home, User, BookOpen, Calendar, Clock, 
  Clipboard, FileText, Camera, ShieldAlert
} from 'lucide-react';

const Sidebar = ({ activeMenu, setActiveMenu, user }) => {
  const rawRole = user?.role || 'sinh_vien';
  const role = rawRole.toLowerCase();
  const isAdmin = role === 'admin';
  const isLecturer = role === 'giang_vien' || role === 'lecturer';

  const styles = {
    sidebar: {
      backgroundColor: "#ffffff",
      borderRight: "1px solid #d0e0eb",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      paddingTop: "10px"
    },
    sidebarMenu: {
      display: "flex",
      flexDirection: "column",
      gap: "4px"
    },
    sidebarFooter: {
      padding: "1.25rem 1rem",
      borderTop: "1px solid #eef3f7",
      textAlign: "center",
      fontSize: "0.75rem",
      color: "var(--text-muted)"
    },
    ptitLogoText: {
      color: "#ef4444",
      fontWeight: "bold",
      lineHeight: "1.2",
      marginBottom: "4px"
    }
  };

  const renderMenuItems = () => {
    if (isAdmin) {
      return (
        <>
          <div className={`ptit-sidebar-item ${activeMenu === 'home' ? 'active' : ''}`} onClick={() => setActiveMenu('home')}>
            <Home size={16} /> Trang chủ
          </div>
          <div className={`ptit-sidebar-item ${activeMenu === 'camera_dashboard' ? 'active' : ''}`} onClick={() => setActiveMenu('camera_dashboard')}>
            <Camera size={16} /> Điểm danh Camera
          </div>
          <div className={`ptit-sidebar-item ${activeMenu === 'pending_faces' ? 'active' : ''}`} onClick={() => setActiveMenu('pending_faces')}>
            <ShieldAlert size={16} /> Duyệt Face ID
          </div>
          <div className={`ptit-sidebar-item ${activeMenu === 'students_list' ? 'active' : ''}`} onClick={() => setActiveMenu('students_list')}>
            <User size={16} /> Quản lý Sinh viên
          </div>
          <div className={`ptit-sidebar-item ${activeMenu === 'attendance' ? 'active' : ''}`} onClick={() => setActiveMenu('attendance')}>
            <User size={16} /> Đăng ký SV mới
          </div>
          <div className={`ptit-sidebar-item ${activeMenu === 'schedule' ? 'active' : ''}`} onClick={() => setActiveMenu('schedule')}>
            <Calendar size={16} /> Thêm Lịch học
          </div>
          <div className={`ptit-sidebar-item ${activeMenu === 'structure' ? 'active' : ''}`} onClick={() => setActiveMenu('structure')}>
            <BookOpen size={16} /> Cấu trúc Lớp
          </div>
          <div className={`ptit-sidebar-item ${activeMenu === 'class_management' ? 'active' : ''}`} onClick={() => setActiveMenu('class_management')}>
            <BookOpen size={16} /> Quản lý Đăng ký Lớp
          </div>
        </>
      );
    }

    if (isLecturer) {
      return (
        <>
          <div className={`ptit-sidebar-item ${activeMenu === 'home' ? 'active' : ''}`} onClick={() => setActiveMenu('home')}>
            <Home size={16} /> Trang chủ
          </div>
          <div className={`ptit-sidebar-item ${activeMenu === 'class_management' ? 'active' : ''}`} onClick={() => setActiveMenu('class_management')}>
            <BookOpen size={16} /> Quản lý Lớp học
          </div>
          <div className={`ptit-sidebar-item ${activeMenu === 'teaching_schedule' ? 'active' : ''}`} onClick={() => setActiveMenu('teaching_schedule')}>
            <Calendar size={16} /> Xem Lịch dạy
          </div>
          <div className={`ptit-sidebar-item ${activeMenu === 'manual_checkin' ? 'active' : ''}`} onClick={() => setActiveMenu('manual_checkin')}>
            <Clock size={16} /> Điểm danh nhanh
          </div>
          <div className={`ptit-sidebar-item ${activeMenu === 'leave_requests' ? 'active' : ''}`} onClick={() => setActiveMenu('leave_requests')}>
            <Clipboard size={16} /> Duyệt nghỉ phép
          </div>
          <div className={`ptit-sidebar-item ${activeMenu === 'summary_report' ? 'active' : ''}`} onClick={() => setActiveMenu('summary_report')}>
            <FileText size={16} /> Tổng kết & Cấm thi
          </div>
        </>
      );
    }

    // Default student menu
    return (
      <>
        <div className={`ptit-sidebar-item ${activeMenu === 'home' ? 'active' : ''}`} onClick={() => setActiveMenu('home')}>
          <Home size={16} /> Trang chủ
        </div>
        <div className={`ptit-sidebar-item ${activeMenu === 'my_classes' ? 'active' : ''}`} onClick={() => setActiveMenu('my_classes')}>
          <BookOpen size={16} /> Lớp học của tôi
        </div>
        <div className={`ptit-sidebar-item ${activeMenu === 'course_registration' ? 'active' : ''}`} onClick={() => setActiveMenu('course_registration')}>
          <BookOpen size={16} /> Đăng ký học phần
        </div>
        <div className={`ptit-sidebar-item ${activeMenu === 'submit_leave' ? 'active' : ''}`} onClick={() => setActiveMenu('submit_leave')}>
          <Clipboard size={16} /> Xin nghỉ phép
        </div>
        <div className={`ptit-sidebar-item ${activeMenu === 'refresh_biometrics' ? 'active' : ''}`} onClick={() => setActiveMenu('refresh_biometrics')}>
          <User size={16} /> Sinh trắc học Face ID
        </div>
      </>
    );
  };

  return (
    <aside style={styles.sidebar}>
      <div style={styles.sidebarMenu}>
        {renderMenuItems()}
      </div>

      <div style={styles.sidebarFooter}>
        <div style={styles.ptitLogoText}>HỌC VIỆN CÔNG NGHỆ BƯU CHÍNH VIỄN THÔNG</div>
        <div style={{ fontSize: "0.7rem", color: "#64748b" }}>CƠ SỞ TẠI TP. HỒ CHÍ MINH</div>
        <div style={{ marginTop: "8px", fontSize: "0.65rem", opacity: 0.7 }}>BCVT-V 2026.05Q.09</div>
      </div>
    </aside>
  );
};

export default Sidebar;
