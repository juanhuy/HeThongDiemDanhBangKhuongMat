import React, { useState } from 'react';
import { useSubjects } from '../hooks/admin/useSubjects';
import { usePagination } from '../../../pages/AIAttendance/hooks/usePanigation';
import Pagination from '../../../components/Pagination';
import Modal from '../../../components/Modal';

const SubjectManagement = ({ API_BASE, showToast, user }) => {
  const { subjects, loading, error, refresh, createSubject, updateSubject, deleteSubject } = useSubjects(API_BASE);

  const [formData, setFormData] = useState({ 
    subject_id: '', 
    subject_name: '',
    credits: '' 
  });
  const { subject_id, subject_name, credits } = formData;

  const [editingSubject, setEditingSubject] = useState(null);
  const [editFormData, setEditFormData] = useState({
    subject_name: '',
    credits: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const {
    currentPage,
    totalPages,
    totalItems,
    currentItems: currentSubjects,
    searchTerm,
    setSearchTerm,
    setCurrentPage,
  } = usePagination(subjects, 5, ['subject_id', 'ma_mon', 'subject_name', 'ten_mon']);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    if (!subject_id.trim() || !subject_name.trim() || credits === '') {
      if (showToast) showToast('Vui lòng nhập đầy đủ mã môn, tên môn và số tín chỉ!', 'warning');
      return;
    }

    const payload = {
      subject_id: subject_id.trim(),
      subject_name: subject_name.trim(),
      credits: Number(credits)
    };

    try {
      await createSubject(payload);
      setFormData({ subject_id: '', subject_name: '', credits: '' });
      if (showToast) showToast('Thêm môn học thành công!', 'success');
      refresh();
    } catch (err) {
      if (showToast) showToast('Thêm môn học thất bại!', 'error');
    }
  };

  const handleOpenEdit = (subject) => {
    setEditingSubject(subject);
    setEditFormData({
      subject_name: subject?.subject_name || subject?.ten_mon || '',
      credits: subject?.credits ?? subject?.so_tc ?? ''
    });
  };

  const handleCloseEdit = () => {
    setEditingSubject(null);
    setEditFormData({ subject_name: '', credits: '' });
  };

  const handleUpdateSubject = async (e) => {
    e.preventDefault();
    const id = editingSubject?.subject_id || editingSubject?.ma_mon;

    if (!editFormData.subject_name.trim() || editFormData.credits === '') {
      if (showToast) showToast('Vui lòng điền đầy đủ thông tin!', 'warning');
      return;
    }

    setIsUpdating(true);
    const payload = {
      subject_id: id,
      subject_name: editFormData.subject_name.trim(),
      credits: Number(editFormData.credits)
    };

    try {
      if (updateSubject) {
        await updateSubject(id, payload);
      }
      if (showToast) showToast(`Cập nhật môn học ${id} thành công!`, 'success');
      handleCloseEdit();
      refresh();
    } catch (err) {
      console.error('Lỗi cập nhật môn học:', err);
      if (showToast) showToast('Cập nhật môn học thất bại!', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa môn học ${id}?`)) {
      try {
        await deleteSubject(id);
        if (showToast) showToast('Xóa môn học thành công!', 'success');
        refresh();
      } catch (err) {
        if (showToast) showToast('Xóa môn học thất bại!', 'error');
      }
    }
  };

  return (
    <section className="panel-card">
      {loading && <p>Đang tải...</p>}
      {error && <p>{error}</p>}

      <div className="panel-header">
        <h3>Thêm môn học</h3>
      </div>
      <form onSubmit={handleCreateSubject}>
        <div className="form-grid compact">
          <label>
            Mã môn
            <input
              type="text"
              name="subject_id"
              value={subject_id}
              onChange={handleInputChange}
              placeholder="VD: INT1234"
            />
          </label>

          <label>
            Tên môn
            <input
              type="text"
              name="subject_name"
              value={subject_name}
              onChange={handleInputChange}
              placeholder="VD: Xử lý ảnh"
            />
          </label>

          <label style={{ width: '100px' }}>
            Số tín chỉ
            <input
              type="number"
              name="credits"
              min="1"
              max="20"
              value={credits}
              onChange={handleInputChange}
              placeholder="VD: 3"
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
          <h3>Quản lý môn học</h3>
          <button type="button" className="btn btn-primary" onClick={refresh}>
            Tải lại
          </button>
        </div>
        <div className="search-box1">
            <input
              type="text"
              placeholder="Tìm theo mã hoặc tên môn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '6px 12px', fontSize: '14px' }}
            />
        </div>

        <div>
          <table className="table-fix">
            <thead>
              <tr>
                <th>Mã môn</th>
                <th>Tên môn</th>
                <th>Số tín chỉ</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {currentSubjects.length === 0 ? (
                <tr>
                  <td>
                    {searchTerm ? 'Không tìm thấy môn học phù hợp' : 'Chưa có môn học nào'}
                  </td>
                </tr>
              ) : (
                currentSubjects.map((item) => {
                  const id = item?.subject_id || item?.ma_mon;
                  const name = item?.subject_name || item?.ten_mon;
                  const creditVal = item?.credits ?? item?.so_tc;

                  return (
                    <tr key={id}>
                      <td><strong>{id || '—'}</strong></td>
                      <td>{name || '—'}</td>
                      <td>{creditVal ?? '—'}</td>
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
                            onClick={() => handleDelete(id)}
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

          {/* Reusable Pagination Component */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Reusable Modal Component */}
      <Modal
        isOpen={Boolean(editingSubject)}
        onClose={handleCloseEdit}
        title="Sửa thông tin môn học"
      >
        <form onSubmit={handleUpdateSubject}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label>
              Mã môn (Cố định)
              <input
                type="text"
                value={editingSubject?.subject_id || editingSubject?.ma_mon || ''}
                disabled
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
            </label>

            <label>
              Tên môn
              <input
                type="text"
                name="subject_name"
                value={editFormData.subject_name}
                onChange={handleEditInputChange}
                placeholder="Nhập tên môn học..."
                required
              />
            </label>

            <label>
              Số tín chỉ
              <input
                type="number"
                name="credits"
                min="1"
                max="20"
                value={editFormData.credits}
                onChange={handleEditInputChange}
                placeholder="Nhập số tín chỉ..."
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

export default SubjectManagement;