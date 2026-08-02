import { useEffect, useState } from 'react';
import { scheduleService } from '../../services/admin/scheduleService';

export const useSchedules = (API_BASE) => {
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
      setError(err?.message || 'Không thể tải lịch học');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [API_BASE]);

  const createSchedule = async (payload) => {
    return scheduleService.createSchedule(API_BASE, payload);
  };

  const updateSchedule = async (scheduleId, payload) => {
    return scheduleService.updateSchedule(API_BASE, scheduleId, payload);
  };

  const deleteSchedule = async (scheduleId) => {
    return scheduleService.deleteSchedule(API_BASE, scheduleId);
  };

  return {
    schedules,
    loading,
    error,
    refresh,
    createSchedule,
    updateSchedule,
    deleteSchedule,
  };
};
