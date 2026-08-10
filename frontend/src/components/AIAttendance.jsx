import React from "react";
import { Zap } from "lucide-react";
import { useAttendanceStore } from "../hooks/useAttendanceStore";
import { cardStyles as styles } from "../styles/attendanceStyles";
import CameraMonitor from "./attendance/CameraMonitor";
import AdminTabs from "./attendance/AdminTabs";
import LecturerTabs from "./attendance/LecturerTabs";
import StudentTabs from "./attendance/StudentTabs";

// Shell: giữ toàn bộ state/actions trong useAttendanceStore,
// chỉ còn công việc định tuyến theo vai trò & menu.
const AIAttendance = ({ API_BASE, showToast, onAttendanceLogged, user, activeMenu, onUnauthorized }) => {
  const store = useAttendanceStore({
    API_BASE,
    showToast,
    onAttendanceLogged,
    user,
    activeMenu,
    onUnauthorized,
  });

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <Zap size={16} /> Bảng điều khiển phân hệ chuyên cần (Quyền: {store.role.toUpperCase()})
      </div>
      <div style={styles.cardBody}>
        <div style={{ ...styles.aiContainer, position: "relative" }}>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          {store.fetching && (
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(255,255,255,0.75)", zIndex: 50, borderRadius: "10px"
            }}>
              <span style={{
                width: 28, height: 28, border: "3px solid #d0e0eb", borderTopColor: "#106fa6",
                borderRadius: "50%", animation: "spin 0.8s linear infinite"
              }} />
            </div>
          )}
          {/* Trái: Camera mô phỏng quét khuôn mặt (chỉ Admin & tab camera_dashboard) */}
          {store.role === "admin" && store.activeTab === "camera_dashboard" && <CameraMonitor store={store} />}

          {/* Phải: Các phân hệ quản lý & nghiệp vụ theo vai trò */}
          <div
            style={{
              borderLeft: store.role === "admin" ? "1px solid #d0e0eb" : "none",
              paddingLeft: store.role === "admin" ? "1.5rem" : "0",
            }}
          >
            {store.role === "admin" && <AdminTabs store={store} />}
            {store.role === "giang_vien" && <LecturerTabs store={store} />}
            {store.role === "sinh_vien" && <StudentTabs store={store} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAttendance;