import React from 'react';
import { User, Briefcase } from 'lucide-react';

const LecturerInfoCard = ({ lecturerProfile }) => {
  if (!lecturerProfile) return null;

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
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  };

  return (
    <div style={styles.container}>
      {/* Thẻ Thông tin nhân thân */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <User size={18} color="#3498db" /> Thông tin nhân thân giảng viên
        </div>
        <div style={styles.cardBody}>
          <div style={styles.avatarContainer}>
            <User size={60} color="#cbd5e1" />
          </div>
          <div style={styles.infoGrid}>
            <div style={styles.firstColumn}>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Mã GV:</span>
                <span style={styles.dataValue}>{lecturerProfile.lecturer_id || "N/A"}</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Tên giảng viên:</span>
                <span style={styles.dataValue}>{lecturerProfile.full_name || "N/A"}</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Ngày sinh:</span>
                <span style={styles.dataValue}>{formatDate(lecturerProfile.date_of_birth)}</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Giới tính:</span>
                <span style={styles.dataValue}>{lecturerProfile.gender || "N/A"}</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Trạng thái:</span>
                <span style={{...styles.dataValue, color: lecturerProfile.teaching_status === 'Active' ? '#22c55e' : '#eab308'}}>{lecturerProfile.teaching_status === 'Active' ? 'Đang giảng dạy' : (lecturerProfile.teaching_status || 'N/A')}</span>
              </div>
            </div>

            <div style={styles.column}>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Số điện thoại:</span>
                <span style={styles.dataValue}>{lecturerProfile.phone_number || "N/A"}</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Số CMND/ CCCD:</span>
                <span style={styles.dataValue}>{lecturerProfile.citizen_id || "N/A"}</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Dân tộc:</span>
                <span style={styles.dataValue}>{lecturerProfile.ethnicity || "N/A"}</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Tôn giáo:</span>
                <span style={styles.dataValue}>{lecturerProfile.religion || "N/A"}</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Nơi sinh:</span>
                <span style={styles.dataValue}>{lecturerProfile.place_of_birth || "N/A"}</span>
              </div>
            </div>

            <div style={styles.column}>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Quốc tịch:</span>
                <span style={styles.dataValue}>{lecturerProfile.nationality || "N/A"}</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Email cá nhân:</span>
                <span style={styles.dataValue}>{lecturerProfile.email || "N/A"}</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Địa chỉ:</span>
                <span style={styles.dataValue}>{lecturerProfile.address || "N/A"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Thẻ Thông tin giảng dạy học thuật */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <Briefcase size={18} color="#3498db" /> Thông tin giảng dạy học thuật
        </div>
        <div style={styles.cardBody}>
          <div style={styles.infoGrid2}>
            <div style={styles.firstColumn}>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Khoa:</span>
                <span style={styles.dataValue}>{lecturerProfile.department || lecturerProfile.faculty_name || "N/A"}</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Học hàm/Học vị:</span>
                <span style={styles.dataValue}>{lecturerProfile.academic_title || "N/A"}</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Chức vụ:</span>
                <span style={styles.dataValue}>{lecturerProfile.position || "N/A"}</span>
              </div>
            </div>

            <div style={styles.column}>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Loại hợp đồng:</span>
                <span style={styles.dataValue}>{lecturerProfile.employment_type || "N/A"}</span>
              </div>
              <div style={styles.dataRow}>
                <span style={styles.dataLabel}>Ngày ký HĐ:</span>
                <span style={styles.dataValue}>{formatDate(lecturerProfile.hire_date)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LecturerInfoCard;
