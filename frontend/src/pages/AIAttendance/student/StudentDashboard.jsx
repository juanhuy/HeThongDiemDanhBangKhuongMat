import React from 'react';
import '../styles/common.css';
import '../styles/student.css';
import MyClasses from './MyClasses';
import CourseRegistration from './CourseRegistration';
import SubmitLeave from './SubmitLeave';
import RefreshBiometrics from './RefreshBiometrics';

const StudentDashboard = ({ API_BASE, showToast, onAttendanceLogged, user, activeMenu }) => {
  const page = (() => {
    switch (activeMenu) {
      case 'my_classes':
        return <MyClasses API_BASE={API_BASE} showToast={showToast} user={user} />;
      case 'course_registration':
        return <CourseRegistration API_BASE={API_BASE} showToast={showToast} user={user} />;
      case 'submit_leave':
        return <SubmitLeave API_BASE={API_BASE} showToast={showToast} user={user} />;
      case 'refresh_biometrics':
        return <RefreshBiometrics API_BASE={API_BASE} showToast={showToast} user={user} />;
      default:
        return <MyClasses API_BASE={API_BASE} showToast={showToast} user={user} />;
    }
  })();

  return <div className="student-dashboard-shell">{page}</div>;
};

export default StudentDashboard;
