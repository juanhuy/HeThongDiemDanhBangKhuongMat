import { useEffect, useState } from 'react';
import { studentService } from '../../services/admin/studentService';

export const useStudents = (API_BASE) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await studentService.listStudents(API_BASE);
      setStudents(response?.students || response || []);
    } catch (err) {
      setError(err?.message || 'Không thể tải danh sách sinh viên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [API_BASE]);

  const createStudent = async (payload) => {
    return studentService.createStudent(API_BASE, payload);
  };

  const updateStudent = async (studentId, payload) => {
    return studentService.updateStudent(API_BASE, studentId, payload);
  };

  const deleteStudent = async (studentId) => {
    return studentService.deleteStudent(API_BASE, studentId);
  };

  return {
    students,
    loading,
    error,
    refresh,
    createStudent,
    updateStudent,
    deleteStudent,
  };
};
