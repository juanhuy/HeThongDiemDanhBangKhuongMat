import React, { useState } from 'react';
import { User, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

const CourseInfoCard = ({ studentProfile }) => {
  if (!studentProfile) return null;
  const [showAll, setShowAll] = useState(false);

  const styles = {
    container: {
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      marginTop: "10px",
      width: "100%",
      maxWidth: "100%",
      overflow: "hidden"
    },
    card: {
      backgroundColor: "#fff",
      borderRadius: "12px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      overflow: "hidden",
      border: "1px solid #d0e0eb",
      width: "100%",
      maxWidth: "100%",
      boxSizing: "border-box"
    },
    cardHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "8px",
      padding: "12px 16px",
      backgroundColor: "#f8fafc",
      borderBottom: "1px solid #e2edf5",
      fontWeight: "600",
      color: "#0b517a",
      fontSize: "15px"
    },
    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: "8px"
    },
    cardBody: {
      padding: "16px"
    },
    infoList: {
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      width: "100%",
      minWidth: 0
    },
    toggleBtn: {
      background: "none",
      border: "none",
      color: "#1d92d1",
      fontSize: "0.85rem",
      fontWeight: "600",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      padding: "6px 8px",
      borderRadius: "6px",
      width: "100%",
      justifyContent: "center",
      marginTop: "4px"
    },
    divider: {
      height: "1px",
      backgroundColor: "#e2edf5",
      margin: "14px 0"
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

  const primaryInfo = [
    { label: "Mã SV", value: studentProfile.mssv || "N/A" },
    { label: "Tên sinh viên", value: studentProfile.ho_ten || "N/A" },
    { label: "Lớp", value: studentProfile.lop_base || "N/A" },
    { label: "Ngành", value: studentProfile.major || "N/A" },
    { label: "Chuyên ngành", value: studentProfile.specialization || "N/A" },
    { label: "Trạng thái", value: studentProfile.academic_status || "Đang học" },
  ];

  const secondaryInfo = [
    { label: "Ngày sinh", value: formatDate(studentProfile.ngay_sinh) },
    { label: "Giới tính", value: studentProfile.gioi_tinh || "N/A" },
    { label: "Số điện thoại", value: studentProfile.sdt || "N/A" },
    { label: "Số CMND/CCCD", value: studentProfile.cmnd || "N/A" },
    { label: "Dân tộc", value: studentProfile.dan_toc || "N/A" },
    { label: "Tôn giáo", value: studentProfile.ton_giao || "N/A" },
    { label: "Nơi sinh", value: studentProfile.noi_sinh || "N/A" },
    { label: "Quốc tịch", value: studentProfile.quoc_tich || "N/A" },
    { label: "Email", value: studentProfile.email || "N/A" },
    { label: "Địa chỉ", value: studentProfile.dia_chi || "N/A" },
    { label: "Khoa", value: studentProfile.department || "N/A" },
    { label: "Bậc hệ đào tạo", value: studentProfile.training_program || "N/A" },
    { label: "Niên khóa", value: studentProfile.cohort || "N/A" },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.headerLeft}>
            <User size={18} color="#3498db" /> Thông tin sinh viên
          </div>
        </div>
        <div style={styles.cardBody}>
          <div style={styles.infoList}>
            {primaryInfo.map((row, i) => (
              <div key={i} className="ptit-info-row">
                <span className="ptit-info-label">{row.label}:</span>
                <span className="ptit-info-value">{row.value}</span>
              </div>
            ))}
          </div>

          <div style={styles.divider} />

          <button style={styles.toggleBtn} onClick={() => setShowAll(!showAll)}>
            {showAll ? <><ChevronUp size={16} /> Thu gọn</> : <><ChevronDown size={16} /> Xem thông tin chi tiết</>}
          </button>

          {showAll && (
            <div style={styles.infoList}>
              {secondaryInfo.map((row, i) => (
                <div key={i} className="ptit-info-row">
                  <span className="ptit-info-label">{row.label}:</span>
                  <span className="ptit-info-value">{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.headerLeft}>
            <BookOpen size={18} color="#3498db" /> Thông tin khóa học
          </div>
        </div>
        <div style={styles.cardBody}>
          <div style={styles.infoList}>
            {[
              { label: "Lớp", value: studentProfile.lop_base || "N/A" },
              { label: "Ngành", value: studentProfile.major || "N/A" },
              { label: "Chuyên ngành", value: studentProfile.specialization || "N/A" },
              { label: "Khoa", value: studentProfile.department || "N/A" },
              { label: "Bậc hệ đào tạo", value: studentProfile.training_program || "N/A" },
              { label: "Niên khóa", value: studentProfile.cohort || "N/A" },
            ].map((row, i) => (
              <div key={i} className="ptit-info-row">
                <span className="ptit-info-label">{row.label}:</span>
                <span className="ptit-info-value">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseInfoCard;
