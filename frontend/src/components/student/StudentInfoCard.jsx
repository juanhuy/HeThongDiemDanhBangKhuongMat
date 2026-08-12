import React from 'react';
import { Info, User } from 'lucide-react';

const StudentInfoCard = ({ studentProfile }) => {
  const styles = {
    card: {
      backgroundColor: "#ffffff",
      border: "1px solid #d0e0eb",
      borderRadius: "12px",
      overflow: "hidden",
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
    },
    cardHeader: {
      background: "linear-gradient(135deg, #1d92d1, #0f6fa8)",
      padding: "12px 20px",
      color: "#ffffff",
      fontWeight: "600",
      fontSize: "0.95rem",
      display: "flex",
      alignItems: "center",
      gap: "8px"
    },
    cardBody: {
      padding: "20px"
    },
    infoGrid: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "16px"
    },
    avatar: {
      width: "88px",
      height: "88px",
      borderRadius: "50%",
      background: "linear-gradient(135deg, #e2edf5, #cfe3f2)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: "3px solid #1d92d1"
    },
    nameLine: {
      fontSize: "1.1rem",
      fontWeight: "700",
      color: "#0b517a",
      textAlign: "center"
    },
    mssvLine: {
      fontSize: "0.85rem",
      color: "#64748b",
      textAlign: "center"
    },
    divider: {
      height: "1px",
      backgroundColor: "#e2edf5",
      margin: "14px 0"
    },
    infoList: {
      width: "100%",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      minWidth: 0
    },
    infoRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontSize: "0.88rem",
      gap: "12px"
    },
    infoLabel: {
      color: "#64748b",
      flexShrink: 0
    },
    infoValue: {
      fontWeight: "600",
      color: "#2b3a4a",
      textAlign: "right",
      wordBreak: "break-word",
      overflowWrap: "anywhere"
    },
    statusPill: {
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: "12px",
      fontSize: "0.75rem",
      fontWeight: "700",
      backgroundColor: "#d1fae5",
      color: "#15803d"
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <Info size={16} /> Thông tin sinh viên
      </div>
      <div style={styles.cardBody}>
        <div style={styles.infoGrid}>
          <div style={styles.avatar}>
            <User size={40} color="#1d92d1" />
          </div>
          <div>
            <div style={styles.nameLine}>{studentProfile.ho_ten || "—"}</div>
            <div style={styles.mssvLine}>MSSV: {studentProfile.mssv || "—"}</div>
          </div>

          <div style={styles.divider} />

          <div style={styles.infoList}>
            <div className="ptit-info-row">
              <span className="ptit-info-label">Lớp chuyên ngành</span>
              <span className="ptit-info-value">{studentProfile.lop_base || "N/A"}</span>
            </div>
            <div className="ptit-info-row">
              <span className="ptit-info-label">Ngày sinh</span>
              <span className="ptit-info-value">{studentProfile.ngay_sinh || "N/A"}</span>
            </div>
            <div className="ptit-info-row">
              <span className="ptit-info-label">Giới tính</span>
              <span className="ptit-info-value">{studentProfile.gioi_tinh || "N/A"}</span>
            </div>
            <div className="ptit-info-row">
              <span className="ptit-info-label">Email</span>
              <span className="ptit-info-value">{studentProfile.email || "N/A"}</span>
            </div>
            <div className="ptit-info-row">
              <span className="ptit-info-label">Trạng thái</span>
              <span className="ptit-info-value">{studentProfile.academic_status || "Đang học"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentInfoCard;
