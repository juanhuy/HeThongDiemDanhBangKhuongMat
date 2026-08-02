import { useEffect, useState } from 'react';
import { reportService } from '../../services/attendance/reportService';

export const useAttendanceReport = (API_BASE) => {
  const [attendanceReport, setAttendanceReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await reportService.getAttendanceReport(API_BASE);
      setAttendanceReport(response?.reports || response || []);
    } catch (err) {
      setError(err?.message || 'Không thể tải báo cáo điểm danh');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [API_BASE]);

  return {
    attendanceReport,
    loading,
    error,
    refresh,
  };
};
