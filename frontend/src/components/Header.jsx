import React from 'react';
import { Bell, LogOut } from 'lucide-react';

const Header = ({ studentProfile, onLogout, notifications = [], onMarkAllAsRead }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

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
    },
    notificationDropdown: {
      position: "absolute",
      top: "35px",
      right: "0",
      width: "320px",
      backgroundColor: "#ffffff",
      color: "#1e293b",
      borderRadius: "8px",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      border: "1px solid #e2e8f0",
      zIndex: 1000,
      maxHeight: "360px",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      animation: "slideDown 0.2s ease-out"
    },
    notificationHeader: {
      padding: "10px 14px",
      borderBottom: "1px solid #edf2f7",
      fontWeight: "bold",
      fontSize: "0.85rem",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: "#f8fafc",
      color: "#0f172a"
    },
    notificationItem: {
      padding: "12px 14px",
      borderBottom: "1px solid #edf2f7",
      fontSize: "0.8rem",
      lineHeight: "1.4",
      cursor: "pointer",
      transition: "background-color 0.2s",
      textAlign: "left"
    },
    notificationItemUnread: {
      backgroundColor: "#f0f9ff",
      fontWeight: "500"
    },
    notificationTime: {
      fontSize: "0.7rem",
      color: "#94a3b8",
      marginTop: "4px"
    },
    emptyState: {
      padding: "30px 15px",
      textAlign: "center",
      color: "#94a3b8",
      fontSize: "0.8rem"
    }
  };

  return (
    <header style={styles.header}>
      <div style={styles.headerLeft}>
        <div style={styles.headerLogoIcon}>🎓</div>
        <span style={{ fontWeight: 700, fontSize: "1rem" }}>CỔNG THÔNG TIN SINH VIÊN - PTIT</span>
      </div>
      <div style={styles.headerRight}>
        <div style={{ position: "relative" }}>
          <div 
            onClick={() => setIsOpen(!isOpen)}
            style={{ cursor: "pointer", position: "relative", padding: "4px" }}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span style={{ 
                position: "absolute", 
                top: "0px", 
                right: "0px", 
                width: "15px", 
                height: "15px", 
                backgroundColor: "#ef4444", 
                borderRadius: "50%", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                fontSize: "0.6rem", 
                fontWeight: "bold",
                color: "#ffffff"
              }}>
                {unreadCount}
              </span>
            )}
          </div>

          {isOpen && (
            <div style={styles.notificationDropdown}>
              <div style={styles.notificationHeader}>
                <span>Thông báo</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={() => {
                      if (onMarkAllAsRead) onMarkAllAsRead();
                    }}
                    style={{ 
                      background: "none", 
                      border: "none", 
                      color: "#1d92d1", 
                      fontSize: "0.75rem", 
                      cursor: "pointer",
                      fontWeight: "600"
                    }}
                  >
                    Đánh dấu đã đọc
                  </button>
                )}
              </div>
              <div>
                {notifications.length === 0 ? (
                  <div style={styles.emptyState}>
                    Chưa có thông báo nào.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id}
                      style={{
                        ...styles.notificationItem,
                        ...(n.read ? {} : styles.notificationItemUnread)
                      }}
                    >
                      <div>{n.message}</div>
                      <div style={styles.notificationTime}>🕒 {n.timestamp}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
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
