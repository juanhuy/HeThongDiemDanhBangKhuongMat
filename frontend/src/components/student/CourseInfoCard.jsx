import React from 'react';
import { User } from 'lucide-react';

const CourseInfoCard = ({ studentProfile }) => {
  if (!studentProfile) return null;

  const styles = {
    container: {
      display: "flex",
      flexDirection: "column",
      gap: "20px",
      marginTop: "10px"
    },
    card: {
      backgroundColor: "#fff",
      borderRadius: "8px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      overflow: "hidden",
      border: "1px solid #e0e0e0"
    },
    cardHeader: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "12px 16px",
      backgroundColor: "#fff",
      borderBottom: "1px solid #e0e0e0",
      fontWeight: "600",
      color: "#2c3e50",
      fontSize: "15px"
    },
    cardBody: {
      padding: "16px",
      display: "flex",
      gap: "24px"
    },
    avatarContainer: {
      width: "110px",
      height: "140px",
      border: "1px solid #e0e0e0",
      borderRadius: "4px",
      overflow: "hidden",
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f9fafb"
    },
    avatar: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    },
    infoGrid: {
      flex: 1,
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "24px"
    },
    infoGrid2: {
      flex: 1,
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: "24px"
    },
    column: {
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      borderLeft: "1px solid #e0e0e0",
      paddingLeft: "16px"
    },
    firstColumn: {
      display: "flex",
      flexDirection: "column",
      gap: "12px"
    },
    dataRow: {
      display: "flex",
      fontSize: "14px",
      lineHeight: "1.4"
    },
    dataLabel: {
      color: "#555",
      width: "120px",
      flexShrink: 0
    },
    dataValue: {
      fontWeight: "600",
      color: "#333",
      flex: 1
    }
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === 'N/A') return 'N/A';
    // If it's YYYY-MM-DD, convert to DD/MM/YYYY
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  };

  return (
    <div style={styles.container}>
      {/* Thẻ Thông tin sinh viên */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <User size={18} color="#3498db" /> Thông tin sinh viên
        </div>
        <div style={styles.cardBody}>
          <div style={styles.avatarContainer}>
            <User size={60} color="#cbd5e1" />
          </div>
          <div style={styles.infoGrid}>
            <div style={styles.firstColumn}>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Mã SV:</span>
                <span style={styles.dataValue}>{studentProfile.mssv || "N/A"}</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Tên sinh viên:</span>
                <span style={styles.dataValue}>{studentProfile.ho_ten || "N/A"}</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Ngày sinh:</span>
                <span style={styles.dataValue}>{formatDate(studentProfile.ngay_sinh)}</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Giới tính:</span>
                <span style={styles.dataValue}>{studentProfile.gioi_tinh || "N/A"}</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Trạng thái:</span>
                <span style={styles.dataValue}>{studentProfile.academic_status || "Đang học"}</span>
              </div>
            </div>

            <div style={styles.column}>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Số điện thoại:</span>
                <span style={styles.dataValue}>{studentProfile.sdt || "N/A"}</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Số CMND/ CCCD:</span>
                <span style={styles.dataValue}>{studentProfile.cmnd || "N/A"}</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Dân tộc:</span>
                <span style={styles.dataValue}>{studentProfile.dan_toc || "N/A"}</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Tôn giáo:</span>
                <span style={styles.dataValue}>{studentProfile.ton_giao || "N/A"}</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Nơi sinh:</span>
                <span style={styles.dataValue}>{studentProfile.noi_sinh || "N/A"}</span>
              </div>
            </div>

            <div style={styles.column}>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Quốc tịch:</span>
                <span style={styles.dataValue}>{studentProfile.quoc_tich || "N/A"}</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Email 1:</span>
                <span style={styles.dataValue}>{studentProfile.email || "N/A"}</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Email 2:</span>
                <span style={styles.dataValue}>N/A</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Địa chỉ:</span>
                <span style={styles.dataValue}>{studentProfile.dia_chi || "N/A"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Thẻ Thông tin khóa học */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <User size={18} color="#3498db" /> Thông tin khóa học
        </div>
        <div style={styles.cardBody}>
          <div style={styles.infoGrid2}>
            <div style={styles.firstColumn}>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Lớp:</span>
                <span style={styles.dataValue}>{studentProfile.lop_base || "N/A"}</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Ngành:</span>
                <span style={styles.dataValue}>{studentProfile.major || "N/A"}</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Chuyên ngành:</span>
                <span style={styles.dataValue}>{studentProfile.specialization || "N/A"}</span>
              </div>
            </div>

            <div style={styles.column}>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Khoa:</span>
                <span style={styles.dataValue}>{studentProfile.department || "N/A"}</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Bậc hệ đào tạo:</span>
                <span style={styles.dataValue}>{studentProfile.training_program || "N/A"}</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Niên khóa:</span>
                <span style={styles.dataValue}>{studentProfile.cohort || "N/A"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseInfoCard;
