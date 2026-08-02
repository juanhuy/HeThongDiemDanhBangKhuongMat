import { useEffect, useState } from 'react';
import { studentService as adminStudentService } from '../services/admin/studentService';
import { faceService } from '../services/admin/faceService';
import { subjectService } from '../services/admin/subjectService';
import { classService } from '../services/admin/classService';
import { scheduleService } from '../services/admin/scheduleService';

export const useAdminData = (API_BASE, user) => {
  const [students, setStudents] = useState([]);
  const [pendingFaces, setPendingFaces] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [creditClasses, setCreditClasses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const [studentList, faceList, subjectList, classList, scheduleList] = await Promise.all([
        adminStudentService.listStudents(API_BASE),
        faceService.getPendingFaces(API_BASE),
        subjectService.getSubjects(API_BASE),
        classService.getCreditClasses(API_BASE),
        scheduleService.getSchedules(API_BASE),
      ]);

      setStudents(studentList?.students || studentList || []);
      setPendingFaces(faceList?.faces || faceList || []);
      setSubjects(subjectList?.subjects || subjectList || []);
      setCreditClasses(classList?.classes || classList || []);
      setSchedules(scheduleList?.schedules || scheduleList || []);
    } catch (err) {
      setError(err?.message || 'Không thể tải dữ liệu admin');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      refresh();
    }
  }, [API_BASE, user?.role]);

  const createStudent = async (formData) => {
    const response = await fetch(`${API_BASE}/api/register`, {
      method: 'POST',
      body: formData,
    });
    await refresh();
    return response;
  };

  const deleteStudent = async (studentId) => {
    const response = await adminStudentService.deleteStudent(API_BASE, studentId);
    await refresh();
    return response;
  };

  const updateStudent = async (studentId, payload) => {
    const response = await adminStudentService.updateStudent(API_BASE, studentId, payload);
    await refresh();
    return response;
  };

  return {
    students,
    pendingFaces,
    subjects,
    creditClasses,
    schedules,
    loading,
    error,
    refresh,
    createStudent,
    updateStudent,
    deleteStudent,
  };
};
