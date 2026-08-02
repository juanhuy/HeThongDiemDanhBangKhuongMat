import React from 'react';
import AdminDashboard from './admin/AdminDashboard';
import LecturerDashboard from './lecturer/LecturerDashboard';
import StudentDashboard from './student/StudentDashboard';

const normalizeRole = (role = 'sinh_vien') => {
  const lower = String(role).toLowerCase();
  if (lower === 'student') return 'sinh_vien';
  if (lower === 'lecturer') return 'giang_vien';
  return lower;
};

const AIAttendance = ({ API_BASE, showToast, onAttendanceLogged, user, activeMenu }) => {
  const role = normalizeRole(user?.role);

  if (role === 'admin') {
    return <AdminDashboard API_BASE={API_BASE} showToast={showToast} onAttendanceLogged={onAttendanceLogged} user={user} activeMenu={activeMenu} />;
  }

  if (role === 'giang_vien') {
    return <LecturerDashboard API_BASE={API_BASE} showToast={showToast} onAttendanceLogged={onAttendanceLogged} user={user} activeMenu={activeMenu} />;
  }

  return <StudentDashboard API_BASE={API_BASE} showToast={showToast} onAttendanceLogged={onAttendanceLogged} user={user} activeMenu={activeMenu} />;
};

export default AIAttendance;
