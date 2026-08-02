import { useEffect, useState } from 'react';
import { faceService } from '../../services/admin/faceService';

export const usePendingFaces = (API_BASE) => {
  const [pendingFaces, setPendingFaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await faceService.getPendingFaces(API_BASE);
      setPendingFaces(response?.faces || response || []);
    } catch (err) {
      setError(err?.message || 'Không thể tải danh sách Face chờ duyệt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [API_BASE]);

  const approve = async (payload) => {
    return faceService.approveFace(API_BASE, payload);
  };

  const reject = async (payload) => {
    return faceService.rejectFace(API_BASE, payload);
  };

  return {
    pendingFaces,
    loading,
    error,
    refresh,
    approve,
    reject,
  };
};
