import React from "react";
import { cardStyles as styles } from "../../styles/attendanceStyles";

export const AdminTabs = ({ store }) => {
  const { pendingFaces, setPendingFaces, regMssv, setRegMssv, regName, setRegName, regLop, setRegLop, regPhoto, setRegPhoto, regPhotoName, setRegPhotoName, regUseWebcam, setRegUseWebcam, regWebcamStream, setRegWebcamStream, regPreviewSrc, setRegPreviewSrc, schClass, setSchClass, schDate, setSchDate, schRoom, setSchRoom, schTime, setSchTime, subCode, setSubCode, subName, setSubName, subCredits, setSubCredits, ccCode, setCcCode, ccSub, setCcSub, leaveRequests, setLeaveRequests, manualMssv, setManualMssv, manualSessionId, setManualSessionId, manualStatus, setManualStatus, reportClass, setReportClass, attendanceReport, setAttendanceReport, studentsList, setStudentsList, searchKeyword, setSearchKeyword, filterClass, setFilterClass, manualClass, setManualClass, manualClassStudents, setManualClassStudents, manualLoading, setManualLoading, leaveSessionId, setLeaveSessionId, leaveReason, setLeaveReason, leaveProof, setLeaveProof, recognizeImageSrc, setRecognizeImageSrc, recognizeFile, setRecognizeFile, cameraRoom, setCameraRoom, detectionLogs, setDetectionLogs, useWebcam, setUseWebcam, webcamStream, setWebcamStream, activeChallenge, setActiveChallenge, challengePassed, setChallengePassed, challengePrompt, setChallengePrompt, currentFace, setCurrentFace, creditClasses, setCreditClasses, selectedClass, setSelectedClass, enrolledStudents, setEnrolledStudents, enrollMssv, setEnrollMssv, bulkClassCode, setBulkClassCode, studentClasses, setStudentClasses, adminCameras, setAdminCameras, simulatedLogs, setSimulatedLogs, schedules, setSchedules, availableClasses, setAvailableClasses, editingScheduleId, setEditingScheduleId, lecturersList, setLecturersList, ccLecturer, setCcLecturer, regModeTab, setRegModeTab, classSearch, setClassSearch, editDate, setEditDate, editRoom, setEditRoom, editTime, setEditTime, editingStudentId, setEditingStudentId, editStudentName, setEditStudentName, editStudentClass, setEditStudentClass, scheduleViewMode, setScheduleViewMode, registrationInfo, setRegistrationInfo, totalCredits, setTotalCredits, subSemester, setSubSemester, subPrereq, setSubPrereq, ccSemester, setCcSemester, ccYear, setCcYear, ccCapacity, setCcCapacity, ccCohort, setCcCohort, demoControls, setDemoControls, demoSaving, setDemoSaving, selectedWeekStart, setSelectedWeekStart, fileInputRef, imageRef, canvasRef, videoRef, regVideoRef, API_BASE, role, username, activeTab, startWebcam, stopWebcam, startRegWebcam, stopRegWebcam, captureRegPhoto, fetchRegistrationInfo, fetchDemoControls, handleDemoToggle, DEMO_TOGGLES, fetchAvailableClasses, handleRegisterCourse, handleUnregisterCourse, fetchSchedules, handleDeleteSchedule, handleUpdateSchedule, handleDeleteStudent, handleUpdateStudent, fetchLecturersList, fetchCreditClasses, fetchEnrolledStudents, handleEnrollStudent, handleUnenrollStudent, handleBulkEnroll, fetchStudentClasses, toggleCameraSimulation, fetchStudentsList, fetchManualClassStudents, handleQuickCheckin, fetchPendingFaces, fetchLeaveRequests, handleApproveFace, handleApproveLeave, handleRejectLeave, handleManualCheckinSubmit, fetchAttendanceReport, exportAttendanceReport, handleLeaveRequestSubmit, handleRefreshBiometrics, processImage, handleFileDrop, triggerRecognition, drawBoundingBoxes, resetRecognition, handleRegister, handleCreateSchedule, handleCreateSubject, handleCreateCreditClass, renderStudentsListTab, renderClassManagementTab, formatDate, getDaysOfWeek, newLecturerId, setNewLecturerId, newLecturerName, setNewLecturerName, newLecturerEmail, setNewLecturerEmail, newLecturerDept, setNewLecturerDept, editingLecturerId, setEditingLecturerId, editLecturerName, setEditLecturerName, editLecturerEmail, setEditLecturerEmail, editLecturerDept, setEditLecturerDept, subjectsList, setSubjectsList, editingSubjectId, setEditingSubjectId, editSubjectName, setEditSubjectName, editSubjectCredits, setEditSubjectCredits, editSubjectSemester, setEditSubjectSemester, editSubjectPrereq, setEditSubjectPrereq, editingClassId, setEditingClassId, editClassLecturer, setEditClassLecturer, editClassCapacity, setEditClassCapacity, editClassSemester, setEditClassSemester, editClassCohort, setEditClassCohort, editClassStatus, setEditClassStatus, myLeaveRequests, setMyLeaveRequests, classSchedules, setClassSchedules, fetchSubjectsList, fetchMyLeaveRequests, fetchClassSchedules, handleCreateLecturer, handleUpdateLecturer, handleDeleteLecturer, handleUpdateSubject, handleDeleteSubject, handleUpdateClass, handleDeleteClass } = store;
  return (
    <>
            {role === 'admin' && (
              <>

                {activeTab === 'pending_faces' && (
                  <div>
                    <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0 0 10px 0" }}>Hồ sơ ảnh khuôn mặt đang chờ hậu kiểm</h4>
                    {pendingFaces.length === 0 ? (
                      <p style={{ fontSize: "0.8rem", color: "#6c8da3" }}>Hiện không có hồ sơ khuôn mặt nào cần duyệt.</p>
                    ) : (
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>MSSV</th>
                            <th style={styles.th}>Họ Tên</th>
                            <th style={styles.th}>Lớp</th>
                            <th style={styles.th}>Hành động</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingFaces.map((f, i) => (
                            <tr key={i}>
                              <td style={styles.td}>{f.mssv}</td>
                              <td style={styles.td}>{f.ho_ten}</td>
                              <td style={styles.td}>{f.lop_base}</td>
                              <td style={styles.td}>
                                <button
                                  onClick={() => handleApproveFace(f.mssv)}
                                  style={{ ...styles.btn, padding: "4px 8px", fontSize: "0.75rem" }}
                                >
                                  Duyệt ảnh
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {activeTab === 'attendance' && (
                  <form onSubmit={handleRegister}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>MSSV</label>
                      <input
                        type="text"
                        required
                        style={styles.input}
                        value={regMssv}
                        onChange={(e) => setRegMssv(e.target.value.toUpperCase())}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Họ tên sinh viên</label>
                      <input
                        type="text"
                        required
                        style={styles.input}
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Lớp chuyên ngành</label>
                      <input
                        type="text"
                        required
                        style={styles.input}
                        value={regLop}
                        onChange={(e) => setRegLop(e.target.value)}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Ảnh đại diện / Ảnh gốc chụp thẻ SV</label>
                      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                        <input
                          type="file"
                          accept="image/*"
                          id="reg-photo-file-ptit-admin"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            if (e.target.files.length > 0) {
                              setRegPhoto(e.target.files[0]);
                              setRegPhotoName(e.target.files[0].name);
                              setRegPreviewSrc(URL.createObjectURL(e.target.files[0]));
                              stopRegWebcam();
                            }
                          }}
                        />
                        <button
                          type="button"
                          style={{ ...styles.btn, ...styles.btnSecondary, padding: "8px 14px", fontSize: "0.8rem" }}
                          onClick={() => document.getElementById("reg-photo-file-ptit-admin").click()}
                        >
                          Chọn file ảnh gốc
                        </button>
                        <button
                          type="button"
                          style={{
                            ...styles.btn,
                            ...(regUseWebcam ? { backgroundColor: "#ef4444" } : styles.btnSecondary),
                            padding: "8px 14px",
                            fontSize: "0.8rem"
                          }}
                          onClick={() => { if (regUseWebcam) { stopRegWebcam(); } else { startRegWebcam(); } }}
                        >
                          {regUseWebcam ? "Tắt Camera" : "Chụp từ Camera"}
                        </button>
                      </div>

                      {regUseWebcam && (
                        <div style={{
                          position: "relative",
                          width: "320px",
                          height: "240px",
                          borderRadius: "8px",
                          overflow: "hidden",
                          border: "2px solid #1d92d1",
                          marginBottom: "10px"
                        }}>
                          <video
                            ref={regVideoRef}
                            autoPlay
                            playsInline
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                          <button
                            type="button"
                            onClick={captureRegPhoto}
                            style={{
                              position: "absolute",
                              bottom: "10px",
                              left: "50%",
                              transform: "translateX(-50%)",
                              backgroundColor: "#10b981",
                              color: "#fff",
                              border: "none",
                              borderRadius: "20px",
                              padding: "6px 16px",
                              fontSize: "0.8rem",
                              fontWeight: "bold",
                              cursor: "pointer",
                              boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
                            }}
                          >
                            📸 Chụp hình
                          </button>
                        </div>
                      )}

                      {regPreviewSrc && (
                        <div style={{ marginBottom: "10px" }}>
                          <span style={{ fontSize: "0.75rem", color: "#54738c", display: "block", marginBottom: "4px" }}>Ảnh xem trước:</span>
                          <img
                            src={regPreviewSrc}
                            alt="Registration Preview"
                            style={{ width: "150px", height: "150px", borderRadius: "8px", objectFit: "cover", border: "1px solid #d0e0eb" }}
                          />
                        </div>
                      )}

                      {regPhotoName && (
                        <div style={{ fontSize: "0.75rem", color: "#10b981", marginTop: "4px" }}>
                          ✓ {regPhotoName}
                        </div>
                      )}
                    </div>
                    <button type="submit" style={{ ...styles.btn, width: "100%", marginTop: "10px" }}>Đăng ký (Chờ duyệt)</button>
                  </form>
                )}

                {activeTab === 'schedule' && (
                  <div>
                    <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0 0 10px 0" }}>Quản lý Lịch Học Phần & Buổi Học</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px", marginBottom: "20px" }}>

                      {/* Left: Create Form */}
                      <div style={{ background: "#f8fbfd", border: "1px solid #d0e0eb", borderRadius: "8px", padding: "12px" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#106fa6", display: "block", marginBottom: "10px" }}>Thêm lịch học mới</span>
                        <form onSubmit={handleCreateSchedule}>
                          <div style={styles.formGroup}>
                            <label style={styles.label}>Chọn lớp tín chỉ (Môn học)</label>
                            <select
                              required
                              style={styles.input}
                              value={schClass}
                              onChange={(e) => setSchClass(e.target.value)}
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
                            <label style={styles.label}>Ngày học</label>
                            <input
                              type="date"
                              required
                              style={styles.input}
                              value={schDate}
                              onChange={(e) => setSchDate(e.target.value)}
                            />
                          </div>
                          <div style={styles.formGroup}>
                            <label style={styles.label}>Phòng học</label>
                            <input
                              type="text"
                              required
                              style={styles.input}
                              value={schRoom}
                              onChange={(e) => setSchRoom(e.target.value)}
                            />
                          </div>
                          <div style={styles.formGroup}>
                            <label style={styles.label}>Giờ bắt đầu</label>
                            <input
                              type="time"
                              required
                              style={styles.input}
                              value={schTime}
                              onChange={(e) => setSchTime(e.target.value)}
                            />
                          </div>
                          <button type="submit" style={{ ...styles.btn, width: "100%", marginTop: "10px", padding: "8px", fontSize: "0.8rem" }}>Thêm buổi học</button>
                        </form>
                      </div>

                      {/* Right: List of Schedules with Edit / Delete */}
                      <div style={{ background: "#ffffff", border: "1px solid #d0e0eb", borderRadius: "8px", padding: "12px" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#106fa6", display: "block", marginBottom: "10px" }}>Danh sách buổi học hệ thống</span>

                        {schedules.length === 0 ? (
                          <p style={{ fontSize: "0.75rem", color: "#6c8da3" }}>Chưa có buổi học nào.</p>
                        ) : (
                          <div style={{ overflowY: "auto", maxHeight: "380px" }}>
                            <table style={styles.table}>
                              <thead>
                                <tr>
                                  <th style={styles.th}>Buổi</th>
                                  <th style={styles.th}>Lớp tín chỉ</th>
                                  <th style={styles.th}>Thông tin học</th>
                                  <th style={styles.th}>Hành động</th>
                                </tr>
                              </thead>
                              <tbody>
                                {schedules.map((s) => (
                                  <tr key={s.schedule_id}>
                                    <td style={styles.td}><strong>#{s.schedule_id}</strong></td>
                                    <td style={styles.td}>
                                      <strong>{s.class_id}</strong><br />
                                      <small style={{ color: "#777" }}>{s.subject_name}</small>
                                    </td>
                                    <td style={styles.td}>
                                      {editingScheduleId === s.schedule_id ? (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                          <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} style={{ ...styles.input, padding: "2px 4px", fontSize: "0.75rem" }} />
                                          <input type="text" value={editRoom} onChange={(e) => setEditRoom(e.target.value)} style={{ ...styles.input, padding: "2px 4px", fontSize: "0.75rem" }} />
                                          <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} style={{ ...styles.input, padding: "2px 4px", fontSize: "0.75rem" }} />
                                        </div>
                                      ) : (
                                        <div>
                                          📅 {s.study_date}<br />
                                          🚪 {s.room} | ⏰ {s.start_time}
                                        </div>
                                      )}
                                    </td>
                                    <td style={styles.td}>
                                      {editingScheduleId === s.schedule_id ? (
                                        <div style={{ display: "flex", gap: "4px" }}>
                                          <button onClick={(e) => handleUpdateSchedule(e, s.schedule_id)} style={{ ...styles.btn, padding: "2px 6px", fontSize: "0.7rem", backgroundColor: "#10b981" }}>Lưu</button>
                                          <button onClick={() => setEditingScheduleId(null)} style={{ ...styles.btn, padding: "2px 6px", fontSize: "0.7rem", backgroundColor: "#6b7280" }}>Hủy</button>
                                        </div>
                                      ) : (
                                        <div style={{ display: "flex", gap: "4px" }}>
                                          <button
                                            onClick={() => {
                                              setEditingScheduleId(s.schedule_id);
                                              setEditDate(s.study_date);
                                              setEditRoom(s.room);
                                              setEditTime(s.start_time.substring(0, 5));
                                            }}
                                            style={{ ...styles.btn, padding: "2px 6px", fontSize: "0.7rem", backgroundColor: "#f59e0b" }}
                                          >
                                            Sửa
                                          </button>
                                          <button
                                            onClick={() => handleDeleteSchedule(s.schedule_id)}
                                            style={{ ...styles.btn, padding: "2px 6px", fontSize: "0.7rem", backgroundColor: "#ef4444" }}
                                          >
                                            Xóa
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'structure' && (
                  <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                    {/* Form tạo môn học */}
                    <div style={{ background: "#f8fbfd", border: "1px solid #d0e0eb", borderRadius: "8px", padding: "15px" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#106fa6", display: "block", marginBottom: "12px" }}>Tạo môn học gốc</span>
                      <form onSubmit={handleCreateSubject}>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Mã môn học</label>
                          <input
                            type="text"
                            placeholder="Mã môn (VD: INT1306)"
                            required
                            style={styles.input}
                            value={subCode}
                            onChange={(e) => setSubCode(e.target.value.toUpperCase())}
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Tên môn học</label>
                          <input
                            type="text"
                            placeholder="Tên môn học"
                            required
                            style={styles.input}
                            value={subName}
                            onChange={(e) => setSubName(e.target.value)}
                          />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                          <div style={styles.formGroup}>
                            <label style={styles.label}>Học kỳ dự kiến</label>
                            <input
                              type="number"
                              min="1"
                              max="16"
                              placeholder="VD: 1, 2..."
                              style={styles.input}
                              value={subSemester}
                              onChange={(e) => setSubSemester(e.target.value)}
                            />
                          </div>
                          <div style={styles.formGroup}>
                            <label style={styles.label}>Số tín chỉ</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="VD: 3"
                              style={styles.input}
                              value={subCredits}
                              onChange={(e) => setSubCredits(e.target.value)}
                            />
                          </div>
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Môn tiên quyết (mã môn, phân tách bằng dấu phẩy)</label>
                          <input
                            type="text"
                            placeholder="VD: INT1152, INT1032"
                            style={styles.input}
                            value={subPrereq}
                            onChange={(e) => setSubPrereq(e.target.value.toUpperCase())}
                          />
                        </div>
                        <button type="submit" style={{ ...styles.btn, width: "100%", marginTop: "10px" }}>Tạo môn học</button>
                      </form>
                    </div>

                    {/* Form tạo lớp tín chỉ */}
                    <div style={{ background: "#f8fbfd", border: "1px solid #d0e0eb", borderRadius: "8px", padding: "15px" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#106fa6", display: "block", marginBottom: "12px" }}>Tạo lớp học phần (Tín chỉ)</span>
                      <form onSubmit={handleCreateCreditClass}>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Mã lớp tín chỉ</label>
                          <input
                            type="text"
                            placeholder="Mã lớp (VD: D22CQCNPM02-N)"
                            required
                            style={styles.input}
                            value={ccCode}
                            onChange={(e) => setCcCode(e.target.value.toUpperCase())}
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Môn học liên kết</label>
                          <input
                            type="text"
                            placeholder="Mã môn học liên kết (VD: INT1306)"
                            required
                            style={styles.input}
                            value={ccSub}
                            onChange={(e) => setCcSub(e.target.value.toUpperCase())}
                          />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                          <div style={styles.formGroup}>
                            <label style={styles.label}>Học kỳ</label>
                            <input
                              type="number"
                              min="1"
                              max="16"
                              placeholder="VD: 1, 2..."
                              style={styles.input}
                              value={ccSemester}
                              onChange={(e) => setCcSemester(e.target.value)}
                            />
                          </div>
                          <div style={styles.formGroup}>
                            <label style={styles.label}>Niên khóa học</label>
                            <input
                              type="text"
                              placeholder="VD: 2025-2026"
                              style={styles.input}
                              value={ccYear}
                              onChange={(e) => setCcYear(e.target.value)}
                            />
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                          <div style={styles.formGroup}>
                            <label style={styles.label}>Sĩ số tối đa</label>
                            <input
                              type="number"
                              min="1"
                              style={styles.input}
                              value={ccCapacity}
                              onChange={(e) => setCcCapacity(e.target.value)}
                            />
                          </div>
                          <div style={styles.formGroup}>
                            <label style={styles.label}>Khóa học (VD: D22)</label>
                            <input
                              type="text"
                              placeholder="VD: D22"
                              style={styles.input}
                              value={ccCohort}
                              onChange={(e) => setCcCohort(e.target.value.toUpperCase())}
                            />
                          </div>
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Phân công Giảng viên dạy</label>
                          <select
                            style={styles.input}
                            value={ccLecturer}
                            onChange={(e) => setCcLecturer(e.target.value)}
                          >
                            <option value="">-- Không phân công / Tự do --</option>
                            {lecturersList.map(l => (
                              <option key={l.lecturer_id} value={l.lecturer_id}>
                                {l.lecturer_id} - {l.full_name} ({l.department || "Khoa CNTT"})
                              </option>
                            ))}
                          </select>
                        </div>
                        <button type="submit" style={{ ...styles.btn, width: "100%", marginTop: "10px", backgroundColor: "#0284c7" }}>Tạo lớp tín chỉ</button>
                      </form>
                    </div>
                  </div>

                  <div style={{ gridColumn: "1 / -1", background: "#f8fbfd", border: "1px solid #d0e0eb", borderRadius: "8px", padding: "15px" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#106fa6", display: "block", marginBottom: "10px" }}>Danh sách môn học gốc</span>
                    {subjectsList.length === 0 ? (
                      <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Chưa có môn học nào.</span>
                    ) : (
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Mã môn</th>
                            <th style={styles.th}>Tên môn</th>
                            <th style={styles.th}>Số tín chỉ</th>
                            <th style={styles.th}>Học kỳ</th>
                            <th style={styles.th}>Tiên quyết</th>
                            <th style={styles.th}>Hành động</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subjectsList.map((s) => (
                            <tr key={s.subject_id}>
                              <td style={styles.td}><strong>{s.subject_id}</strong></td>
                              <td style={styles.td}>
                                {editingSubjectId === s.subject_id ? (
                                  <input type="text" value={editSubjectName} onChange={(e) => setEditSubjectName(e.target.value)} style={{ ...styles.input, padding: "2px 6px", fontSize: "0.8rem" }} />
                                ) : s.subject_name}
                              </td>
                              <td style={styles.td}>
                                {editingSubjectId === s.subject_id ? (
                                  <input type="number" min="0" value={editSubjectCredits} onChange={(e) => setEditSubjectCredits(e.target.value)} style={{ ...styles.input, padding: "2px 6px", fontSize: "0.8rem", width: "70px" }} />
                                ) : s.credits}
                              </td>
                              <td style={styles.td}>
                                {editingSubjectId === s.subject_id ? (
                                  <input type="number" min="1" max="16" value={editSubjectSemester} onChange={(e) => setEditSubjectSemester(e.target.value)} style={{ ...styles.input, padding: "2px 6px", fontSize: "0.8rem", width: "60px" }} />
                                ) : (s.semester || "-")}
                              </td>
                              <td style={styles.td}>
                                {editingSubjectId === s.subject_id ? (
                                  <input type="text" value={editSubjectPrereq} onChange={(e) => setEditSubjectPrereq(e.target.value)} style={{ ...styles.input, padding: "2px 6px", fontSize: "0.8rem" }} />
                                ) : (s.prerequisites || "-")}
                              </td>
                              <td style={styles.td}>
                                {editingSubjectId === s.subject_id ? (
                                  <div style={{ display: "flex", gap: "4px" }}>
                                    <button onClick={(e) => handleUpdateSubject(e, s.subject_id)} style={{ ...styles.btn, padding: "3px 6px", fontSize: "0.75rem", backgroundColor: "#10b981" }}>Lưu</button>
                                    <button onClick={() => setEditingSubjectId(null)} style={{ ...styles.btn, padding: "3px 6px", fontSize: "0.75rem", backgroundColor: "#6b7280" }}>Hủy</button>
                                  </div>
                                ) : (
                                  <div style={{ display: "flex", gap: "4px" }}>
                                    <button onClick={() => { setEditingSubjectId(s.subject_id); setEditSubjectName(s.subject_name || ""); setEditSubjectCredits(s.credits ?? ""); setEditSubjectSemester(s.semester ?? ""); setEditSubjectPrereq(s.prerequisites || ""); }} style={{ ...styles.btn, padding: "3px 6px", fontSize: "0.75rem", backgroundColor: "#f59e0b" }}>Sửa</button>
                                    <button onClick={() => handleDeleteSubject(s.subject_id)} style={{ ...styles.btn, padding: "3px 6px", fontSize: "0.75rem", backgroundColor: "#ef4444" }}>Xóa</button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  </>
                )}
                 {activeTab === 'students_list' && renderStudentsListTab()}

                {activeTab === 'lecturers' && (
                  <div>
                    <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0 0 12px 0" }}>Quản lý Giảng viên</h4>

                    <form onSubmit={handleCreateLecturer} style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", background: "#f8fbfd", border: "1px solid #d0e0eb", borderRadius: "8px", padding: "12px", marginBottom: "16px" }}>
                      <input type="text" placeholder="Mã GV (VD: GV010)" value={newLecturerId} onChange={(e) => setNewLecturerId(e.target.value.toUpperCase())} required style={{ ...styles.input, width: "120px" }} />
                      <input type="text" placeholder="Họ và tên" value={newLecturerName} onChange={(e) => setNewLecturerName(e.target.value)} required style={{ ...styles.input, width: "180px" }} />
                      <input type="email" placeholder="Email" value={newLecturerEmail} onChange={(e) => setNewLecturerEmail(e.target.value)} style={{ ...styles.input, width: "200px" }} />
                      <input type="text" placeholder="Bộ môn" value={newLecturerDept} onChange={(e) => setNewLecturerDept(e.target.value)} style={{ ...styles.input, width: "160px" }} />
                      <button type="submit" style={styles.btn}>+ Thêm giảng viên</button>
                    </form>

                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Mã GV</th>
                          <th style={styles.th}>Họ và Tên</th>
                          <th style={styles.th}>Email</th>
                          <th style={styles.th}>Bộ môn</th>
                          <th style={styles.th}>Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lecturersList.map((l) => (
                          <tr key={l.lecturer_id}>
                            <td style={styles.td}><strong>{l.lecturer_id}</strong></td>
                            <td style={styles.td}>
                              {editingLecturerId === l.lecturer_id ? (
                                <input type="text" value={editLecturerName} onChange={(e) => setEditLecturerName(e.target.value)} style={{ ...styles.input, padding: "2px 6px", fontSize: "0.8rem" }} />
                              ) : l.full_name}
                            </td>
                            <td style={styles.td}>
                              {editingLecturerId === l.lecturer_id ? (
                                <input type="text" value={editLecturerEmail} onChange={(e) => setEditLecturerEmail(e.target.value)} style={{ ...styles.input, padding: "2px 6px", fontSize: "0.8rem" }} />
                              ) : (l.email || "-")}
                            </td>
                            <td style={styles.td}>
                              {editingLecturerId === l.lecturer_id ? (
                                <input type="text" value={editLecturerDept} onChange={(e) => setEditLecturerDept(e.target.value)} style={{ ...styles.input, padding: "2px 6px", fontSize: "0.8rem" }} />
                              ) : (l.department || "-")}
                            </td>
                            <td style={styles.td}>
                              {editingLecturerId === l.lecturer_id ? (
                                <div style={{ display: "flex", gap: "4px" }}>
                                  <button onClick={(e) => handleUpdateLecturer(e, l.lecturer_id)} style={{ ...styles.btn, padding: "3px 6px", fontSize: "0.75rem", backgroundColor: "#10b981" }}>Lưu</button>
                                  <button onClick={() => setEditingLecturerId(null)} style={{ ...styles.btn, padding: "3px 6px", fontSize: "0.75rem", backgroundColor: "#6b7280" }}>Hủy</button>
                                </div>
                              ) : (
                                <div style={{ display: "flex", gap: "4px" }}>
                                  <button onClick={() => { setEditingLecturerId(l.lecturer_id); setEditLecturerName(l.full_name || ""); setEditLecturerEmail(l.email || ""); setEditLecturerDept(l.department || ""); }} style={{ ...styles.btn, padding: "3px 6px", fontSize: "0.75rem", backgroundColor: "#f59e0b" }}>Sửa</button>
                                  <button onClick={() => handleDeleteLecturer(l.lecturer_id)} style={{ ...styles.btn, padding: "3px 6px", fontSize: "0.75rem", backgroundColor: "#ef4444" }}>Xóa</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                        {lecturersList.length === 0 && (
                          <tr><td colSpan="5" style={{ ...styles.td, textAlign: "center", color: "#94a3b8" }}>Chưa có giảng viên nào.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'demo' && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                      <h4 style={{ color: "#106fa6", fontSize: "0.9rem", margin: "0" }}>Bảng điều khiển DEMO</h4>
                      {demoSaving && <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Đang lưu...</span>}
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "#6c8da3", margin: "0 0 14px 0" }}>
                      Dùng để "nới" các quy tắc đăng ký ngay trong lúc demo với thầy cô. Các lựa chọn được lưu
                      hệ thống và áp dụng ngay, không cần khởi động lại server.
                    </p>

                    {!demoControls ? (
                      <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Đang tải cài đặt...</p>
                    ) : (
                      <div style={{ background: "#ffffff", border: "1px solid #d0e0eb", borderRadius: "10px", padding: "15px" }}>
                        {DEMO_TOGGLES.map(t => (
                          <div key={t.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                            <div>
                              <div style={{ fontWeight: "600", fontSize: "0.82rem", color: "#1e293b" }}>{t.label}</div>
                              <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{t.hint}</div>
                            </div>
                            <button
                              onClick={() => handleDemoToggle(t.key, !demoControls[t.key])}
                              style={{
                                width: 46, height: 26, borderRadius: 999, border: "none", cursor: "pointer", flexShrink: 0,
                                background: demoControls[t.key] ? (t.key === 'demo_mode' ? "#e11d48" : "#10b981") : "#cbd5e1",
                                position: "relative", transition: "background 0.2s"
                              }}
                              aria-label={t.label}
                            >
                              <span style={{
                                position: "absolute", top: 3, width: 20, height: 20, borderRadius: 999,
                                background: "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                                left: demoControls[t.key] ? 23 : 3, transition: "left 0.2s"
                              }} />
                            </button>
                          </div>
                        ))}

                        <div style={{ marginTop: "14px", fontSize: "0.78rem", color: "#106fa6", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "6px", padding: "8px 10px" }}>
                          💡 Mẹo: Tắt hết các công tắc để demo "đúng quy định", bật từng cái để trình diễn
                          hệ thống vẫn <b>vận hành linh hoạt</b> khi cần.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'class_management' && renderClassManagementTab()}
              </>
            )}
    </>
  );
};

export default AdminTabs;
