import { useEffect, useState } from 'react';
import { leaveService } from '../../services/attendance/leaveService';

export const useLeaveRequests = (API_BASE) => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await leaveService.getLeaveRequests(API_BASE);
      setLeaveRequests(response?.leave_requests || response || []);
    } catch (err) {
      setError(err?.message || 'Không thể tải yêu cầu nghỉ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [API_BASE]);

  const approve = async (payload) => {
    return leaveService.approveLeave(API_BASE, payload);
  };

  const reject = async (payload) => {
    return leaveService.rejectLeave(API_BASE, payload);
  };

  return {
    leaveRequests,
    loading,
    error,
    refresh,
    approve,
    reject,
  };
};
