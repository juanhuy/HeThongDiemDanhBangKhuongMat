import { useEffect, useState } from 'react';
import { studentService } from '../../services/student/studentService';

export const useStudentClasses = (API_BASE, user) => {
  const [myClasses, setMyClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    if (!user?.mssv) return;
    setLoading(true);
    setError('');

    try {
      const response = await studentService.getMyClasses(API_BASE, user.mssv);
      setMyClasses(response?.classes || response || []);
    } catch (err) {
      setError(err?.message || 'Không thể tải lớp học của sinh viên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [API_BASE, user?.mssv]);

  return {
    myClasses,
    loading,
    error,
    refresh,
  };
};
