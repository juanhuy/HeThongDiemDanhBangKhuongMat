import { useState } from 'react';
import { attendanceService } from '../../services/attendance/attendanceService';

export const useManualAttendance = (API_BASE) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const manualAttendance = async (payload) => {
    setLoading(true);
    setError('');
    try {
      return await attendanceService.submitManualAttendance(API_BASE, payload);
    } catch (err) {
      setError(err?.message || 'Không thể điểm danh thủ công');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    manualAttendance,
  };
};
