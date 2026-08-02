import { useState } from 'react';
import { studentService } from '../../services/student/studentService';

export const useLeaveRequest = (API_BASE, user) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submitLeave = async (payload) => {
    setLoading(true);
    setError('');
    try {
      return await studentService.submitLeave(API_BASE, payload);
    } catch (err) {
      setError(err?.message || 'Không thể gửi yêu cầu nghỉ');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    submitLeave,
  };
};
