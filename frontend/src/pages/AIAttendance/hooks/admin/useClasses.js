import { useEffect, useState } from 'react';
import { classService } from '../../services/admin/classService';

export const useClasses = (API_BASE) => {
  const [creditClasses, setCreditClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await classService.getCreditClasses(API_BASE);
      setCreditClasses(response?.classes || response || []);
    } catch (err) {
      setError(err?.message || 'Không thể tải lớp tín chỉ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [API_BASE]);

  const createClass = async (payload) => {
    return classService.createClass(API_BASE, payload);
  };

  const updateClass = async (classId, payload) => {
    return classService.updateClass(API_BASE, classId, payload);
  };

  const deleteClass = async (classId) => {
    return classService.deleteClass(API_BASE, classId);
  };

  return {
    creditClasses,
    loading,
    error,
    refresh,
    createClass,
    updateClass,
    deleteClass,
  };
};
