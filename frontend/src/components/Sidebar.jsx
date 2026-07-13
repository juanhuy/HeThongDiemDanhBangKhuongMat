import React from 'react';
import { Home, CheckCircle } from 'lucide-react';

const Sidebar = ({ activeMenu, setActiveMenu, setActiveTab }) => {
  const styles = {
    sidebar: {
      backgroundColor: "#ffffff",
      borderRight: "1px solid #d0e0eb",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between"
    },
    sidebarMenu: {
      display: "flex",
      flexDirection: "column"
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

  return (
    <aside style={styles.sidebar}>
      <div style={styles.sidebarMenu}>
        <div 
          className={`ptit-sidebar-item ${activeMenu === 'home' ? 'active' : ''}`}
          onClick={() => { setActiveMenu('home'); setActiveTab('attendance'); }}
        >
          <Home size={16} /> Trang chủ
        </div>
        <div 
          className={`ptit-sidebar-item ${activeMenu === 'attendance' ? 'active' : ''}`}
          onClick={() => { setActiveMenu('attendance'); setActiveTab('attendance'); }}
        >
          <CheckCircle size={16} /> Điểm danh khuôn mặt AI
        </div>
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
