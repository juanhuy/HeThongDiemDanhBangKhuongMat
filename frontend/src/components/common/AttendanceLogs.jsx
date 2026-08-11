import React from 'react';
import { CalendarDays } from 'lucide-react';

const AttendanceLogs = ({ logs, checkoutEnabled = false }) => {
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
    table: {
      width: "100%",
      borderCollapse: "collapse",
      textAlign: "left",
      fontSize: "0.85rem"
    },
    th: {
      color: "#106fa6",
      fontWeight: "600",
      padding: "10px 14px",
      borderBottom: "2px solid #b9d5e8",
      background: "#f0f7fc"
    },
    td: {
      padding: "12px 14px",
      borderBottom: "1px solid #e2edf5"
    },
    badge: {
      display: "inline-block",
      padding: "3px 8px",
      borderRadius: "4px",
      fontSize: "0.75rem",
      fontWeight: "600"
    },
    badgeSuccess: {
      background: "#e6f9f0",
      color: "#10b981",
      border: "1px solid #a7f3d0"
    },
    badgeInfo: {
      background: "#e0f2fe",
      color: "#0284c7",
      border: "1px solid #bae6fd"
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
         <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#106fa6', margin: 0 }}>
          Nhật ký điểm danh lớp học
        </h2>
      </div>
      <div style={styles.cardBody}>
        <div style={{ overflowX: "auto", width: "100%" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Thời gian quét</th>
                <th style={styles.th}>MSSV</th>
                <th style={styles.th}>Họ tên sinh viên</th>
                <th style={styles.th}>Lớp chuyên ngành</th>
                <th style={styles.th}>Buổi học</th>
                <th style={styles.th}>Trạng thái</th>
                {checkoutEnabled && (
                  <>
                    <th style={styles.th}>Giờ rời</th>
                    <th style={styles.th}>Hiện diện</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={checkoutEnabled ? 8 : 6} style={{ ...styles.td, textAlign: "center", color: "var(--text-muted)" }}>
                    Chưa ghi nhận lịch sử quét điểm danh nào trong ngày.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td style={styles.td}>{log.timestamp}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{log.mssv}</td>
                    <td style={styles.td}>{log.fullname}</td>
                    <td style={styles.td}>{log.lop_base}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, ...styles.badgeInfo }}>Buổi {log.ma_buoi_hoc}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, ...styles.badgeSuccess }}>{log.trang_thai}</span>
                    </td>
                    {checkoutEnabled && (
                      <>
                        <td style={styles.td}>
                          {log.check_out_time ? log.check_out_time : (log.is_present ? "Đang ở lớp" : "—")}
                        </td>
                        <td style={styles.td}>
                          {log.duration_min != null ? `${log.duration_min} phút` : "—"}
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceLogs;
