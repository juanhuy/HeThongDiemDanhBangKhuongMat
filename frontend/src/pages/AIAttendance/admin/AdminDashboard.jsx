import React from 'react';
import '../styles/common.css';
import '../styles/admin.css';
import StudentManagement from './StudentManagement';
import SubjectManagement from './SubjectManagement';
import ClassManagement from './ClassManagement';
import ScheduleManagement from './ScheduleManagement';

const AdminDashboard = ({ API_BASE, showToast, onAttendanceLogged, user, activeMenu }) => {
  const page = (() => {
    switch (activeMenu) {
      case 'pending_faces':
      case 'students_list':
      case 'attendance':
        return (
          <StudentManagement
            API_BASE={API_BASE}
            showToast={showToast}
            onAttendanceLogged={onAttendanceLogged}
            user={user}
            activeMenu={activeMenu}
          />
        );
      case 'structure':
        return <SubjectManagement API_BASE={API_BASE} showToast={showToast} user={user} />;
      case 'class_management':
        return <ClassManagement API_BASE={API_BASE} showToast={showToast} user={user} />;
      case 'schedule':
        return <ScheduleManagement API_BASE={API_BASE} showToast={showToast} user={user} />;
      default:
        return <StudentManagement API_BASE={API_BASE} showToast={showToast} onAttendanceLogged={onAttendanceLogged} user={user} activeMenu="students_list" />;
    }
  })();

  return <div className="admin-grid">{page}</div>;
};

export default AdminDashboard;
