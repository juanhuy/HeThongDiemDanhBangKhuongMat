import React, { useState } from 'react';
import { Lock, User, AlertCircle } from 'lucide-react';

const Login = ({ API_BASE, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData();
    formData.append("username", username);
    formData.append("password", password);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        onLoginSuccess(data.user);
      } else {
        setError(data.detail || "Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản và mật khẩu.");
      }
    } catch (err) {
      setError("Lỗi kết nối máy chủ backend.");
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      backgroundColor: "#f4f8fa",
      fontFamily: "'Inter', sans-serif"
    },
    loginCard: {
      backgroundColor: "#ffffff",
      width: "400px",
      borderRadius: "12px",
      overflow: "hidden",
      boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
      border: "1px solid #d0e0eb"
    },
    cardHeader: {
      backgroundColor: "#1d92d1",
      padding: "24px",
      textAlign: "center",
      color: "#ffffff"
    },
    logoText: {
      fontSize: "1.25rem",
      fontWeight: "bold",
      margin: "0 0 6px 0",
      letterSpacing: "0.5px"
    },
    logoSubtext: {
      fontSize: "0.8rem",
      opacity: 0.9,
      margin: 0
    },
    cardBody: {
      padding: "32px 24px"
    },
    formGroup: {
      marginBottom: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "6px"
    },
    label: {
      fontSize: "0.8rem",
      fontWeight: "600",
      color: "#64748b"
    },
    inputWrapper: {
      position: "relative",
      display: "flex",
      alignItems: "center"
    },
    inputIcon: {
      position: "absolute",
      left: "12px",
      color: "#94a3b8"
    },
    input: {
      width: "100%",
      padding: "10px 12px 10px 38px",
      border: "1px solid #cbd5e1",
      borderRadius: "6px",
      fontSize: "0.9rem",
      color: "#334155",
      outline: "none",
      transition: "border-color 0.2s"
    },
    btnSubmit: {
      width: "100%",
      backgroundColor: "#1d92d1",
      color: "#ffffff",
      border: "none",
      borderRadius: "6px",
      padding: "12px",
      fontSize: "0.95rem",
      fontWeight: "600",
      cursor: "pointer",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      marginTop: "10px",
      transition: "background-color 0.2s"
    },
    errorAlert: {
      backgroundColor: "#fef2f2",
      border: "1px solid #fca5a5",
      borderRadius: "6px",
      padding: "10px 12px",
      color: "#b91c1c",
      fontSize: "0.8rem",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginBottom: "20px"
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginCard}>
        <div style={styles.cardHeader}>
          <h3 style={styles.logoText}>CỔNG THÔNG TIN SINH VIÊN</h3>
          <p style={styles.logoSubtext}>HỌC VIỆN CÔNG NGHỆ BƯU CHÍNH VIỄN THÔNG</p>
        </div>
        <div style={styles.cardBody}>
          {error && (
            <div style={styles.errorAlert}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Tên đăng nhập</label>
              <div style={styles.inputWrapper}>
                <User size={16} style={styles.inputIcon} />
                <input 
                  type="text" 
                  placeholder="Mã sinh viên hoặc tên đăng nhập"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required 
                  style={styles.input} 
                />
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Mật khẩu</label>
              <div style={styles.inputWrapper}>
                <Lock size={16} style={styles.inputIcon} />
                <input 
                  type="password" 
                  placeholder="Mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  style={styles.input} 
                />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={loading}
              style={styles.btnSubmit}
            >
              {loading ? "Đang xác thực..." : "Đăng nhập"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
