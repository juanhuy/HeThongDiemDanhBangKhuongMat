import { useEffect, useState } from 'react';
import { studentService } from '../../services/student/studentService';

export const useCourseRegistration = (API_BASE, user) => {
  const [availableClasses, setAvailableClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await studentService.getAvailableClasses(API_BASE);
      setAvailableClasses(response?.classes || response || []);
    } catch (err) {
      setError(err?.message || 'Không thể tải lớp mở');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [API_BASE]);

  const register = async (payload) => {
    return studentService.registerClass(API_BASE, payload);
  };

  return {
    availableClasses,
    loading,
    error,
    refresh,
    register,
  };
};
