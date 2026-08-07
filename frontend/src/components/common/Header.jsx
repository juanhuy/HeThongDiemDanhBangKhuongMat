import React from 'react';
import { Bell, LogOut, Menu } from 'lucide-react';

const Header = ({ studentProfile, onLogout, onToggleSidebar }) => {
  const styles = {
    header: {
      backgroundColor: "#1d92d1",
      height: "56px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "0 1.25rem",
      color: "#ffffff",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      position: "sticky",
      top: 0,
      zIndex: 100
    },
    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: "12px"
    },
    headerLogoIcon: {
      width: "28px",
      height: "28px",
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      borderRadius: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: "bold",
      fontSize: "1.1rem"
    },
    headerRight: {
      display: "flex",
      alignItems: "center",
      gap: "20px"
    },
    studentProfileSummary: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      cursor: "pointer"
    },
    studentNameHeader: {
      display: "flex",
      flexDirection: "column",
      textAlign: "right",
      fontSize: "0.85rem"
    },
    btnLogout: {
      background: "none",
      border: "none",
      color: "#ffffff",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      fontSize: "0.85rem",
      opacity: 0.9,
      padding: "4px 8px",
      borderRadius: "4px",
      transition: "background-color 0.2s"
    }
  };

  return (
    <header style={styles.header}>
      <div style={styles.headerLeft}>
        <button 
          onClick={onToggleSidebar} 
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '4px' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <Menu size={22} />
        </button>
        <div style={{...styles.headerLogoIcon, marginLeft: '8px'}}>🎓</div>
        <span style={{ fontWeight: 700, fontSize: "1rem" }}>CỔNG THÔNG TIN SINH VIÊN - PTIT</span>
      </div>
      <div style={styles.headerRight}>
        <div style={{ position: "relative", cursor: "pointer" }}>
          <Bell size={20} />
          <span style={{ position: "absolute", top: "-5px", right: "-5px", width: "14px", height: "14px", backgroundColor: "#ef4444", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: "bold" }}>
            1
          </span>
        </div>
        <div style={styles.studentProfileSummary}>
          <div style={styles.studentNameHeader}>
            <span style={{ fontWeight: 600 }}>{studentProfile.ho_ten}</span>
            <span style={{ fontSize: "0.75rem", opacity: 0.9 }}>{studentProfile.mssv}</span>
          </div>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <span style={{ color: "#1d92d1", fontWeight: "bold", fontSize: "1rem" }}>
              {studentProfile.ho_ten ? studentProfile.ho_ten.charAt(0) : 'H'}
            </span>
          </div>
        </div>
        
        <button 
          onClick={onLogout} 
          style={styles.btnLogout}
          title="Đăng xuất"
          onMouseEnter={(e) => e.target.style.backgroundColor = "rgba(255, 255, 255, 0.15)"}
          onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
        >
          <LogOut size={16} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
