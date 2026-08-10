import React from "react";
import { AlertOctagon } from "lucide-react";
import { cardStyles as styles } from "../../styles/attendanceStyles";

export const LecturerTabs = ({ store }) => {
  const { pendingFaces, setPendingFaces, regMssv, setRegMssv, regName, setRegName, regLop, setRegLop, regPhoto, setRegPhoto, regPhotoName, setRegPhotoName, regUseWebcam, setRegUseWebcam, regWebcamStream, setRegWebcamStream, regPreviewSrc, setRegPreviewSrc, schClass, setSchClass, schDate, setSchDate, schRoom, setSchRoom, schTime, setSchTime, subCode, setSubCode, subName, setSubName, subCredits, setSubCredits, ccCode, setCcCode, ccSub, setCcSub, leaveRequests, setLeaveRequests, manualMssv, setManualMssv, manualSessionId, setManualSessionId, manualStatus, setManualStatus, reportClass, setReportClass, attendanceReport, setAttendanceReport, reportFromDate, setReportFromDate, reportToDate, setReportToDate, lecturerReport, setLecturerReport, subjectReport, setSubjectReport, fetchLecturerReport, fetchSubjectReport, exportLecturerReport, exportSubjectReport, reportSubject, setReportSubject, reportLecturer, setReportLecturer, reportSearch, setReportSearch, reportPage, setReportPage, subjectsList, studentsList, setStudentsList, searchKeyword, setSearchKeyword, filterClass, setFilterClass, manualClass, setManualClass, manualClassStudents, setManualClassStudents, manualLoading, setManualLoading, classSchedules, setClassSchedules, fetchClassSchedules, leaveSessionId, setLeaveSessionId, leaveReason, setLeaveReason, leaveProof, setLeaveProof, recognizeImageSrc, setRecognizeImageSrc, recognizeFile, setRecognizeFile, cameraRoom, setCameraRoom, detectionLogs, setDetectionLogs, useWebcam, setUseWebcam, webcamStream, setWebcamStream, activeChallenge, setActiveChallenge, challengePassed, setChallengePassed, challengePrompt, setChallengePrompt, currentFace, setCurrentFace, creditClasses, setCreditClasses, selectedClass, setSelectedClass, enrolledStudents, setEnrolledStudents, enrollMssv, setEnrollMssv, bulkClassCode, setBulkClassCode, studentClasses, setStudentClasses, adminCameras, setAdminCameras, simulatedLogs, setSimulatedLogs, schedules, setSchedules, availableClasses, setAvailableClasses, editingScheduleId, setEditingScheduleId, lecturersList, setLecturersList, ccLecturer, setCcLecturer, regModeTab, setRegModeTab, classSearch, setClassSearch, editDate, setEditDate, editRoom, setEditRoom, editTime, setEditTime, editingStudentId, setEditingStudentId, editStudentName, setEditStudentName, editStudentClass, setEditStudentClass, scheduleViewMode, setScheduleViewMode, registrationInfo, setRegistrationInfo, totalCredits, setTotalCredits, subSemester, setSubSemester, subPrereq, setSubPrereq, ccSemester, setCcSemester, ccYear, setCcYear, ccCapacity, setCcCapacity, ccCohort, setCcCohort, demoControls, setDemoControls, demoSaving, setDemoSaving, selectedWeekStart, setSelectedWeekStart, fileInputRef, imageRef, canvasRef, videoRef, regVideoRef, API_BASE, role, username, activeTab, startWebcam, stopWebcam, startRegWebcam, stopRegWebcam, captureRegPhoto, fetchRegistrationInfo, fetchDemoControls, handleDemoToggle, DEMO_TOGGLES, fetchAvailableClasses, handleRegisterCourse, handleUnregisterCourse, fetchSchedules, handleDeleteSchedule, handleUpdateSchedule, handleDeleteStudent, handleUpdateStudent, fetchLecturersList, fetchCreditClasses, fetchEnrolledStudents, handleEnrollStudent, handleUnenrollStudent, handleBulkEnroll, fetchStudentClasses, toggleCameraSimulation, fetchStudentsList, fetchManualClassStudents, handleQuickCheckin, fetchPendingFaces, fetchLeaveRequests, handleApproveFace, handleApproveLeave, handleRejectLeave, handleManualCheckinSubmit, fetchAttendanceReport, exportAttendanceReport, handleLeaveRequestSubmit, handleRefreshBiometrics, processImage, handleFileDrop, triggerRecognition, drawBoundingBoxes, resetRecognition, handleRegister, handleCreateSchedule, handleCreateSubject, handleCreateCreditClass, renderStudentsListTab, renderClassManagementTab, formatDate, getDaysOfWeek } = store;
  return (
    <>
            {role === 'giang_vien' && (
              <>

                {activeTab === 'manual_checkin' && (
                  <div>
                    <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0 0 10px 0" }}>Điểm danh nhanh lớp học phần</h4>
                    <div style={{ display: "flex", gap: "10px", marginBottom: "15px", alignItems: "flex-end" }}>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Mã lớp tín chỉ</label>
                        <select
                          style={{ ...styles.input, width: "220px" }}
                          value={manualClass}
                          onChange={(e) => { setManualClass(e.target.value); setManualSessionId(''); fetchClassSchedules(e.target.value); }}
                        >
                          <option value="">-- Chọn lớp tín chỉ --</option>
                          {creditClasses.map(c => (
                            <option key={c.class_id} value={c.class_id}>
                              {c.class_id} - {c.subject_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Buổi học (chọn từ lịch)</label>
                        <select
                          style={{ ...styles.input, width: "200px" }}
                          value={manualSessionId}
                          onChange={(e) => setManualSessionId(e.target.value)}
                        >
                          <option value="">-- Chọn buổi học --</option>
                          {classSchedules.map(s => (
                            <option key={s.schedule_id} value={s.schedule_id}>
                              #{s.schedule_id} - {s.study_date} {s.start_time} @ {s.room}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={fetchManualClassStudents}
                        disabled={manualLoading}
                        style={{ ...styles.btn, height: "40px" }}
                      >
                        {manualLoading ? "Đang tải..." : "Tải danh sách"}
                      </button>
                    </div>

                    {manualClassStudents.length > 0 ? (
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>MSSV / Họ Tên</th>
                            <th style={styles.th}>Lớp Base</th>
                            <th style={styles.th}>Điểm danh nhanh</th>
                          </tr>
                        </thead>
                        <tbody>
                          {manualClassStudents.map((st) => (
                            <tr key={st.mssv}>
                              <td style={styles.td}>
                                <strong>{st.ho_ten}</strong><br />
                                <small style={{ color: "#777" }}>{st.mssv}</small>
                              </td>
                              <td style={styles.td}>{st.lop_base}</td>
                              <td style={styles.td}>
                                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                  <button
                                    onClick={() => handleQuickCheckin(st.mssv, "Đúng giờ")}
                                    style={{ ...styles.btn, padding: "4px 8px", fontSize: "0.75rem", backgroundColor: "#10b981" }}
                                  >
                                    Đúng giờ
                                  </button>
                                  <button
                                    onClick={() => handleQuickCheckin(st.mssv, "Đi muộn")}
                                    style={{ ...styles.btn, padding: "4px 8px", fontSize: "0.75rem", backgroundColor: "#f59e0b" }}
                                  >
                                    Muộn
                                  </button>
                                  <button
                                    onClick={() => handleQuickCheckin(st.mssv, "Có phép")}
                                    style={{ ...styles.btn, padding: "4px 8px", fontSize: "0.75rem", backgroundColor: "#3b82f6" }}
                                  >
                                    Phép
                                  </button>
                                  <button
                                    onClick={() => handleQuickCheckin(st.mssv, "Vắng không phép")}
                                    style={{ ...styles.btn, padding: "4px 8px", fontSize: "0.75rem", backgroundColor: "#ef4444" }}
                                  >
                                    Vắng
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p style={{ fontSize: "0.8rem", color: "#6c8da3" }}>Vui lòng nhập mã lớp tín chỉ và chọn tải danh sách sinh viên lớp học để điểm danh nhanh.</p>
                    )}

                    <hr style={{ margin: "20px 0", borderColor: "#eef3f7" }} />

                    {/* Single Checkin Form Fallback */}
                    <form onSubmit={handleManualCheckinSubmit}>
                      <h5 style={{ color: "#54738c", fontSize: "0.8rem", margin: "0 0 10px 0" }}>Điểm danh thủ công bằng MSSV</h5>
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>MSSV</label>
                          <input
                            type="text"
                            required
                            placeholder="MSSV cần điểm danh"
                            style={styles.input}
                            value={manualMssv}
                            onChange={(e) => setManualMssv(e.target.value.toUpperCase())}
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Trạng thái</label>
                          <select
                            style={styles.input}
                            value={manualStatus}
                            onChange={(e) => setManualStatus(e.target.value)}
                          >
                            <option value="Đúng giờ">Đúng giờ</option>
                            <option value="Đi muộn">Đi muộn</option>
                            <option value="Có phép">Có phép</option>
                            <option value="Vắng không phép">Vắng không phép</option>
                          </select>
                        </div>
                        <button type="submit" style={{ ...styles.btn, alignSelf: "flex-end", height: "40px" }}>Cập nhật</button>
                      </div>
                    </form>
                  </div>
                )}

                {activeTab === 'leave_requests' && (
                  <div>
                    <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0 0 10px 0" }}>Đơn nghỉ phép học phần của sinh viên</h4>
                    {leaveRequests.length === 0 ? (
                      <p style={{ fontSize: "0.8rem", color: "#6c8da3" }}>Không có đơn xin nghỉ phép nào cần xử lý.</p>
                    ) : (
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>MSSV</th>
                            <th style={styles.th}>Buổi học</th>
                            <th style={styles.th}>Lý do</th>
                            <th style={styles.th}>Trạng thái</th>
                            <th style={styles.th}>Duyệt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaveRequests.map((l, i) => (
                            <tr key={i}>
                              <td style={styles.td}>
                                <strong>{l.ho_ten}</strong><br />
                                <small style={{ color: "#777" }}>{l.mssv}</small>
                              </td>
                              <td style={styles.td}>
                                <small>Lớp: {l.ma_lop_tc}</small><br />
                                <small>Ngày: {l.ngay_hoc}</small>
                              </td>
                              <td style={styles.td}>{l.ly_do}</td>
                              <td style={styles.td}>
                                <span style={{
                                  padding: "3px 6px",
                                  borderRadius: "4px",
                                  fontSize: "0.75rem",
                                  backgroundColor: l.trang_thai === 'Approved' ? "#e6f8f0" : l.trang_thai === 'Pending' ? "#fff7e6" : "#fdf0f0",
                                  color: l.trang_thai === 'Approved' ? "#10b981" : l.trang_thai === 'Pending' ? "#d48806" : "#ef4444"
                                }}>
                                  {l.trang_thai}
                                </span>
                              </td>
                              <td style={styles.td}>
                                {l.trang_thai === 'Pending' && (
                                  <div style={{ display: "flex", gap: "5px" }}>
                                    <button
                                      onClick={() => handleApproveLeave(l.id)}
                                      style={{ ...styles.btn, padding: "3px 6px", fontSize: "0.7rem", backgroundColor: "#10b981" }}
                                    >
                                      Duyệt
                                    </button>
                                    <button
                                      onClick={() => handleRejectLeave(l.id)}
                                      style={{ ...styles.btn, padding: "3px 6px", fontSize: "0.7rem", backgroundColor: "#ef4444" }}
                                    >
                                      Hủy
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {activeTab === 'summary_report' && (
                  <div>
                    <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0 0 10px 0" }}>Tổng kết Chuyên cần học kỳ & Cảnh báo Cấm thi</h4>
                    <div style={{ display: "flex", gap: "10px", marginBottom: "15px", alignItems: "flex-end" }}>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Chọn lớp tín chỉ giảng dạy</label>
                        <select
                          style={{ ...styles.input, width: "250px" }}
                          value={reportClass}
                          onChange={(e) => setReportClass(e.target.value)}
                        >
                          <option value="">-- Chọn lớp tín chỉ --</option>
                          {creditClasses.map(c => (
                            <option key={c.class_id} value={c.class_id}>
                              {c.class_id} - {c.subject_name}
                            </option>
                          ))}
                        </select>
                       </div>
                       <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                         <label style={{ fontSize: "0.8rem", color: "#54738c" }}>
                           Từ: <input type="date" value={reportFromDate} onChange={(e) => setReportFromDate(e.target.value)} style={{ ...styles.input, padding: "4px 8px" }} />
                         </label>
                         <label style={{ fontSize: "0.8rem", color: "#54738c" }}>
                           Đến: <input type="date" value={reportToDate} onChange={(e) => setReportToDate(e.target.value)} style={{ ...styles.input, padding: "4px 8px" }} />
                         </label>
                       </div>
                        <button onClick={fetchAttendanceReport} style={{ ...styles.btn, height: "38px" }}>Tổng kết lớp</button>
                       {attendanceReport.length > 0 && (
                         <button onClick={exportAttendanceReport} style={{ ...styles.btn, height: "38px", backgroundColor: "#10b981" }}>Xuất Excel</button>
                       )}
                      {role === 'admin' && (
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Giảng viên</label>
                          <select value={reportLecturer} onChange={(e) => setReportLecturer(e.target.value)} style={{ ...styles.input, width: "170px" }}>
                            <option value="">-- Tất cả GV --</option>
                            {lecturersList.map(l => <option key={l.lecturer_id} value={l.lecturer_id}>{l.lecturer_id} - {l.full_name}</option>)}
                          </select>
                        </div>
                      )}
                      <button onClick={fetchLecturerReport} style={{ ...styles.btn, height: "38px", backgroundColor: "#0284c7" }}>Tổng kết Giảng viên</button>
                      {lecturerReport && <button onClick={exportLecturerReport} style={{ ...styles.btn, height: "38px", backgroundColor: "#10b981" }}>Xuất Excel GV</button>}
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Môn học</label>
                        <select value={reportSubject} onChange={(e) => setReportSubject(e.target.value)} style={{ ...styles.input, width: "200px" }}>
                          <option value="">-- Chọn môn học --</option>
                          {subjectsList.map(s => <option key={s.subject_id} value={s.subject_id}>{s.subject_id} - {s.subject_name}</option>)}
                        </select>
                      </div>
                      <button onClick={fetchSubjectReport} style={{ ...styles.btn, height: "38px", backgroundColor: "#7c3aed" }}>Tổng kết Môn học</button>
                      {subjectReport && <button onClick={exportSubjectReport} style={{ ...styles.btn, height: "38px", backgroundColor: "#10b981" }}>Xuất Excel Môn</button>}
                    </div>

                    {(lecturerReport || subjectReport) && (
                      <input
                        type="text"
                        placeholder="🔍 Tìm MSSV / Họ tên / Lớp..."
                        value={reportSearch}
                        onChange={(e) => { setReportSearch(e.target.value); setReportPage(1); }}
                        style={{ ...styles.input, marginBottom: "12px", maxWidth: "320px" }}
                      />
                    )}

                    {lecturerReport && (
                      <div style={{ marginBottom: "20px" }}>
                        <h5 style={{ color: "#0284c7", margin: "10px 0 8px", fontSize: "0.85rem" }}>
                          📊 Báo cáo tổng kết Giảng viên {lecturerReport.lecturer_id} — {lecturerReport.tong_lop} lớp · {lecturerReport.tong_sv} SV · <span style={{ color: "#ef4444" }}>{lecturerReport.so_sv_cam_thi} cấm thi</span>
                        </h5>
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              <th style={styles.th}>Lớp TC</th>
                              <th style={styles.th}>Môn học</th>
                              <th style={styles.th}>Số SV</th>
                              <th style={styles.th}>Tổng buổi</th>
                              <th style={styles.th}>Có mặt</th>
                              <th style={styles.th}>Muộn</th>
                              <th style={styles.th}>Vắng KP</th>
                              <th style={styles.th}>Cấm thi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const q = reportSearch.toLowerCase();
                              const filtered = lecturerReport.classes.filter(c =>
                                !q || (c.ma_lop_tc + ' ' + c.subject_name).toLowerCase().includes(q));
                              const pageSize = 10;
                              const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
                              const page = Math.min(reportPage, pages);
                              return filtered.slice((page - 1) * pageSize, page * pageSize).map((c, i) => (
                              <tr key={i}>
                                <td style={styles.td}>{c.ma_lop_tc}</td>
                                <td style={styles.td}>{c.subject_name}</td>
                                <td style={styles.td}>{c.so_sv}</td>
                                <td style={styles.td}>{c.tong_buoi}</td>
                                <td style={styles.td}>{c.co_mat}</td>
                                <td style={styles.td}>{c.di_muon}</td>
                                <td style={styles.td}>{c.vang_kp}</td>
                                <td style={{ ...styles.td, color: c.so_cam_thi > 0 ? "#ef4444" : "#10b981", fontWeight: "600" }}>{c.so_cam_thi}</td>
                              </tr>
                              ));
                            })()}
                          </tbody>
                        </table>
                        {(() => {
                          const filtered = lecturerReport.classes.filter(c =>
                            !reportSearch.toLowerCase() || (c.ma_lop_tc + ' ' + c.subject_name).toLowerCase().includes(reportSearch.toLowerCase()));
                          const pages = Math.max(1, Math.ceil(filtered.length / 10));
                          return pages > 1 ? (
                            <div style={{ display: "flex", gap: "10px", alignItems: "center", justifyContent: "flex-end", marginTop: "8px" }}>
                              <button onClick={() => setReportPage(Math.max(1, reportPage - 1))} disabled={reportPage <= 1} style={{ ...styles.btn, padding: "3px 10px", fontSize: "0.75rem", backgroundColor: reportPage <= 1 ? "#cbd5e1" : "#1d92d1" }}>‹ Trước</button>
                              <span style={{ fontSize: "0.8rem", color: "#54738c" }}>{reportPage} / {pages}</span>
                              <button onClick={() => setReportPage(Math.min(pages, reportPage + 1))} disabled={reportPage >= pages} style={{ ...styles.btn, padding: "3px 10px", fontSize: "0.75rem", backgroundColor: reportPage >= pages ? "#cbd5e1" : "#1d92d1" }}>Sau ›</button>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}

                    {subjectReport && (
                      <div style={{ marginBottom: "20px" }}>
                        <h5 style={{ color: "#7c3aed", margin: "10px 0 8px", fontSize: "0.85rem" }}>
                          📊 Báo cáo tổng kết Môn học {subjectReport.subject_name} — {subjectReport.tong_lop} lớp · {subjectReport.tong_sv} SV · <span style={{ color: "#ef4444" }}>{subjectReport.so_sv_cam_thi} cấm thi</span>
                        </h5>
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              <th style={styles.th}>Lớp TC</th>
                              <th style={styles.th}>Giảng viên</th>
                              <th style={styles.th}>Số SV</th>
                              <th style={styles.th}>Tổng buổi</th>
                              <th style={styles.th}>Có mặt</th>
                              <th style={styles.th}>Muộn</th>
                              <th style={styles.th}>Vắng KP</th>
                              <th style={styles.th}>Cấm thi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const q = reportSearch.toLowerCase();
                              const filtered = subjectReport.classes.filter(c =>
                                !q || (c.ma_lop_tc + ' ' + c.lecturer_name).toLowerCase().includes(q));
                              const pageSize = 10;
                              const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
                              const page = Math.min(reportPage, pages);
                              return filtered.slice((page - 1) * pageSize, page * pageSize).map((c, i) => (
                              <tr key={i}>
                                <td style={styles.td}>{c.ma_lop_tc}</td>
                                <td style={styles.td}>{c.lecturer_name}</td>
                                <td style={styles.td}>{c.so_sv}</td>
                                <td style={styles.td}>{c.tong_buoi}</td>
                                <td style={styles.td}>{c.co_mat}</td>
                                <td style={styles.td}>{c.di_muon}</td>
                                <td style={styles.td}>{c.vang_kp}</td>
                                <td style={{ ...styles.td, color: c.so_cam_thi > 0 ? "#ef4444" : "#10b981", fontWeight: "600" }}>{c.so_cam_thi}</td>
                              </tr>
                              ));
                            })()}
                          </tbody>
                        </table>
                        {(() => {
                          const filtered = subjectReport.classes.filter(c =>
                            !reportSearch.toLowerCase() || (c.ma_lop_tc + ' ' + c.lecturer_name).toLowerCase().includes(reportSearch.toLowerCase()));
                          const pages = Math.max(1, Math.ceil(filtered.length / 10));
                          return pages > 1 ? (
                            <div style={{ display: "flex", gap: "10px", alignItems: "center", justifyContent: "flex-end", marginTop: "8px" }}>
                              <button onClick={() => setReportPage(Math.max(1, reportPage - 1))} disabled={reportPage <= 1} style={{ ...styles.btn, padding: "3px 10px", fontSize: "0.75rem", backgroundColor: reportPage <= 1 ? "#cbd5e1" : "#1d92d1" }}>‹ Trước</button>
                              <span style={{ fontSize: "0.8rem", color: "#54738c" }}>{reportPage} / {pages}</span>
                              <button onClick={() => setReportPage(Math.min(pages, reportPage + 1))} disabled={reportPage >= pages} style={{ ...styles.btn, padding: "3px 10px", fontSize: "0.75rem", backgroundColor: reportPage >= pages ? "#cbd5e1" : "#1d92d1" }}>Sau ›</button>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}

                    {attendanceReport.length > 0 && (
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>MSSV</th>
                            <th style={styles.th}>Họ Tên</th>
                            <th style={styles.th}>Tổng buổi</th>
                            <th style={styles.th}>Có mặt</th>
                            <th style={styles.th}>Muộn</th>
                            <th style={styles.th}>Vắng KP</th>
                            <th style={styles.th}>Vắng CP</th>
                            <th style={styles.th}>Chờ duyệt</th>
                            <th style={styles.th}>Điểm CC</th>
                            <th style={styles.th}>Tỷ lệ vắng</th>
                            <th style={styles.th}>Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceReport.map((student, idx) => {
                            const isBanned = student.trang_thai === "Cấm thi";
                            return (
                              <tr key={idx} style={{ backgroundColor: isBanned ? "#fff2f2" : "transparent" }}>
                                <td style={styles.td}>{student.mssv}</td>
                                <td style={styles.td}>
                                  <strong>{student.ho_ten}</strong>
                                </td>
                                <td style={styles.td}>{student.tong_buoi ?? "-"}</td>
                                <td style={styles.td}>{student.co_mat ?? "-"}</td>
                                <td style={styles.td}>{student.di_muon}</td>
                                <td style={styles.td}>{student.vang_kp}</td>
                                <td style={styles.td}>{student.co_phep}</td>
                                <td style={styles.td}>{student.cho_duyet ?? 0}</td>
                                <td style={{ ...styles.td, fontWeight: "bold" }}>{student.score}</td>
                                <td style={styles.td}>{student.ty_le_vang}%</td>
                                <td style={styles.td}>
                                  {isBanned ? (
                                    <span style={{ color: "#ef4444", fontWeight: "bold", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                                      <AlertOctagon size={12} /> Cấm thi
                                    </span>
                                  ) : (
                                    <span style={{ color: "#10b981", fontWeight: "600" }}>Hợp lệ</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
                {activeTab === 'students_list' && renderStudentsListTab()}
                {activeTab === 'class_management' && renderClassManagementTab()}
                {activeTab === 'teaching_schedule' && (
                  <div>
                    <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0 0 10px 0" }}>Lịch dạy chi tiết của Giảng viên</h4>
                    {schedules.length === 0 ? (
                      <p style={{ fontSize: "0.8rem", color: "#6c8da3" }}>Chưa có lịch dạy nào được xếp.</p>
                    ) : (
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Mã buổi</th>
                            <th style={styles.th}>Lớp tín chỉ</th>
                            <th style={styles.th}>Môn học</th>
                            <th style={styles.th}>Ngày dạy</th>
                            <th style={styles.th}>Phòng học</th>
                            <th style={styles.th}>Giờ bắt đầu</th>
                          </tr>
                        </thead>
                        <tbody>
                          {schedules.map((s, idx) => (
                            <tr key={idx}>
                              <td style={styles.td}><strong>Buổi {s.schedule_id}</strong></td>
                              <td style={styles.td}>{s.class_id}</td>
                              <td style={styles.td}><strong>{s.subject_name}</strong></td>
                              <td style={styles.td}>{s.study_date}</td>
                              <td style={styles.td}>
                                <span style={{ padding: "3px 6px", borderRadius: "4px", backgroundColor: "#f0f7fc", color: "#106fa6", fontSize: "0.75rem", fontWeight: "600" }}>
                                  🚪 {s.room}
                                </span>
                              </td>
                              <td style={styles.td}>{s.start_time}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </>
            )}
    </>
  );
};

export default LecturerTabs;
