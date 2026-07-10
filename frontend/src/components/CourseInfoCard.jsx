import React from 'react';
import { GraduationCap } from 'lucide-react';

const CourseInfoCard = ({ studentProfile }) => {
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
    courseInfoGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "1.5rem"
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
        <GraduationCap size={16} /> Thông tin khóa học
      </div>
      <div style={styles.cardBody}>
        <div style={styles.courseInfoGrid}>
          <div style={styles.dataColumn}>
            <div style={styles.dataRow}>
              <span style={styles.dataLabel}>Lớp:</span>
              <span style={styles.dataValue}>{studentProfile.lop_base || "N/A"}</span>
            </div>
            <div style={styles.dataRow}>
              <span style={styles.dataLabel}>Ngành:</span>
              <span style={styles.dataValue}>Công nghệ thông tin</span>
            </div>
            <div style={styles.dataRow}>
              <span style={styles.dataLabel}>Chuyên ngành:</span>
              <span style={styles.dataValue}>Công nghệ phần mềm</span>
            </div>
          </div>
          <div style={styles.dataColumn}>
            <div style={styles.dataRow}>
              <span style={styles.dataLabel}>Khoa:</span>
              <span style={styles.dataValue}>Công nghệ Thông Tin 2</span>
            </div>
            <div style={styles.dataRow}>
              <span style={styles.dataLabel}>Bậc đào tạo:</span>
              <span style={styles.dataValue}>Đại học Chính Quy</span>
            </div>
            <div style={styles.dataRow}>
              <span style={styles.dataLabel}>Niên khóa:</span>
              <span style={styles.dataValue}>2022-2027</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseInfoCard;
