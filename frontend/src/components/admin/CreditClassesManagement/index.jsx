import React, { useState, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
import FilterSection from './FilterSection';
import DataTable from './DataTable';
import CreateWizardModal from './CreateWizardModal';
import EditClassModal from './EditClassModal';

export default function CreditClassesManagement({ showToast }) {
  // 1. Khai báo States cho dữ liệu tổng
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [adminClasses, setAdminClasses] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);

  // 2. States cho Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  // 3. States cho UI Toggles
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editModalData, setEditModalData] = useState(null);

  // 4. Data Fetching Logic
  const fetchData = async () => {
    try {
      setLoading(true);
      const [clsRes, subRes, lecRes, semRes, adminRes] = await Promise.all([
        fetch('http://localhost:8000/api/credit-classes/').then(r => r.json()),
        fetch('http://localhost:8000/api/subjects/').then(r => r.json()),
        fetch('http://localhost:8000/api/admin/lecturers/').then(r => r.json()),
        fetch('http://localhost:8000/api/semesters/').then(r => r.json()),
        fetch('http://localhost:8000/api/administrative-classes/').then(r => r.json())
      ]);

      setClasses(clsRes.data || clsRes);

      const subList = (subRes.data || subRes).map(s => ({
        value: s.subject_id,
        label: `${s.subject_id} - ${s.subject_name}`,
        faculty_id: s.faculty_id || s.department_id || null
      }));
      setSubjects(subList);

      setLecturers((lecRes.data || lecRes).map(l => ({
        value: l.lecturer_id,
        label: `${l.lecturer_id} - ${l.full_name}`
      })));

      const actualSemRes = semRes.data || semRes;
      const semList = actualSemRes.map(s => ({
        value: s.semester_id,
        label: `Học kỳ ${s.semester} - ${s.academic_year}`
      }));
      setSemesters(semList);

      const actualAdminRes = adminRes.data || adminRes;
      setAdminClasses(actualAdminRes.map(c => ({
        value: c.class_id,
        label: c.class_id,
        faculty_id: c.faculty_id || c.department_id || null
      })));

      const facultyMap = new Map();
      actualAdminRes.forEach(c => {
        const fid = c.faculty_id || c.department_id;
        const fname = c.faculty_name || c.department_name;
        if (fid && fname) facultyMap.set(fid, fname);
      });
      if (facultyMap.size === 0) {
        facultyMap.set('CNTT', 'Công nghệ thông tin');
        facultyMap.set('KT', 'Kinh tế');
        facultyMap.set('NN', 'Ngoại ngữ');
      }
      setFaculties(Array.from(facultyMap.entries()).map(([value, label]) => ({ value, label })));
    } catch (error) {
      console.error(error);
      if (showToast) showToast('Lỗi khi tải dữ liệu!', 'error');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchData(); }, []);

  // 5. Helpers & Computed Data (useMemo cho flatData)
  const getSubjectLabel = (id) => subjects.find(x => x.value === id)?.label || (id || 'Đang cập nhật');
  const getLecturerName = (id) => lecturers.find(l => l.value === id)?.label.split(' - ')[1] || id || '—';
  
  // Logic lấy label Hierarchy & Format [Giữ nguyên như gốc]
  const formatGroupNumber = (num) => {
    if (num === null || num === undefined || num === '') return '01';
    return String(num).padStart(2, '0');
  };
  const getHierarchyLabel = (item, parent) => {
    if (item.parent_class_id && parent) {
      return `Nhóm ${formatGroupNumber(parent.class_group || parent.group_number)} - Tổ ${formatGroupNumber(item.class_group || item.sub_group_number)}`;
    }
    return `Nhóm ${formatGroupNumber(item.class_group || item.group_number)}`;
  };
  const getTargetClassesLabel = (targetClasses) => {
    if (!targetClasses || targetClasses.length === 0) return '—';
    if (Array.isArray(targetClasses)) {
      return targetClasses.length > 3
        ? `${targetClasses.slice(0, 3).join(', ')} +${targetClasses.length - 3}`
        : targetClasses.join(', ');
    }
    return String(targetClasses);
  };

  const flatData = useMemo(() => {
    let filtered = classes.filter(c => {
      if (selectedSemester && c.semester_id !== selectedSemester) return false;
      if (selectedSubject && c.subject_id !== selectedSubject) return false;
      if (selectedFaculty) {
        const subject = subjects.find(s => s.value === c.subject_id);
        const hasFacultyFromSubject = subject?.faculty_id === selectedFaculty;
        const targets = c.target_classes || [];
        const hasFacultyFromTarget = targets.some(tc => {
          const admin = adminClasses.find(a => a.value === tc);
          return admin?.faculty_id === selectedFaculty;
        });
        if (!hasFacultyFromSubject && !hasFacultyFromTarget) return false;
      }
      if (searchTerm && !c.class_id.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });

    const parents = filtered.filter(c => !c.parent_class_id);
    const children = filtered.filter(c => c.parent_class_id);

    const result = [];
    parents
      .sort((a, b) => String(a.class_id).localeCompare(String(b.class_id)))
      .forEach(p => {
        result.push({ ...p, _parent: null });
        children
          .filter(ch => ch.parent_class_id === p.class_id)
          .sort((a, b) => String(a.class_id).localeCompare(String(b.class_id)))
          .forEach(ch => result.push({ ...ch, _parent: p }));
      });

    children
      .filter(ch => !parents.find(p => p.class_id === ch.parent_class_id))
      .forEach(ch => result.push({ ...ch, _parent: null }));

    return result;
  }, [classes, selectedSemester, selectedSubject, selectedFaculty, searchTerm, subjects, adminClasses]);

  // 6. Action Handlers (Cập nhật trạng thái)
  const handleChangeStatus = async (classItem, newStatus) => { /* ... fetch PUT status ... */ };

  const handleEditClick = (classItem) => {
    let subjId = classItem.subject_id || classes.find(c => c.class_id === classItem.parent_class_id)?.subject_id;
    setEditModalData({ ...classItem, subject_id: subjId, target_classes: classItem.target_classes || [] });
  };

  return (
    <div className="bg-slate-50 min-h-screen p-6 font-sans">
      <div className="max-w-[1400px] mx-auto">
        {/* Tiêu đề & Nút thêm mới */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-[22px] font-bold text-slate-800 tracking-tight">Quản lý Lớp Tín Chỉ</h1>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="flex items-center gap-2 bg-[#d32f2f] text-white px-5 py-2.5 rounded shadow-sm hover:bg-red-700 transition-colors text-sm font-semibold"
          >
            <Plus size={16} /> Tạo Lớp Mới
          </button>
        </div>

        {/* Các Component Con */}
        <FilterSection 
          semesters={semesters} faculties={faculties} subjects={subjects} adminClasses={adminClasses}
          selectedSemester={selectedSemester} setSelectedSemester={setSelectedSemester}
          selectedFaculty={selectedFaculty} setSelectedFaculty={setSelectedFaculty}
          selectedSubject={selectedSubject} setSelectedSubject={setSelectedSubject}
          searchTerm={searchTerm} setSearchTerm={setSearchTerm}
        />

        <DataTable 
          loading={loading} flatData={flatData}
          getSubjectLabel={getSubjectLabel} getLecturerName={getLecturerName}
          getTargetClassesLabel={getTargetClassesLabel} getHierarchyLabel={getHierarchyLabel}
          handleEditClick={handleEditClick} handleChangeStatus={handleChangeStatus}
        />

        {/* Modals */}
        {isWizardOpen && (
          <CreateWizardModal
            onClose={() => setIsWizardOpen(false)}
            onSuccess={fetchData}
            semesters={semesters} subjects={subjects} lecturers={lecturers} 
            adminClasses={adminClasses} showToast={showToast}
            defaultSemesterId={selectedSemester}
          />
        )}

        {editModalData && (
          <EditClassModal 
            editData={editModalData}
            onClose={() => setEditModalData(null)}
            onSuccess={fetchData}
            lecturers={lecturers} adminClasses={adminClasses}
            getSubjectLabel={getSubjectLabel} showToast={showToast}
          />
        )}
      </div>
    </div>
  );
}