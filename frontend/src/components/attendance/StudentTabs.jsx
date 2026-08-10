import React from "react";
import { cardStyles as styles } from "../../styles/attendanceStyles";

export const StudentTabs = ({ store }) => {
  const { pendingFaces, setPendingFaces, regMssv, setRegMssv, regName, setRegName, regLop, setRegLop, regPhoto, setRegPhoto, regPhotoName, setRegPhotoName, regUseWebcam, setRegUseWebcam, regWebcamStream, setRegWebcamStream, regPreviewSrc, setRegPreviewSrc, schClass, setSchClass, schDate, setSchDate, schRoom, setSchRoom, schTime, setSchTime, subCode, setSubCode, subName, setSubName, subCredits, setSubCredits, ccCode, setCcCode, ccSub, setCcSub, leaveRequests, setLeaveRequests, myLeaveRequests, setMyLeaveRequests, myReport, setMyReport, exportMyReport, reportSearch, setReportSearch, manualMssv, setManualMssv, manualSessionId, setManualSessionId, manualStatus, setManualStatus, reportClass, setReportClass, attendanceReport, setAttendanceReport, studentsList, setStudentsList, searchKeyword, setSearchKeyword, filterClass, setFilterClass, manualClass, setManualClass, manualClassStudents, setManualClassStudents, manualLoading, setManualLoading, leaveSessionId, setLeaveSessionId, leaveReason, setLeaveReason, leaveProof, setLeaveProof, recognizeImageSrc, setRecognizeImageSrc, recognizeFile, setRecognizeFile, cameraRoom, setCameraRoom, detectionLogs, setDetectionLogs, useWebcam, setUseWebcam, webcamStream, setWebcamStream, activeChallenge, setActiveChallenge, challengePassed, setChallengePassed, challengePrompt, setChallengePrompt, currentFace, setCurrentFace, creditClasses, setCreditClasses, selectedClass, setSelectedClass, enrolledStudents, setEnrolledStudents, enrollMssv, setEnrollMssv, bulkClassCode, setBulkClassCode, studentClasses, setStudentClasses, adminCameras, setAdminCameras, simulatedLogs, setSimulatedLogs, schedules, setSchedules, availableClasses, setAvailableClasses, editingScheduleId, setEditingScheduleId, lecturersList, setLecturersList, ccLecturer, setCcLecturer, regModeTab, setRegModeTab, classSearch, setClassSearch, editDate, setEditDate, editRoom, setEditRoom, editTime, setEditTime, editingStudentId, setEditingStudentId, editStudentName, setEditStudentName, editStudentClass, setEditStudentClass, scheduleViewMode, setScheduleViewMode, registrationInfo, setRegistrationInfo, totalCredits, setTotalCredits, subSemester, setSubSemester, subPrereq, setSubPrereq, ccSemester, setCcSemester, ccYear, setCcYear, ccCapacity, setCcCapacity, ccCohort, setCcCohort, demoControls, setDemoControls, demoSaving, setDemoSaving, selectedWeekStart, setSelectedWeekStart, fileInputRef, imageRef, canvasRef, videoRef, regVideoRef, API_BASE, role, username, activeTab, startWebcam, stopWebcam, startRegWebcam, stopRegWebcam, captureRegPhoto, fetchRegistrationInfo, fetchDemoControls, handleDemoToggle, DEMO_TOGGLES, fetchAvailableClasses, handleRegisterCourse, handleUnregisterCourse, fetchSchedules, handleDeleteSchedule, handleUpdateSchedule, handleDeleteStudent, handleUpdateStudent, fetchLecturersList, fetchCreditClasses, fetchEnrolledStudents, handleEnrollStudent, handleUnenrollStudent, handleBulkEnroll, fetchStudentClasses, toggleCameraSimulation, fetchStudentsList, fetchManualClassStudents, handleQuickCheckin, fetchPendingFaces, fetchLeaveRequests, handleApproveFace, handleApproveLeave, handleRejectLeave, handleManualCheckinSubmit, fetchAttendanceReport, exportAttendanceReport, handleLeaveRequestSubmit, handleRefreshBiometrics, processImage, handleFileDrop, triggerRecognition, drawBoundingBoxes, resetRecognition, handleRegister, handleCreateSchedule, handleCreateSubject, handleCreateCreditClass, renderStudentsListTab, renderClassManagementTab, formatDate, getDaysOfWeek } = store;
  return (
    <>
            {role === 'sinh_vien' && (
              <>

                {activeTab === 'submit_leave' && (
                  <>
                  <form onSubmit={handleLeaveRequestSubmit}>
                    <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0 0 10px 0" }}>Nộp đơn xin phép nghỉ buổi học</h4>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Mã buổi học nghỉ phép</label>
                      <input
                        type="number"
                        required
                        placeholder="Mã số buổi học trong lịch học (ví dụ: 1)"
                        style={styles.input}
                        value={leaveSessionId}
                        onChange={(e) => setLeaveSessionId(e.target.value)}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Lý do xin nghỉ</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Nêu rõ lý do (VD: Bị ốm có giấy ra viện, Lý do gia đình...)"
                        style={{ ...styles.input, resize: "none" }}
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Minh chứng đính kèm</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={leaveProof}
                        onChange={(e) => setLeaveProof(e.target.value)}
                      />
                    </div>
                     <button type="submit" style={{ ...styles.btn, width: "100%", marginTop: "10px" }}>Nộp đơn xin nghỉ</button>
                  </form>

                  <div style={{ marginTop: "20px", background: "#f8fbfd", border: "1px solid #d0e0eb", borderRadius: "8px", padding: "12px" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#106fa6", display: "block", marginBottom: "10px" }}>Lịch sử đơn nghỉ phép</span>
                    {myLeaveRequests.length === 0 ? (
                      <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Bạn chưa gửi đơn nào.</span>
                    ) : (
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Lớp TC</th>
                            <th style={styles.th}>Ngày học</th>
                            <th style={styles.th}>Lý do</th>
                            <th style={styles.th}>Trạng thái</th>
                            <th style={styles.th}>Người duyệt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {myLeaveRequests.map((r) => (
                            <tr key={r.id}>
                              <td style={styles.td}>{r.ma_lop_tc}</td>
                              <td style={styles.td}>{r.ngay_hoc}</td>
                              <td style={styles.td}>{r.ly_do}</td>
                              <td style={styles.td}>
                                <span style={{
                                  padding: "2px 8px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "600",
                                  backgroundColor: r.trang_thai === 'Approved' ? "#e6f8f0" : r.trang_thai === 'Pending' ? "#fff7e6" : "#fdf0f0",
                                  color: r.trang_thai === 'Approved' ? "#10b981" : r.trang_thai === 'Pending' ? "#d48806" : "#ef4444"
                                }}>
                                  {r.trang_thai === 'Approved' ? 'Đã duyệt' : r.trang_thai === 'Pending' ? 'Chờ duyệt' : 'Từ chối'}
                                </span>
                              </td>
                              <td style={styles.td}>{r.nguoi_duyet || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  </>
                )}

                {activeTab === 'my_report' && (
                  <div>
                    <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0 0 12px 0" }}>Báo cáo tổng kết của tôi</h4>
                    {myReport ? (
                      <>
                        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "14px", alignItems: "center" }}>
                          <div style={{ background: myReport.cam_thi ? "#fdf0f0" : "#e6f8f0", border: `1px solid ${myReport.cam_thi ? "#fca5a5" : "#86efac"}`, borderRadius: "8px", padding: "10px 16px" }}>
                            <div style={{ fontSize: "1.2rem", fontWeight: "700", color: myReport.cam_thi ? "#ef4444" : "#10b981" }}>
                              {myReport.cam_thi ? "⚠ Cảnh báo Cấm thi" : "✓ Đủ điều kiện dự thi"}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#54738c" }}>{myReport.student.ho_ten} ({myReport.student.mssv})</div>
                          </div>
                          <div style={{ background: "#f8fbfd", border: "1px solid #d0e0eb", borderRadius: "8px", padding: "10px 16px" }}>
                            <div style={{ fontSize: "1.2rem", fontWeight: "700", color: "#106fa6" }}>{myReport.totals.so_lop}</div>
                            <div style={{ fontSize: "0.75rem", color: "#54738c" }}>Lớp đang học</div>
                          </div>
                          <div style={{ background: "#f8fbfd", border: "1px solid #d0e0eb", borderRadius: "8px", padding: "10px 16px" }}>
                            <div style={{ fontSize: "1.2rem", fontWeight: "700", color: "#106fa6" }}>{myReport.totals.tong_buoi}</div>
                            <div style={{ fontSize: "0.75rem", color: "#54738c" }}>Tổng buổi học</div>
                          </div>
                          <button onClick={exportMyReport} style={{ ...styles.btn, marginLeft: "auto", padding: "6px 14px", fontSize: "0.8rem", backgroundColor: "#10b981" }}>Xuất Excel</button>
                        </div>
                        <input type="text" placeholder="🔍 Tìm môn học / lớp..." value={reportSearch} onChange={(e) => setReportSearch(e.target.value)} style={{ ...styles.input, marginBottom: "12px", maxWidth: "300px" }} />
                        {myReport.classes.length > 0 ? (
                          <table style={styles.table}>
                            <thead>
                              <tr>
                                <th style={styles.th}>Lớp TC</th>
                                <th style={styles.th}>Môn học</th>
                                <th style={styles.th}>Giảng viên</th>
                                <th style={styles.th}>Tổng buổi</th>
                                <th style={styles.th}>Có mặt</th>
                                <th style={styles.th}>Muộn</th>
                                <th style={styles.th}>Vắng KP</th>
                                <th style={styles.th}>Điểm CC</th>
                                <th style={styles.th}>Tỷ lệ vắng</th>
                                <th style={styles.th}>Trạng thái</th>
                              </tr>
                            </thead>
                            <tbody>
                              {myReport.classes.filter(c => !reportSearch.toLowerCase() || (c.ma_lop_tc + ' ' + c.subject_name).toLowerCase().includes(reportSearch.toLowerCase())).map((c, i) => {
                                const isBanned = c.trang_thai === "Cấm thi";
                                return (
                                  <tr key={i} style={{ backgroundColor: isBanned ? "#fff2f2" : "transparent" }}>
                                    <td style={styles.td}>{c.ma_lop_tc}</td>
                                    <td style={styles.td}>{c.subject_name}</td>
                                    <td style={styles.td}>{c.lecturer_name}</td>
                                    <td style={styles.td}>{c.tong_buoi}</td>
                                    <td style={styles.td}>{c.co_mat}</td>
                                    <td style={styles.td}>{c.di_muon}</td>
                                    <td style={styles.td}>{c.vang_kp}</td>
                                    <td style={{ ...styles.td, fontWeight: "bold" }}>{c.score}</td>
                                    <td style={styles.td}>{c.ty_le_vang}%</td>
                                    <td style={{ ...styles.td, fontWeight: "600", color: isBanned ? "#ef4444" : "#10b981" }}>
                                      {isBanned ? "Cấm thi" : "Hợp lệ"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : (
                          <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Bạn chưa đăng ký lớp học nào.</span>
                        )}
                      </>
                    ) : (
                      <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Đang tải...</span>
                    )}
                  </div>
                )}

                {activeTab === 'refresh_biometrics' && (
                  <form onSubmit={handleRefreshBiometrics}>
                    <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0 0 10px 0" }}>Làm mới dữ liệu khuôn mặt (Refresh Biometrics)</h4>
                    <p style={{ fontSize: "0.75rem", color: "#6c8da3", lineHeight: "1.35", margin: "0 0 12px 0" }}>
                      Sinh viên được phép cập nhật sinh trắc học mới 6 tháng một lần để đảm bảo độ chính xác nhận dạng đạt ≥99.2%. Ảnh tải lên sẽ cần được Phòng Đào tạo duyệt hậu kiểm trước khi kích hoạt.
                    </p>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Chọn ảnh chân dung Face ID mới</label>
                      <input
                        type="file"
                        accept="image/*"
                        id="refresh-biometric-file"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          if (e.target.files.length > 0) {
                            setRegPhoto(e.target.files[0]);
                            setRegPhotoName(e.target.files[0].name);
                          }
                        }}
                      />
                      <button
                        type="button"
                        style={{ ...styles.btn, ...styles.btnSecondary, padding: "8px 14px", fontSize: "0.8rem" }}
                        onClick={() => document.getElementById("refresh-biometric-file").click()}
                      >
                        Chọn file ảnh chân dung
                      </button>
                      {regPhotoName && (
                        <div style={{ fontSize: "0.75rem", color: "#10b981", marginTop: "4px" }}>
                          ✓ {regPhotoName}
                        </div>
                      )}
                    </div>

                    <button type="submit" style={{ ...styles.btn, width: "100%", marginTop: "10px" }}>Yêu cầu cập nhật Face ID</button>
                  </form>
                )}

                {activeTab === 'my_classes' && (
                  <div>
                    <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0 0 10px 0" }}>Lớp học & Tiến trình học tập</h4>
                    {studentClasses.length === 0 ? (
                      <p style={{ fontSize: "0.8rem", color: "#6c8da3" }}>Bạn chưa đăng ký lớp tín chỉ nào.</p>
                    ) : (
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Lớp tín chỉ</th>
                            <th style={styles.th}>Môn học</th>
                            <th style={styles.th}>Số buổi đi học</th>
                            <th style={styles.th}>Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentClasses.map((c, i) => (
                            <tr key={i}>
                              <td style={styles.td}>{c.class_id}</td>
                              <td style={styles.td}>
                                <strong>{c.subject_name}</strong><br />
                                <small style={{ color: "#777" }}>{c.subject_id}</small>
                              </td>
                              <td style={styles.td}>
                                <strong>{c.attended_sessions}</strong> / {c.total_sessions} buổi
                              </td>
                              <td style={styles.td}>
                                <span style={{
                                  padding: "3px 6px",
                                  borderRadius: "4px",
                                  fontSize: "0.75rem",
                                  backgroundColor: c.status === 'Active' ? "#e6f8f0" : "#fdf0f0",
                                  color: c.status === 'Active' ? "#10b981" : "#ef4444",
                                  fontWeight: "600"
                                }}>
                                  {c.status === 'Active' ? 'Học tập' : 'Cấm thi'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {/* Detailed upcoming schedules for student's registered classes */}
                    {studentClasses.length > 0 && (
                      <div style={{ marginTop: "25px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid #e2edf5", paddingBottom: "6px" }}>
                          <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: 0 }}>Thời khóa biểu học tập của tôi</h4>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              type="button"
                              onClick={() => setScheduleViewMode('grid')}
                              style={{
                                ...styles.btn,
                                padding: "4px 8px",
                                fontSize: "0.7rem",
                                backgroundColor: scheduleViewMode === 'grid' ? "#106fa6" : "#ffffff",
                                color: scheduleViewMode === 'grid' ? "#ffffff" : "#475569",
                                border: "1px solid #cbd5e1"
                              }}
                            >
                              📅 Dạng Lịch Tuần
                            </button>
                            <button
                              type="button"
                              onClick={() => setScheduleViewMode('list')}
                              style={{
                                ...styles.btn,
                                padding: "4px 8px",
                                fontSize: "0.7rem",
                                backgroundColor: scheduleViewMode === 'list' ? "#106fa6" : "#ffffff",
                                color: scheduleViewMode === 'list' ? "#ffffff" : "#475569",
                                border: "1px solid #cbd5e1"
                              }}
                            >
                              📋 Dạng Danh Sách
                            </button>
                          </div>
                        </div>

                        {(() => {
                          const myClassIds = (studentClasses || []).map(c => c ? c.class_id : "");
                          const mySchedules = (schedules || []).filter(s => s && myClassIds.includes(s.class_id));

                          if (mySchedules.length === 0) {
                            return <p style={{ fontSize: "0.8rem", color: "#6c8da3", padding: "10px", background: "#f8fbfd", borderRadius: "6px", border: "1px solid #eef2f6" }}>Chưa xếp lịch học cụ thể cho các môn học này.</p>;
                          }

                          if (scheduleViewMode === 'list') {
                            return (
                              <table style={styles.table}>
                                <thead>
                                  <tr>
                                    <th style={styles.th}>Môn học</th>
                                    <th style={styles.th}>Mã lớp</th>
                                    <th style={styles.th}>Ngày học</th>
                                    <th style={styles.th}>Giờ bắt đầu</th>
                                    <th style={styles.th}>Phòng học</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {mySchedules.map((s, idx) => (
                                    <tr key={idx}>
                                      <td style={styles.td}><strong>{s.subject_name || "N/A"}</strong></td>
                                      <td style={styles.td}>{s.class_id || "N/A"}</td>
                                      <td style={styles.td}>{s.study_date || "N/A"}</td>
                                      <td style={styles.td}>{s.start_time ? s.start_time.substring(0, 5) : "N/A"}</td>
                                      <td style={styles.td}>
                                        <span style={{
                                          padding: "3px 6px",
                                          borderRadius: "4px",
                                          backgroundColor: "#f0f9ff",
                                          color: "#0369a1",
                                          fontWeight: "600",
                                          fontSize: "0.75rem"
                                        }}>
                                          🚪 {s.room || "N/A"}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            );
                          }

                          // Grid Mode: Group by day of week
                          const daysOfWeek = getDaysOfWeek(selectedWeekStart);

                          // Filter schedules that fall within the selected week (Monday to Sunday)
                          const weekSchedules = mySchedules.filter(s => {
                            return s.study_date >= selectedWeekStart && s.study_date <= daysOfWeek[6].dateStr;
                          });

                          const weekdays = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];
                          const groupedSchedules = {
                            "Thứ 2": [], "Thứ 3": [], "Thứ 4": [], "Thứ 5": [], "Thứ 6": [], "Thứ 7": [], "Chủ Nhật": []
                          };

                          weekSchedules.forEach(s => {
                            const dateObj = new Date(s.study_date);
                            const day = dateObj.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
                            const dayLabel = day === 0 ? "Chủ Nhật" : `Thứ ${day + 1}`;
                            if (groupedSchedules[dayLabel]) {
                              groupedSchedules[dayLabel].push(s);
                            }
                          });

                          const handlePrevWeek = () => {
                            const prev = new Date(selectedWeekStart);
                            prev.setDate(prev.getDate() - 7);
                            setSelectedWeekStart(prev.toISOString().split('T')[0]);
                          };

                          const handleNextWeek = () => {
                            const next = new Date(selectedWeekStart);
                            next.setDate(next.getDate() + 7);
                            setSelectedWeekStart(next.toISOString().split('T')[0]);
                          };

                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
                              {/* Week Selector UI */}
                              <div style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "12px",
                                background: "#ffffff",
                                padding: "10px 18px",
                                borderRadius: "8px",
                                boxShadow: "0 2px 8px rgba(16, 111, 166, 0.08)",
                                border: "1px solid #d0e0eb",
                                width: "fit-content",
                                alignSelf: "center"
                              }}>
                                <button
                                  type="button"
                                  onClick={handlePrevWeek}
                                  style={{
                                    background: "#1d92d1",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "6px",
                                    padding: "6px 14px",
                                    cursor: "pointer",
                                    fontSize: "0.78rem",
                                    fontWeight: "600",
                                    transition: "background-color 0.2s"
                                  }}
                                  onMouseOver={(e) => e.target.style.backgroundColor = "#106fa6"}
                                  onMouseOut={(e) => e.target.style.backgroundColor = "#1d92d1"}
                                >
                                  ◀ Tuần trước
                                </button>
                                <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#1e293b", minWidth: "180px", textAlign: "center" }}>
                                  📅 {formatDate(selectedWeekStart)} - {formatDate(daysOfWeek[6].dateStr)}
                                </span>
                                <button
                                  type="button"
                                  onClick={handleNextWeek}
                                  style={{
                                    background: "#1d92d1",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "6px",
                                    padding: "6px 14px",
                                    cursor: "pointer",
                                    fontSize: "0.78rem",
                                    fontWeight: "600",
                                    transition: "background-color 0.2s"
                                  }}
                                  onMouseOver={(e) => e.target.style.backgroundColor = "#106fa6"}
                                  onMouseOut={(e) => e.target.style.backgroundColor = "#1d92d1"}
                                >
                                  Tuần sau ▶
                                </button>
                              </div>

                              <div style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                                gap: "10px"
                              }}>
                                {weekdays.map(day => {
                                  const dayInfo = daysOfWeek.find(d => d.label === day);
                                  return (
                                    <div key={day} style={{
                                      background: "#f8fbfd",
                                      border: "1px solid #e2edf5",
                                      borderRadius: "6px",
                                      padding: "8px",
                                      minHeight: "150px"
                                    }}>
                                      <div style={{
                                        fontSize: "0.72rem",
                                        fontWeight: "bold",
                                        color: "#1e293b",
                                        textAlign: "center",
                                        borderBottom: "2px solid #106fa6",
                                        paddingBottom: "4px",
                                        marginBottom: "8px"
                                      }}>
                                        <div>{day}</div>
                                        <div style={{ fontSize: "0.6rem", color: "#64748b", fontWeight: "normal", marginTop: "2px" }}>
                                          {dayInfo ? dayInfo.displayDate : ""}
                                        </div>
                                      </div>

                                      {groupedSchedules[day].length === 0 ? (
                                        <div style={{
                                          fontSize: "0.7rem",
                                          color: "#94a3b8",
                                          textAlign: "center",
                                          marginTop: "20px"
                                        }}>
                                          Trống
                                        </div>
                                      ) : (
                                        groupedSchedules[day].sort((a, b) => (a.start_time || "").localeCompare(b.start_time || "")).map((s, idx) => (
                                          <div key={idx} style={{
                                            background: "#ffffff",
                                            borderLeft: "3px solid #0284c7",
                                            borderRadius: "4px",
                                            padding: "6px",
                                            marginBottom: "6px",
                                            boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                                          }}>
                                            <div style={{ fontSize: "0.7rem", fontWeight: "bold", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={s.subject_name || ""}>
                                              {s.subject_name || "N/A"}
                                            </div>
                                            <div style={{ fontSize: "0.62rem", color: "#64748b", margin: "2px 0" }}>
                                              🕒 {s.start_time ? s.start_time.substring(0, 5) : "N/A"}
                                            </div>
                                            <div style={{ fontSize: "0.62rem", fontWeight: "600", color: "#0369a1" }}>
                                              🚪 {s.room || "N/A"}
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'course_registration' && (
                  <div>
                    {registrationInfo && registrationInfo.demo_mode && (
                      <div style={{
                        padding: "10px 14px", borderRadius: "8px", marginBottom: "12px", fontSize: "0.8rem",
                        background: "#fde8e8", border: "1px solid #f2b8b5", color: "#991b1b", fontWeight: "700"
                      }}>
                        CHẾ ĐỘ DEMO ĐANG BẬT — một số quy định đăng ký đang được nới lỏng tạm thời.
                        (Admin tắt tại mục "Bảng điều khiển Demo".)
                      </div>
                    )}
                    {/* Thông báo đợt đăng ký học phần */}
                    <div style={{
                      padding: "10px 14px", borderRadius: "8px", marginBottom: "20px", fontSize: "0.8rem",
                      background: registrationInfo && registrationInfo.is_open ? "#e6f8f0" : "#fff4e5",
                      border: registrationInfo && registrationInfo.is_open ? "1px solid #a7e0c4" : "1px solid #f0c987",
                      color: registrationInfo && registrationInfo.is_open ? "#0f7a4a" : "#8a5a00"
                    }}>
                      <strong>Đợt đăng ký:</strong> Học kỳ {registrationInfo?.semester ?? "?"} - Niên khóa {registrationInfo?.academic_year ?? "?"}
                      {" "}· Mở {registrationInfo?.open_date ? formatDate(registrationInfo.open_date) : "—"}
                      {" "}đến {registrationInfo?.close_date ? formatDate(registrationInfo.close_date) : "—"}
                      {" "}· Tín chỉ tối đa: {registrationInfo?.max_credits ?? "—"}
                      {registrationInfo && !registrationInfo.is_open && (
                        <span style={{ display: "block", marginTop: "4px", fontWeight: "600" }}>⚠ {registrationInfo.message}</span>
                      )}
                    </div>

                    {/* Section 1: Enrolled classes & progress */}
                    <div style={{ marginBottom: "25px" }}>
                      <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0 0 10px 0" }}>Lớp Học Phần Đang Theo Học & Tiến Độ</h4>
                      {studentClasses.length === 0 ? (
                        <p style={{ fontSize: "0.8rem", color: "#6c8da3", padding: "10px", background: "#f8fbfd", borderRadius: "6px", border: "1px solid #eef2f6" }}>
                          Bạn chưa đăng ký lớp tín chỉ nào. Vui lòng xem danh sách các lớp học phần bên dưới để đăng ký học.
                        </p>
                      ) : (
                        <>
                          <table style={styles.table}>
                            <thead>
                              <tr>
                                <th style={styles.th}>Lớp tín chỉ</th>
                                <th style={styles.th}>Môn học</th>
                                <th style={styles.th}>TC</th>
                                <th style={styles.th}>Số buổi đi học</th>
                                <th style={styles.th}>Trạng thái</th>
                                <th style={styles.th}>Hành động</th>
                              </tr>
                            </thead>
                            <tbody>
                              {studentClasses.map((c, i) => (
                                <tr key={i}>
                                  <td style={styles.td}><strong>{c.class_id}</strong></td>
                                  <td style={styles.td}>
                                    <strong>{c.subject_name}</strong><br />
                                    <small style={{ color: "#777" }}>{c.subject_id}</small>
                                  </td>
                                  <td style={styles.td}>{c.credits || 0}</td>
                                  <td style={styles.td}>
                                    <strong>{c.attended_sessions}</strong> / {c.total_sessions} buổi
                                  </td>
                                  <td style={styles.td}>
                                    <span style={{
                                      padding: "3px 6px",
                                      borderRadius: "4px",
                                      fontSize: "0.75rem",
                                      backgroundColor: c.status === 'Active' ? "#e6f8f0" : "#fdf0f0",
                                      color: c.status === 'Active' ? "#10b981" : "#ef4444",
                                      fontWeight: "600"
                                    }}>
                                      {c.status === 'Active' ? 'Học tập' : 'Cấm thi'}
                                    </span>
                                  </td>
                                  <td style={styles.td}>
                                    <button
                                      onClick={() => handleUnregisterCourse(c.class_id)}
                                      disabled={registrationInfo && !registrationInfo.is_open}
                                      style={{ ...styles.btn, padding: "4px 10px", fontSize: "0.72rem", background: "#e11d48" }}
                                    >
                                      Hủy đăng ký
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <p style={{ fontSize: "0.8rem", color: "#106fa6", fontWeight: "700", marginTop: "8px" }}>
                            Tổng số tín chỉ đã đăng ký: <strong>{totalCredits}</strong> (tối đa {registrationInfo?.max_credits ?? "—"})
                          </p>
                        </>
                      )}
                    </div>

                    {/* Section 2: Available classes to register */}
                    <div>
                      <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0 0 10px 0" }}>Danh Sách Lớp Học Phần Đang Mở</h4>
                      {availableClasses.length === 0 ? (
                        <p style={{ fontSize: "0.8rem", color: "#6c8da3", padding: "10px", background: "#f8fbfd", borderRadius: "6px", border: "1px solid #eef2f6" }}>
                          Hiện tại không có lớp học phần nào khả dụng để đăng ký (Bạn đã đăng ký học tất cả các lớp đang mở).
                        </p>
                      ) : (
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              <th style={styles.th}>Mã lớp tín chỉ</th>
                              <th style={styles.th}>Môn học</th>
                              <th style={styles.th}>TC</th>
                              <th style={styles.th}>Sĩ số</th>
                              <th style={styles.th}>Kỳ</th>
                              <th style={styles.th}>Hành động</th>
                            </tr>
                          </thead>
                          <tbody>
                            {availableClasses.map((c, i) => {
                              const isFull = (c.current_students || 0) >= (c.max_students || 50);
                              const canRegister = registrationInfo?.is_open && !isFull;
                              return (
                                <tr key={i}>
                                  <td style={styles.td}><strong>{c.class_id}</strong></td>
                                  <td style={styles.td}>
                                    {c.subject_name}<br />
                                    <small style={{ color: "#777" }}>{c.subject_id}</small>
                                  </td>
                                  <td style={styles.td}>{c.credits || 0}</td>
                                  <td style={styles.td}>
                                    <strong>{c.current_students || 0}</strong> / {c.max_students || 50}
                                    {isFull && <span style={{ color: "#e11d48", fontSize: "0.7rem", display: "block" }}>Đã đủ</span>}
                                  </td>
                                  <td style={styles.td}>{c.semester || "—"}</td>
                                  <td style={styles.td}>
                                    <button
                                      onClick={() => handleRegisterCourse(c.class_id)}
                                      disabled={!canRegister}
                                      style={{
                                        ...styles.btn, padding: "4px 10px", fontSize: "0.75rem",
                                        opacity: canRegister ? 1 : 0.5, cursor: canRegister ? "pointer" : "not-allowed"
                                      }}
                                    >
                                      {isFull ? "Đã hết chỗ" : (registrationInfo && !registrationInfo.is_open ? "Ngoài đợt" : "Đăng ký học")}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
    </>
  );
};

export default StudentTabs;
