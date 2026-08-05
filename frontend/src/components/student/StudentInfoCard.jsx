import React from 'react';
import { Info } from 'lucide-react';

const StudentInfoCard = ({ studentProfile }) => {
  const styles = {
    card: {
      backgroundColor: "#ffffff",
      border: "1px solid #d0e0eb",
      borderRadius: "10px",
      overflow: "hidden",
      boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
    },
    cardHeader: {
      backgroundColor: "#ffffff",
      padding: "12px 20px",
      borderBottom: "1px solid #e2edf5",
      color: "#106fa6",
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
      display: "grid",
      gridTemplateColumns: "100px 1fr",
      gap: "1.5rem",
      alignItems: "start"
    },
    avatarCol: {
      display: "flex",
      flexDirection: "column",
      gap: "10px"
    },
    dataColumn: {
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      fontSize: "0.85rem"
    },
    dataRow: {
      display: "flex",
      gap: "6px"
    },
    dataLabel: {
      color: "var(--text-muted)",
      minWidth: "120px",
      flexShrink: 0
    },
    dataValue: {
      fontWeight: "600",
      color: "var(--text-main)"
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <Info size={16} /> Thông tin sinh viên
      </div>
      <div style={styles.cardBody}>
        <div style={styles.infoGrid}>
          <div style={styles.avatarCol}>
            <div style={{ width: "100px", height: "120px", backgroundColor: "#e2edf5", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "2rem", color: "#1d92d1" }}>👤</span>
            </div>
          </div>
          <div style={styles.dataColumn}>
            <div style={styles.dataRow}>
              <span style={styles.dataLabel}>Mã SV:</span>
              <span style={styles.dataValue}>{studentProfile.mssv}</span>
            </div>
            <div style={styles.dataRow}>
              <span style={styles.dataLabel}>Tên sinh viên:</span>
              <span style={styles.dataValue}>{studentProfile.ho_ten}</span>
            </div>
            <div style={styles.dataRow}>
              <span style={styles.dataLabel}>Lớp chuyên ngành:</span>
              <span style={styles.dataValue}>{studentProfile.lop_base || "N/A"}</span>
            </div>
            <div style={styles.dataRow}>
              <span style={styles.dataLabel}>Trạng thái:</span>
              <span style={{ ...styles.dataValue, color: "#22c55e" }}>Đang học</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentInfoCard;
