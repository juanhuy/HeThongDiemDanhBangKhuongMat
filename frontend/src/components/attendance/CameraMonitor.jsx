import React from "react";
import { Camera, StopCircle } from "lucide-react";
import { cardStyles as styles } from "../../styles/attendanceStyles";
import AuthImage from "../AuthImage";

export const CameraMonitor = ({ store }) => {
  const { pendingFaces, setPendingFaces, regMssv, setRegMssv, regName, setRegName, regLop, setRegLop, regPhoto, setRegPhoto, regPhotoName, setRegPhotoName, regUseWebcam, setRegUseWebcam, regWebcamStream, setRegWebcamStream, regPreviewSrc, setRegPreviewSrc, schClass, setSchClass, schDate, setSchDate, schRoom, setSchRoom, schTime, setSchTime, subCode, setSubCode, subName, setSubName, subCredits, setSubCredits, ccCode, setCcCode, ccSub, setCcSub, leaveRequests, setLeaveRequests, manualMssv, setManualMssv, manualSessionId, setManualSessionId, manualStatus, setManualStatus, reportClass, setReportClass, attendanceReport, setAttendanceReport, studentsList, setStudentsList, searchKeyword, setSearchKeyword, filterClass, setFilterClass, manualClass, setManualClass, manualClassStudents, setManualClassStudents, manualLoading, setManualLoading, leaveSessionId, setLeaveSessionId, leaveReason, setLeaveReason, leaveProof, setLeaveProof, recognizeImageSrc, setRecognizeImageSrc, recognizeFile, setRecognizeFile, cameraRoom, setCameraRoom, detectionLogs, setDetectionLogs, useWebcam, setUseWebcam, webcamStream, setWebcamStream, activeChallenge, setActiveChallenge, challengePassed, setChallengePassed, challengePrompt, setChallengePrompt, currentFace, setCurrentFace, creditClasses, setCreditClasses, selectedClass, setSelectedClass, enrolledStudents, setEnrolledStudents, enrollMssv, setEnrollMssv, bulkClassCode, setBulkClassCode, studentClasses, setStudentClasses, adminCameras, setAdminCameras, simulatedLogs, setSimulatedLogs, schedules, setSchedules, availableClasses, setAvailableClasses, editingScheduleId, setEditingScheduleId, lecturersList, setLecturersList, ccLecturer, setCcLecturer, regModeTab, setRegModeTab, classSearch, setClassSearch, editDate, setEditDate, editRoom, setEditRoom, editTime, setEditTime, editingStudentId, setEditingStudentId, editStudentName, setEditStudentName, editStudentClass, setEditStudentClass, scheduleViewMode, setScheduleViewMode, registrationInfo, setRegistrationInfo, totalCredits, setTotalCredits, subSemester, setSubSemester, subPrereq, setSubPrereq, ccSemester, setCcSemester, ccYear, setCcYear, ccCapacity, setCcCapacity, ccCohort, setCcCohort, demoControls, setDemoControls, demoSaving, setDemoSaving, selectedWeekStart, setSelectedWeekStart, fileInputRef, imageRef, canvasRef, videoRef, regVideoRef, API_BASE, role, username, activeTab, startWebcam, stopWebcam, startRegWebcam, stopRegWebcam, captureRegPhoto, fetchRegistrationInfo, fetchDemoControls, handleDemoToggle, DEMO_TOGGLES, fetchAvailableClasses, handleRegisterCourse, handleUnregisterCourse, fetchSchedules, handleDeleteSchedule, handleUpdateSchedule, handleDeleteStudent, handleUpdateStudent, fetchLecturersList, fetchCreditClasses, fetchEnrolledStudents, handleEnrollStudent, handleUnenrollStudent, handleBulkEnroll, fetchStudentClasses, toggleCameraSimulation, fetchStudentsList, fetchManualClassStudents, handleQuickCheckin, fetchPendingFaces, fetchLeaveRequests, handleApproveFace, handleApproveLeave, handleRejectLeave, handleManualCheckinSubmit, fetchAttendanceReport, exportAttendanceReport, handleLeaveRequestSubmit, handleRefreshBiometrics, processImage, handleFileDrop, triggerRecognition, drawBoundingBoxes, resetRecognition, handleRegister, handleCreateSchedule, handleCreateSubject, handleCreateCreditClass, renderStudentsListTab, renderClassManagementTab, formatDate, getDaysOfWeek } = store;
  return (
    <>
          {role === 'admin' && activeTab === 'camera_dashboard' && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#54738c" }}>Camera tại phòng:</span>
                <input
                  style={{ ...styles.input, padding: "4px 8px", width: "100px" }}
                  value={cameraRoom}
                  onChange={(e) => setCameraRoom(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => { if (useWebcam) { stopWebcam(); } else { startWebcam(); } }}
                  style={{
                    ...styles.btn,
                    ...(!useWebcam ? styles.btnSecondary : { backgroundColor: "#ef4444" }),
                    padding: "6px 12px",
                    fontSize: "0.8rem",
                    flex: 1
                  }}
                >
                  {useWebcam ? (
                    <>
                      <StopCircle size={14} /> Tắt Camera
                    </>
                  ) : (
                    <>
                      <Camera size={14} /> Mở Camera
                    </>
                  )}
                </button>
              </div>

              <div
                style={{ ...styles.dropzone, cursor: "default" }}
              >
                {useWebcam ? (
                  <div style={{ ...styles.previewWrapper, width: "100%", height: "100%", position: "relative" }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      style={{ ...styles.previewImage, width: "100%", height: "100%", objectFit: "cover" }}
                      onLoadedMetadata={() => {
                        if (canvasRef.current && videoRef.current) {
                          canvasRef.current.width = videoRef.current.clientWidth || 640;
                          canvasRef.current.height = videoRef.current.clientHeight || 480;
                        }
                      }}
                    />
                    <canvas ref={canvasRef} style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      pointerEvents: "none"
                    }}></canvas>
                    {challengePrompt && (
                      <div style={{
                        position: "absolute",
                        bottom: "20px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        backgroundColor: challengePassed ? "rgba(16, 185, 129, 0.9)" : "rgba(239, 68, 68, 0.9)",
                        color: "white",
                        padding: "12px 24px",
                        borderRadius: "8px",
                        fontSize: "1.1rem",
                        fontWeight: "bold",
                        boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
                        zIndex: 10,
                        whiteSpace: "nowrap",
                        animation: challengePassed ? "pulse 2s infinite" : "none"
                      }}>
                        {challengePrompt}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ ...styles.dropzonePrompt, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", height: "300px" }}>
                    <Camera size={48} color="#94a3b8" />
                    <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "#64748b", margin: 0 }}>
                      Camera đang tắt
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0 }}>Nhấn "Mở Camera" để bắt đầu nhận diện và điểm danh tự động</p>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => { stopWebcam(); resetRecognition(); }}
                  className="btn btn-secondary"
                  style={{ ...styles.btn, ...styles.btnSecondary, width: "100%" }}
                >
                  Làm mới
                </button>
              </div>

              {detectionLogs.length > 0 && (
                <div style={{ background: "#f8fbfd", padding: "12px", borderRadius: "8px", border: "1px solid #d0e0eb" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#106fa6", display: "block", marginBottom: "8px" }}>
                    Kết quả kiểm tra luồng khuôn mặt:
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {detectionLogs.map((l, idx) => (
                      <div key={idx} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "8px",
                        borderRadius: "6px",
                        background: "#ffffff",
                        border: "1px solid #e2edf5"
                      }}>
                        {l.is_known ? (
                          <>
                            <AuthImage
                              API_BASE={API_BASE}
                              filename={`${l.mssv}.jpg`}
                              alt={l.fullname}
                              fallback={(l.fullname || "?").charAt(0).toUpperCase()}
                            />
                            <div style={{ fontSize: "0.8rem", color: "#2a3d4a" }}>
                              <div style={{ fontWeight: "700", color: "#10b981" }}>✓ {l.fullname} ({l.mssv})</div>
                              <div style={{ fontSize: "0.75rem", color: "#54738c" }}>Lớp: {l.lop_base}</div>
                              <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#106fa6" }}>
                                Trạng thái: {l.trang_thai}
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{
                              width: "45px",
                              height: "45px",
                              borderRadius: "50%",
                              background: "#fee2e2",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: "2px solid #ef4444"
                            }}>
                              <span style={{ color: "#ef4444", fontWeight: "bold", fontSize: "1.2rem" }}>?</span>
                            </div>
                            <div style={{ fontSize: "0.8rem", color: "#ef4444", fontWeight: "600" }}>
                              ✗ Không thể điểm danh: Khuôn mặt lạ.
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
    </>
  );
};

export default CameraMonitor;
