import { useEffect, useState } from 'react';
import { subjectService } from '../../services/admin/subjectService';

export const useSubjects = (API_BASE) => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await subjectService.getSubjects(API_BASE);
      setSubjects(response?.subjects || response || []);
    } catch (err) {
      setError(err?.message || 'Không thể tải môn học');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [API_BASE]);

  const createSubject = async (payload) => {
    return subjectService.createSubject(API_BASE, payload);
  };

  const updateSubject = async (subjectId, payload) => {
    return subjectService.updateSubject(API_BASE, subjectId, payload);
  };

  const deleteSubject = async (subjectId) => {
    return subjectService.deleteSubject(API_BASE, subjectId);
  };

  return {
    subjects,
    loading,
    error,
    refresh,
    createSubject,
    updateSubject,
    deleteSubject,
  };
};
