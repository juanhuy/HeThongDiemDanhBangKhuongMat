import React, { useState, useEffect } from 'react';
import { useClasses } from '../hooks/admin/useClasses';
import { usePagination } from '../hooks/usePanigation';
import { subjectService } from '../services/admin/subjectService';
import { classService } from '../services/admin/classService';
import Pagination from '../../../components/Pagination';
import Modal from '../../../components/Modal';

const ClassManagement = ({ API_BASE, showToast, user }) => {
  const { creditClasses, loading, error, refresh } = useClasses(API_BASE);

  const [formData, setFormData] = useState({
    class_id: '',
    subject_id: '',
    teacher_id: '',
  });

  const [editingClass, setEditingClass] = useState(null);
  const [editSubjectId, setEditSubjectId] = useState('');
  const [editTeacherId, setEditTeacherId] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const {
    currentPage,
    totalPages,
    totalItems,
    currentItems: currentCreditClasses,
    searchTerm,
    setSearchTerm,
    setCurrentPage,
  } = usePagination(creditClasses, 5, [
    'class_id',
    'ma_lop_tc',
    'subject_name',
    'ten_mon',
    'teacher_name',
    'ten_gv',
    'teacher_id',
    'ma_gv',
  ]);

  useEffect(() => {
    const fetchSubjects = async () => {
      setLoadingSubjects(true);
      try {
        const data = await subjectService.getSubjects(API_BASE);
        setAvailableSubjects(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Lỗi khi tải danh sách môn học:', err);
        if (showToast) showToast('Không thể tải danh sách môn học', 'error');
      } finally {
        setLoadingSubjects(false);
      }
    };

    if (API_BASE) {
      fetchSubjects();
    }
  }, [API_BASE, showToast]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.class_id.trim() || !formData.subject_id || !formData.teacher_id.trim()) {
      if (showToast) showToast('Vui lòng điền đầy đủ thông tin!', 'warning');
      return;
    }

    const payload = {
      ma_lop_tc: formData.class_id.trim(),
      ma_mon: formData.subject_id,
      ma_gv: formData.teacher_id.trim(),
    };

    try {
      await classService.createClass(API_BASE, payload);
      setFormData({ class_id: '', subject_id: '', teacher_id: '' });
      if (showToast) showToast('Thêm lớp tín chỉ thành công!', 'success');
      refresh();
    } catch (err) {
      console.error('Lỗi khi thêm lớp tín chỉ:', err);
      if (showToast) showToast('Thêm lớp tín chỉ thất bại!', 'error');
    }
  };

  const handleOpenEdit = (classItem) => {
    const subjectId = classItem?.subject_id || classItem?.ma_mon || '';
    const teacherId = classItem?.teacher_id || classItem?.ma_gv || '';

    setEditingClass(classItem);
    setEditSubjectId(subjectId);
    setEditTeacherId(teacherId);
  };

  const handleCloseEdit = () => {
    setEditingClass(null);
    setEditSubjectId('');
    setEditTeacherId('');
  };

  const handleUpdateClass = async (e) => {
    e.preventDefault();
    const classId = editingClass?.class_id || editingClass?.ma_lop_tc || editingClass?.id;

    if (!editSubjectId || !editTeacherId.trim()) {
      if (showToast) showToast('Vui lòng điền đầy đủ thông tin!', 'warning');
      return;
    }

    setIsUpdating(true);

    const updatePayload = {
      ma_lop_tc: classId,
      ma_mon: editSubjectId,
      ma_gv: editTeacherId.trim(),
    };

    try {
      const updateMethod = classService.updateClass || classService.update;
      await updateMethod(API_BASE, classId, updatePayload);

      if (showToast) showToast(`Cập nhật thông tin lớp ${classId} thành công!`, 'success');
      handleCloseEdit();
      refresh();
    } catch (err) {
      console.error('Lỗi khi cập nhật lớp:', err);
      if (showToast) showToast('Cập nhật thông tin lớp thất bại!', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (classId) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa lớp tín chỉ ${classId}?`)) {
      try {
        await classService.deleteClass(API_BASE, classId);
        if (showToast) showToast('Xóa lớp tín chỉ thành công!', 'success');
        refresh();
      } catch (err) {
        console.error('Lỗi khi xóa lớp:', err);
        if (showToast) showToast('Xóa lớp tín chỉ thất bại!', 'error');
      }
    }
  };

  return (
    <section className="panel-card">
      <div className="panel-header">
        <h3>Tạo lớp tín chỉ</h3>
      </div>

      {loading && <p>Đang tải...</p>}
      {error && <p>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div className="form-grid compact">
          <label>
            Mã lớp tín chỉ
            <input
              type="text"
              name="class_id"
              value={formData.class_id}
              onChange={handleInputChange}
              placeholder="VD: INT1234_01"
            />
          </label>

          <label>
            Mã môn
            <select
              name="subject_id"
              value={formData.subject_id}
              onChange={handleInputChange}
              disabled={loadingSubjects}
            >
              <option value="">
                {loadingSubjects ? 'Đang tải môn học...' : '-- Chọn môn học --'}
              </option>
              {availableSubjects.map((subject) => (
                <option
                  key={subject.subject_id || subject.ma_mon}
                  value={subject.subject_id || subject.ma_mon}
                >
                  {subject.subject_id || subject.ma_mon} - {subject.subject_name || subject.ten_mon}
                </option>
              ))}
            </select>
          </label>

          <label>
            Mã giảng viên
            <input
              type="text"
              name="teacher_id"
              value={formData.teacher_id}
              onChange={handleInputChange}
              placeholder="VD: GV001"
            />
          </label>
        </div>

        <button type="submit" className="btn btn-primary" style={{ marginTop: '12px' }}>
          Thêm
        </button>
      </form>

      <hr className="divider" />

      <div className="list-stack">
        <div className="panel-header" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <h3>Danh sách lớp tín chỉ</h3>
          <button type="button" className="btn btn-primary" onClick={refresh}>
            Tải lại
          </button>
        </div>
        <div  className="search-box1">
            <input
              type="text"
              placeholder="Tìm mã lớp, môn, GV..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        <div>
          <table className="table-fit">
            <thead>
              <tr>
                <th>Mã lớp tín chỉ</th>
                <th>Môn học</th>
                <th>Giảng viên</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {currentCreditClasses.length === 0 ? (
                <tr>
                  <td>
                    {searchTerm ? 'Không tìm thấy lớp phù hợp' : 'Chưa có lớp tín chỉ nào'}
                  </td>
                </tr>
              ) : (
                currentCreditClasses.map((item) => {
                  const classId = item?.class_id || item?.ma_lop_tc || item?.id;
                  const subjectName = item?.subject_name || item?.ten_mon || item?.subject_id || item?.ma_mon || '—';
                  const teacherName = item?.lecturer_name || '—';

                  return (
                    <tr key={classId}>
                      <td><strong>{classId}</strong></td>
                      <td>{subjectName}</td>
                      <td>{teacherName}</td>
                      <td>
                        <div>
                          <button
                            type="button"
                            className="btn approve"
                            onClick={() => handleOpenEdit(item)}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="btn btn-reject"
                            onClick={() => handleDelete(classId)}
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <Modal
        isOpen={Boolean(editingClass)}
        onClose={handleCloseEdit}
        title="Sửa thông tin lớp tín chỉ"
      >
        <form onSubmit={handleUpdateClass}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label>
              Mã lớp tín chỉ (Cố định)
              <input
                type="text"
                value={editingClass?.class_id || editingClass?.ma_lop_tc || ''}
                disabled
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
            </label>

            <label>
              Môn học
              <select
                value={editSubjectId}
                onChange={(e) => setEditSubjectId(e.target.value)}
              >
                <option value="">-- Chọn môn học --</option>
                {availableSubjects.map((subject) => (
                  <option
                    key={subject.subject_id || subject.ma_mon}
                    value={subject.subject_id || subject.ma_mon}
                  >
                    {subject.subject_id || subject.ma_mon} - {subject.subject_name || subject.ten_mon}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Mã giảng viên phụ trách
              <input
                type="text"
                value={editTeacherId}
                onChange={(e) => setEditTeacherId(e.target.value)}
                placeholder="Nhập mã giảng viên..."
                required
              />
            </label>
          </div>

           <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'stretch' }}>
                <button
                    type="button"
                    className="btn btn-secondary" // Đổi từ approve sang btn-secondary cho chuẩn nút Hủy
                    onClick={handleCloseEdit}
                    disabled={isUpdating}
                    style={{ height: '100%', margin: 0 }} // Đảm bảo không dính margin thừa
                >
                    Hủy
                </button>

                <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={isUpdating}
                    style={{ height: '100%', margin: 0 }}
                >
                    {isUpdating ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
            </div>
        </form>
      </Modal>
    </section>
  );
};

export default ClassManagement;