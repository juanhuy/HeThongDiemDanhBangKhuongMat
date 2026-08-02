import { useEffect, useState } from 'react';
import { scheduleService } from '../../services/admin/scheduleService';

export const useTeachingSchedule = (API_BASE) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await scheduleService.getSchedules(API_BASE);
      setSchedules(response?.schedules || response || []);
    } catch (err) {
      setError(err?.message || 'Không thể tải lịch dạy');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [API_BASE]);

  return {
    schedules,
    loading,
    error,
    refresh,
  };
};
