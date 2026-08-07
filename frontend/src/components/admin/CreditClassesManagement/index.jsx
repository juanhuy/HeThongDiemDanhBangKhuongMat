import React, { useState, useEffect } from 'react';
import { Plus, Settings, BookOpen, CheckSquare } from 'lucide-react';
import { 
  listCreditClasses, 
  deleteCreditClass, 
  updateCreditClassStatus, 
  updateBulkCreditClassStatus,
  listSemesters, 
  listAdministrativeClasses, 
  listMajors, 
  listLecturers
} from '../../../api/creditClasses';

import FilterSection from './FilterSection';
import DataTable from './DataTable';
import EditClassModal from './EditClassModal';

const CreditClassesManagement = ({ showToast }) => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]); // Chứa danh sách lớp đang được tick

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  
  // Dữ liệu cho bộ lọc
  const [metaData, setMetaData] = useState({ semesters: [], adminClasses: [], majors: [], lecturers: [] });
  const [filters, setFilters] = useState({
    semester_id: '', major_id: '', administrative_class_id: '', subject_id: '', status: ''
  });

  // Tải dữ liệu Metadata lúc mới vào trang
  useEffect(() => {
    Promise.all([listSemesters(), listAdministrativeClasses(), listMajors(), listLecturers()]).then(([semRes, adminRes, majRes, lectRes]) => {
      const semesters = semRes?.data || [];
      setMetaData({
        semesters: semesters,
        adminClasses: adminRes?.data || [],
        majors: majRes?.data || [],
        lecturers: lectRes?.data?.map(l => ({ value: l.lecturer_id, label: l.full_name })) || []
      });
      // Gán kỳ gần nhất làm mặc định
      if (semesters.length > 0) setFilters(f => ({ ...f, semester_id: semesters[0].semester_id }));
    }).catch(err => console.error(err));
  }, []);

  const fetchClasses = async () => {
    if (!filters.semester_id) return; // Chờ có học kỳ rồi mới gọi
    setLoading(true);
    try {
      const cleanFilters = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''));
      const response = await listCreditClasses(cleanFilters);
      const rawClasses = Array.isArray(response?.data) ? response.data : [];
      
      const theoryClasses = rawClasses.filter(c => !c.parent_class_id);
      const practiceClasses = rawClasses.filter(c => c.parent_class_id);
      const displayClasses = [];

      theoryClasses.forEach(tc => {
        const children = practiceClasses.filter(pc => pc.parent_class_id === tc.class_id);
        const gNum = String(tc.group_number || tc.class_group || '1').padStart(2, '0');
        if (children.length > 0) {
          children.forEach((pc, idx) => {
            const sgNum = String(pc.sub_group_number || (idx + 1)).padStart(2, '0');
            displayClasses.push({
              ...pc, theory_class: tc, display_group: `${gNum}-${sgNum}`,
              target_classes_display: (pc.target_classes?.length > 0) ? pc.target_classes : tc.target_classes
            });
          });
        } else {
          displayClasses.push({ ...tc, display_group: gNum, target_classes_display: tc.target_classes });
        }
      });
      setClasses(displayClasses);
      setSelectedIds([]); // Reset select khi load lại dữ liệu
    } catch (error) {
      setClasses([]); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClasses(); }, [filters]);

  const handleFilterChange = (name, value) => setFilters(prev => ({ ...prev, [name]: value }));

  // Cập nhật trạng thái 1 lớp trực tiếp trên bảng
  const handleStatusChange = async (classId, newStatus) => {
    try {
      await updateCreditClassStatus(classId, newStatus);
      showToast('Cập nhật trạng thái thành công', 'success');
      fetchClasses();
    } catch (err) {
      showToast('Lỗi cập nhật trạng thái', 'error');
    }
  };

  // Cập nhật hàng loạt các lớp đã chọn
  const handleBulkStatusUpdate = async (newStatus) => {
    if (selectedIds.length === 0) return showToast('Vui lòng chọn ít nhất 1 lớp', 'error');
    try {
      await updateBulkCreditClassStatus(selectedIds, newStatus);
      showToast(`Đã cập nhật ${selectedIds.length} lớp thành ${newStatus}`, 'success');
      fetchClasses();
    } catch (err) {
      showToast('Lỗi cập nhật hàng loạt', 'error');
    }
  };

  const handleDelete = async (classId, currentStudents) => {
    if (currentStudents > 0) return showToast(`Lớp đang có ${currentStudents} SV, không thể xóa!`, 'error');
    if (window.confirm(`Bạn có chắc muốn xóa lớp ${classId}?`)) {
      try {
        await deleteCreditClass(classId);
        showToast('Xóa thành công!', 'success');
        fetchClasses(); 
      } catch (error) { showToast('Lỗi khi xóa lớp.', 'error'); }
    }
  };

  const handleEditClick = (classData) => {
    setEditData(classData);
    setIsEditOpen(true);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            Quản lý Lớp Tín Chỉ
          </h1>
        </div>
        <div className="flex gap-3">
          {/* Menu cập nhật hàng loạt */}
          {selectedIds.length > 0 && (
            <div className="flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden mr-2">
              <span className="px-3 text-sm font-medium text-slate-600 bg-slate-100 border-r border-slate-300">
                Đã chọn {selectedIds.length}
              </span>
              <select 
                className="text-sm px-3 py-2 outline-none cursor-pointer"
                onChange={(e) => { if(e.target.value) handleBulkStatusUpdate(e.target.value); e.target.value = ""; }}
              >
                <option value="">-- Đổi trạng thái --</option>
                <option value="Active">Mở đăng ký (Active)</option>
                <option value="Planning">Kế hoạch (Planning)</option>
                <option value="Closed">Đóng (Closed)</option>
              </select>
            </div>
          )}
          <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
            <Settings className="w-4 h-4" /> <span>Tạo tự động</span>
          </button>
          <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            <Plus className="w-4 h-4" /> <span>Tạo thủ công</span>
          </button>
        </div>
      </div>

      <FilterSection filters={filters} onFilterChange={handleFilterChange} metaData={metaData} />
      <DataTable 
        classes={classes} 
        loading={loading} 
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete} 
        onEdit={handleEditClick}
      />

      {isEditOpen && editData && (
        <EditClassModal 
          editData={editData}
          onClose={() => setIsEditOpen(false)}
          onSuccess={fetchClasses}
          lecturers={metaData.lecturers}
          adminClasses={metaData.adminClasses}
          showToast={showToast}
        />
      )}
    </div>
  );
};

export default CreditClassesManagement;