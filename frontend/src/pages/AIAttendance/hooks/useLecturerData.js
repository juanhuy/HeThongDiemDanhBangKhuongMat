import { useEffect, useState } from 'react';
import { leaveService } from '../services/attendance/leaveService';
import { attendanceService } from '../services/attendance/attendanceService';

export const useLecturerData = (API_BASE, user) => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [attendanceReport, setAttendanceReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const [leaveData, reportData] = await Promise.all([
        leaveService.getLeaveRequests(API_BASE),
        attendanceService.getAttendanceLogs(API_BASE),
      ]);
      setLeaveRequests(leaveData?.leave_requests || leaveData || []);
      setAttendanceReport(reportData?.reports || reportData || []);
    } catch (err) {
      setError(err?.message || 'Không thể tải dữ liệu giảng viên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'giang_vien' || user?.role === 'lecturer') {
      refresh();
    }
  }, [API_BASE, user?.role]);

  const manualAttendance = async (formData) => {
    const response = await attendanceService.submitManualAttendance(API_BASE, formData);
    await refresh();
    return response;
  };

  const approveLeave = async (formData) => {
    const response = await leaveService.approveLeave(API_BASE, formData);
    await refresh();
    return response;
  };

  const rejectLeave = async (formData) => {
    const response = await leaveService.rejectLeave(API_BASE, formData);
    await refresh();
    return response;
  };

  return {
    leaveRequests,
    attendanceReport,
    loading,
    error,
    refresh,
    manualAttendance,
    approveLeave,
    rejectLeave,
  };
};
