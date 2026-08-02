import { useEffect, useState } from 'react';
import { studentService } from '../services/student/studentService';

export const useStudentData = (API_BASE, user) => {
  const [myClasses, setMyClasses] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    if (!user?.mssv) return;
    setLoading(true);
    setError('');
    try {
      const [classesData, availableData] = await Promise.all([
        studentService.getMyClasses(API_BASE, user.mssv),
        studentService.getAvailableClasses(API_BASE),
      ]);
      setMyClasses(classesData?.classes || classesData || []);
      setAvailableClasses(availableData?.classes || availableData || []);
    } catch (err) {
      setError(err?.message || 'Không thể tải dữ liệu sinh viên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'sinh_vien' || user?.role === 'student') {
      refresh();
    }
  }, [API_BASE, user?.mssv, user?.role]);

  const registerClass = async (formData) => {
    const response = await studentService.registerClass(API_BASE, formData);
    await refresh();
    return response;
  };

  const submitLeave = async (formData) => {
    const response = await studentService.submitLeave(API_BASE, formData);
    await refresh();
    return response;
  };

  return {
    myClasses,
    availableClasses,
    loading,
    error,
    refresh,
    registerClass,
    submitLeave,
  };
};
