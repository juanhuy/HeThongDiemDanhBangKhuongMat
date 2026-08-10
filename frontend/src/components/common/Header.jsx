import React from 'react';
import { Bell, LogOut, KeyRound } from 'lucide-react';
import { apiFetch } from '../../api/client';

const Header = ({ studentProfile, onLogout, notifications = [], onMarkAllAsRead }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [showPwd, setShowPwd] = React.useState(false);
  const [curPwd, setCurPwd] = React.useState('');
  const [newPwd, setNewPwd] = React.useState('');
  const [newPwd2, setNewPwd2] = React.useState('');
  const [pwdMsg, setPwdMsg] = React.useState('');
  const [pwdErr, setPwdErr] = React.useState(false);
  const [savingPwd, setSavingPwd] = React.useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const API_BASE = "http://127.0.0.1:8000";

  const submitPassword = async (e) => {
    e.preventDefault();
    setPwdMsg(''); setPwdErr(false);
    if (newPwd !== newPwd2) { setPwdErr(true); setPwdMsg("Mật khẩu xác nhận không khớp."); return; }
    if (newPwd.length < 6) { setPwdErr(true); setPwdMsg("Mật khẩu mới phải có ít nhất 6 ký tự."); return; }
    setSavingPwd(true);
    try {
      const fd = new FormData();
      fd.append("current_password", curPwd);
      fd.append("new_password", newPwd);
      const res = await apiFetch(`${API_BASE}/api/auth/change-password`, { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        setPwdMsg("Đổi mật khẩu thành công!"); setPwdErr(false);
        setCurPwd(''); setNewPwd(''); setNewPwd2('');
        setTimeout(() => setShowPwd(false), 1200);
      } else {
        setPwdErr(true); setPwdMsg(data.detail || "Đổi mật khẩu thất bại.");
      }
    } catch {
      setPwdErr(true); setPwdMsg("Lỗi kết nối máy chủ.");
    } finally {
      setSavingPwd(false);
    }
  };

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
      whiteSpace: "nowrap"
    },
    pwdInput: {
      width: "100%",
      boxSizing: "border-box",
      padding: "8px 12px",
      marginBottom: "10px",
      border: "1px solid #d0e0eb",
      borderRadius: "6px",
      fontSize: "0.9rem"
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
          onClick={() => setShowPwd(true)} 
          style={styles.btnLogout}
          title="Đổi mật khẩu"
        >
          <KeyRound size={16} />
          <span>Đổi mật khẩu</span>
        </button>

        <button 
          onClick={() => { if (window.confirm("Bạn có chắc muốn đăng xuất khỏi hệ thống?")) onLogout(); }} 
          style={styles.btnLogout}
          title="Đăng xuất"
          onMouseEnter={(e) => e.target.style.backgroundColor = "rgba(255, 255, 255, 0.15)"}
          onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
        >
          <LogOut size={16} />
          <span>Đăng xuất</span>
        </button>
      </div>

      {showPwd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001 }} onClick={() => setShowPwd(false)}>
          <form onSubmit={submitPassword} onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: "10px", padding: "20px", width: "360px", maxWidth: "90vw" }}>
            <h4 style={{ margin: "0 0 14px", color: "#106fa6" }}>Đổi mật khẩu</h4>
            <input type="password" placeholder="Mật khẩu hiện tại" value={curPwd} onChange={(e) => setCurPwd(e.target.value)} required style={styles.pwdInput} />
            <input type="password" placeholder="Mật khẩu mới (≥6 ký tự)" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required style={styles.pwdInput} />
            <input type="password" placeholder="Xác nhận mật khẩu mới" value={newPwd2} onChange={(e) => setNewPwd2(e.target.value)} required style={styles.pwdInput} />
            {pwdMsg && (
              <div style={{ fontSize: "0.8rem", color: pwdErr ? "#ef4444" : "#10b981", marginBottom: "10px" }}>{pwdMsg}</div>
            )}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setShowPwd(false)} style={{ ...styles.btnLogout, color: "#54738c", border: "1px solid #d0e0eb", background: "#fff", padding: "8px 14px", borderRadius: "6px", cursor: "pointer" }}>Hủy</button>
              <button type="submit" disabled={savingPwd} style={{ ...styles.btnLogout, background: "#1d92d1", color: "#fff", padding: "8px 14px", borderRadius: "6px", cursor: "pointer" }}>{savingPwd ? "Đang lưu..." : "Lưu"}</button>
            </div>
          </form>
        </div>
      )}
    </header>
  );
};

export default Header;
