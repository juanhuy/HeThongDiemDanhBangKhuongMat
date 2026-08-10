import { apiFetch, formBody } from "./client";

/** Danh sách lớp tín chỉ (filter optional) */
export const listCreditClasses = (params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ""))
  ).toString();
  return apiFetch(`/api/credit-classes${qs ? `?${qs}` : ""}`);
};

/** Chi tiết 1 lớp */
export const getCreditClass = (classId) =>
  apiFetch(`/api/credit-classes/${classId}`);

/** Tạo hàng loạt (wizard) */
export const batchCreateCreditClasses = (payload) =>
  apiFetch("/api/credit-classes/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

export const importCreditClasses = (formData) =>
  apiFetch("/api/credit-classes/import/csv", {
    method: "POST",
    body: formData,
  });

/** Cập nhật lớp */
export const updateCreditClass = (classId, body) =>
  apiFetch(`/api/credit-classes/${classId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
/** Xóa lớp */
export const deleteCreditClass = (classId) =>
  apiFetch(`/api/credit-classes/${classId}`, { method: "DELETE" });

/** Preview tự sinh nhóm */
export const previewGroups = (body) =>
  apiFetch("/api/credit-classes/preview-groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// Các hàm API mới hỗ trợ tính năng:
export const updateCreditClassStatus = (classId, status) => 
  apiFetch(`/api/credit-classes/${classId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
});

export const updateBulkCreditClassStatus = (classIds, status) =>
  apiFetch(`/api/credit-classes/bulk-status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ class_ids: classIds, status })
});

export const listLecturers = () => {
  return apiFetch(`/api/admin/lecturers`); 
};

// API lấy dữ liệu cho Dropdown Filter
export const listSemesters = () => apiFetch("/api/semesters");
export const listAdministrativeClasses = () => apiFetch("/api/administrative-classes");
export const listMajors = () => apiFetch("/api/majors-list");


// API cho đăng ký học phần sinh viên
export const listOpenCreditClasses = () =>
  apiFetch("/api/lop_tin_chi");

export const getStudentCreditClasses = (studentId) =>
  apiFetch(`/api/students/${studentId}/classes`);

export const enrollStudent = (classId, studentId) =>
  apiFetch("/api/sinh_vien_lop_tin_chi", {
    method: "POST",
    body: formBody({ ma_lop_tc: classId, mssv: studentId }),
  });

export const unenrollStudent = (classId, studentId) =>
  apiFetch(`/api/sinh_vien_lop_tin_chi/${classId}/${studentId}`, {
    method: "DELETE",
  });

export const getClassStudents = (classId) =>
  apiFetch(`/api/credit-classes/${classId}/students`);