import React from 'react';
import '../styles/common.css';
import '../styles/lecturer.css';
import ManualAttendance from './ManualAttendance';
import LeaveRequest from './LeaveRequest';
import AttendanceReport from './AttendanceReport';
import TeachingSchedule from './TeachingSchedule';

const LecturerDashboard = ({ API_BASE, showToast, onAttendanceLogged, user, activeMenu }) => {
  const page = (() => {
    switch (activeMenu) {
      case 'manual_checkin':
        return <ManualAttendance API_BASE={API_BASE} showToast={showToast} user={user} />;
      case 'leave_requests':
        return <LeaveRequest API_BASE={API_BASE} showToast={showToast} user={user} />;
      case 'summary_report':
        return <AttendanceReport API_BASE={API_BASE} showToast={showToast} user={user} />;
      case 'teaching_schedule':
        return <TeachingSchedule API_BASE={API_BASE} showToast={showToast} user={user} />;
      default:
        return <ManualAttendance API_BASE={API_BASE} showToast={showToast} user={user} />;
    }
  })();

  return <div className="lecturer-grid">{page}</div>;
};

export default LecturerDashboard;
