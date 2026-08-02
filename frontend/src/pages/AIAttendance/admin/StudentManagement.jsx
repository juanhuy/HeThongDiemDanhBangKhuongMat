import React from 'react';
import StudentList from './StudentList';
import StudentRegistration from './StudentRegistration';
import PendingFaceList from './PendingFaceList';

const StudentManagement = ({ API_BASE, showToast, onAttendanceLogged, user, activeMenu }) => {
  const activeTab = activeMenu;

  switch (activeTab) {
    case 'pending_faces':
      return <PendingFaceList API_BASE={API_BASE} showToast={showToast} user={user} />;
    case 'attendance':
      return <StudentRegistration API_BASE={API_BASE} showToast={showToast} user={user} />;
    case 'students_list':
      return <StudentList API_BASE={API_BASE} showToast={showToast} user={user} />;
    default:
      return <StudentList API_BASE={API_BASE} showToast={showToast} user={user} />;
  }
};

export default StudentManagement;
