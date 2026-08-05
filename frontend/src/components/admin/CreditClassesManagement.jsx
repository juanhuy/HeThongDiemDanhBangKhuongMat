import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, ChevronRight, Save, X, Filter, CornerDownRight, BookOpen } from 'lucide-react';
import SearchableSelect from '../common/SearchableSelect';

export default function CreditClassesManagement({ showToast }) {
  // ================= STATE & LOGIC (GIỮ NGUYÊN) =================
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [adminClasses, setAdminClasses] = useState([]);
  const [faculties, setFaculties] = useState([]);

  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editModalData, setEditModalData] = useState(null);
  const [wizardData, setWizardData] = useState({
    semester_id: "",
    subject_id: "",
    groups: []
  });

  const generateEmptyGroup = (index = 0) => ({
    id: Date.now() + Math.random(),
    group_number: index + 1,
    lecturer_id: "",
    max_students: 100,
    target_classes: [],
    sub_groups: []
  });

  const generateEmptySubGroup = (parentGroup) => ({
    id: Date.now() + Math.random(),
    sub_group_number: parentGroup.sub_groups.length + 1,
    lecturer_id: parentGroup.lecturer_id,
    max_students: 40
  });

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

      const defaultSem = semList.find(s => s.label.includes('2026-2027'));
      if (defaultSem) {
        setSelectedSemester(defaultSem.value);
        setWizardData(prev => ({ ...prev, semester_id: defaultSem.value }));
      } else if (semList.length > 0) {
        setSelectedSemester(semList[0].value);
        setWizardData(prev => ({ ...prev, semester_id: semList[0].value }));
      }

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
      if (showToast) showToast('Lỗi khi tải dữ liệu!', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getSubjectLabel = (id) => {
    const s = subjects.find(x => x.value === id);
    return s ? s.label : (id || 'Đang cập nhật');
  };

  const getLecturerName = (id) => lecturers.find(l => l.value === id)?.label.split(' - ')[1] || (id || '—');

  const getTargetClassesLabel = (targetClasses) => {
    if (!targetClasses || targetClasses.length === 0) return '—';
    if (Array.isArray(targetClasses)) {
      return targetClasses.length > 3
        ? `${targetClasses.slice(0, 3).join(', ')} +${targetClasses.length - 3}`
        : targetClasses.join(', ');
    }
    return String(targetClasses);
  };

  const formatGroupNumber = (num) => {
    if (num === null || num === undefined || num === '') return '01';
    return String(num).padStart(2, '0');
  };

  const getHierarchyLabel = (item, parent) => {
    if (item.parent_class_id && parent) {
      const gNum = formatGroupNumber(parent.class_group || parent.group_number);
      const tNum = formatGroupNumber(item.class_group || item.sub_group_number);
      return `Nhóm ${gNum} - Tổ ${tNum}`;
    }
    return `Nhóm ${formatGroupNumber(item.class_group || item.group_number)}`;
  };

  const getSemesterLabel = (id) => semesters.find(s => s.value === id)?.label || '';

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

  const handleChangeStatus = async (classItem, newStatus) => {
    if (classItem.status === newStatus) return;
    try {
      const res = await fetch(`http://localhost:8000/api/credit-classes/${classItem.class_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
      setClasses(prev => prev.map(c => c.class_id === classItem.class_id ? { ...c, status: newStatus } : c));
      const statusLabel = { Active: 'Đang mở', Planning: 'Dự kiến', Cancelled: 'Đã hủy' }[newStatus] || newStatus;
      if (showToast) showToast(`Đã chuyển trạng thái sang "${statusLabel}"`, 'success');
    } catch (error) {
      console.error(error);
      if (showToast) showToast('Lỗi khi cập nhật trạng thái!', 'error');
    }
  };

  const handleEditClick = (classItem) => {
    let subjId = classItem.subject_id;
    if (!subjId && classItem.parent_class_id) {
      const parent = classes.find(c => c.class_id === classItem.parent_class_id);
      subjId = parent?.subject_id;
    }
    setEditModalData({
      ...classItem,
      subject_id: subjId,
      target_classes: classItem.target_classes || []
    });
  };

  const handleSaveEdit = async () => {
    if (!editModalData.lecturer_id || !editModalData.max_students) {
      if (showToast) showToast('Vui lòng điền đủ Giảng viên và Sĩ số!', 'error');
      return;
    }
    try {
      const res = await fetch(`http://localhost:8000/api/credit-classes/${editModalData.class_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lecturer_id: editModalData.lecturer_id,
          max_students: editModalData.max_students,
          target_classes: editModalData.target_classes
        })
      });
      if (!res.ok) throw new Error('Failed to update');
      if (showToast) showToast('Cập nhật lớp thành công!', 'success');
      setEditModalData(null);
      fetchData();
    } catch (error) {
      console.error(error);
      if (showToast) showToast('Lỗi khi cập nhật lớp!', 'error');
    }
  };

  const handleOpenWizard = () => {
    setWizardData(prev => ({
      ...prev,
      subject_id: "",
      groups: [generateEmptyGroup(0)]
    }));
    setIsWizardOpen(true);
  };

  const addGroup = () => {
    setWizardData(prev => ({ ...prev, groups: [...prev.groups, generateEmptyGroup(prev.groups.length)] }));
  };

  const removeGroup = (groupId) => {
    setWizardData(prev => {
      const filtered = prev.groups.filter(g => g.id !== groupId);
      return { ...prev, groups: filtered.map((g, idx) => ({ ...g, group_number: idx + 1 })) };
    });
  };

  const addSubGroup = (groupId) => {
    setWizardData(prev => ({
      ...prev,
      groups: prev.groups.map(g =>
        g.id === groupId ? { ...g, sub_groups: [...g.sub_groups, generateEmptySubGroup(g)] } : g
      )
    }));
  };

  const removeSubGroup = (groupId, subGroupId) => {
    setWizardData(prev => ({
      ...prev,
      groups: prev.groups.map(g =>
        g.id === groupId
          ? {
              ...g,
              sub_groups: g.sub_groups
                .filter(sg => sg.id !== subGroupId)
                .map((sg, idx) => ({ ...sg, sub_group_number: idx + 1 }))
            }
          : g
      )
    }));
  };

  const updateGroup = (groupId, field, value) => {
    setWizardData(prev => ({
      ...prev,
      groups: prev.groups.map(g => g.id === groupId ? { ...g, [field]: value } : g)
    }));
  };

  const updateSubGroup = (groupId, subGroupId, field, value) => {
    setWizardData(prev => ({
      ...prev,
      groups: prev.groups.map(g =>
        g.id === groupId
          ? {
              ...g,
              sub_groups: g.sub_groups.map(sg =>
                sg.id === subGroupId ? { ...sg, [field]: value } : sg
              )
            }
          : g
      )
    }));
  };

  const handleSaveDraft = async () => {
    if (!wizardData.subject_id) {
      if (showToast) showToast('Vui lòng chọn Môn học!', 'error');
      return;
    }
    const invalidGroups = wizardData.groups.some(g => !g.lecturer_id || !g.max_students);
    if (invalidGroups) {
      if (showToast) showToast('Vui lòng điền đủ Giảng viên và Sĩ số cho tất cả các Nhóm!', 'error');
      return;
    }

    for (const g of wizardData.groups) {
      if (g.sub_groups.length > 0) {
        const sum = g.sub_groups.reduce((acc, sg) => acc + (Number(sg.max_students) || 0), 0);
        if (sum !== Number(g.max_students)) {
          if (showToast) {
            showToast(
              `Nhóm ${formatGroupNumber(g.group_number)}: Tổng sĩ số các Tổ (${sum}) phải bằng sĩ số Nhóm (${g.max_students})`,
              'error'
            );
          }
          return;
        }
      }
    }

    try {
      const payload = {
        subject_id: wizardData.subject_id,
        lecturer_id: wizardData.groups[0]?.lecturer_id || "UNKNOWN",
        semester_id: wizardData.semester_id,
        groups: wizardData.groups.map(g => ({
          class_group: formatGroupNumber(g.group_number),
          max_students: g.max_students,
          class_type: g.sub_groups.length > 0 ? "Theory" : "Combined",
          target_classes: g.target_classes,
          lecturer_id: g.lecturer_id,
          sub_groups: g.sub_groups.map(sg => ({
            class_group: formatGroupNumber(sg.sub_group_number),
            max_students: sg.max_students,
            class_type: "Practice",
            lecturer_id: sg.lecturer_id
          }))
        }))
      };
      const res = await fetch('http://localhost:8000/api/credit-classes/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save');
      if (showToast) showToast('Lưu lớp thành công!', 'success');
      setIsWizardOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      if (showToast) showToast('Lỗi khi lưu lớp!', 'error');
    }
  };

  // ================= TĂNG CƯỜNG GIAO DIỆN (UI COMPONENTS) =================

  const StatusBadge = ({ item }) => {
    const statusConfig = {
      Active: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
      Planning: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
      Cancelled: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' }
    };
    const cfg = statusConfig[item.status] || statusConfig.Planning;

    return (
      <div className="relative inline-block w-full">
        <select
          value={item.status || 'Planning'}
          onChange={(e) => handleChangeStatus(item, e.target.value)}
          className={`appearance-none w-full text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-center ${cfg.bg} ${cfg.text} ${cfg.border} transition-colors`}
          title="Nhấn để đổi trạng thái"
        >
          <option value="Planning">Dự kiến</option>
          <option value="Active">Đang mở</option>
          <option value="Cancelled">Đã hủy</option>
        </select>
      </div>
    );
  };

  const ClassTypeBadge = ({ type }) => {
    const config = {
      Theory: { label: 'Lý thuyết', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      Practice: { label: 'Thực hành', color: 'bg-purple-50 text-purple-700 border-purple-200' },
      Combined: { label: 'Chung', color: 'bg-slate-100 text-slate-700 border-slate-200' }
    };
    const { label, color } = config[type] || config.Combined;
    return (
      <span className={`px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide rounded border ${color}`}>
        {label}
      </span>
    );
  };

  // Các class tái sử dụng cho form
  const inputCls = "w-full px-3.5 py-2 border border-gray-300 rounded-md text-sm text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white transition-all shadow-sm";
  const labelCls = "block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide";

  return (
    <div className="bg-gray-50 min-h-screen p-4 md:p-6 lg:p-8 font-sans">
      <div className="max-w-[1440px] mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-600" />
              Quản lý Lớp Tín Chỉ
            </h1>
            <p className="text-sm text-gray-500 mt-1">Quản lý danh sách, cấu hình nhóm và tổ thực hành</p>
          </div>
          <button
            onClick={handleOpenWizard}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg shadow-sm hover:bg-blue-700 focus:ring-4 focus:ring-blue-600/20 transition-all text-sm font-semibold whitespace-nowrap"
          >
            <Plus size={18} strokeWidth={2.5} /> 
            Tạo Lớp Mới
          </button>
        </div>

        {/* BỘ LỌC (FILTER) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 items-end">
            <div>
              <label className={labelCls}>Học kỳ</label>
              <SearchableSelect options={semesters} value={selectedSemester} onChange={setSelectedSemester} />
            </div>
            <div>
              <label className={labelCls}>Khoa / Bộ môn</label>
              <select
                className={inputCls}
                value={selectedFaculty}
                onChange={(e) => setSelectedFaculty(e.target.value)}
              >
                <option value="">Tất cả khoa</option>
                {faculties.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Môn học</label>
              <SearchableSelect
                options={[{ value: '', label: 'Tất cả môn học' }, ...subjects]}
                value={selectedSubject}
                onChange={setSelectedSubject}
                placeholder="Chọn môn học..."
              />
            </div>
            <div>
              <label className={labelCls}>Tìm kiếm</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Mã lớp..."
                  className={`${inputCls} pl-9`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={() => { setSelectedFaculty(''); setSelectedSubject(''); setSearchTerm(''); }}
              className="flex items-center justify-center gap-2 w-full px-6 py-2 border border-gray-300 rounded-md text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 transition-all shadow-sm"
              style={{ height: '38px' }} // Khớp với chiều cao input
            >
              <Filter size={16} /> Xóa lọc
            </button>
          </div>
        </div>

        {/* BẢNG DỮ LIỆU */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-4 px-5">Mã Lớp TC</th>
                  <th className="py-4 px-5">Môn học</th>
                  <th className="py-4 px-5">Nhóm / Tổ</th>
                  <th className="py-4 px-5 min-w-[150px]">Giảng viên</th>
                  <th className="py-4 px-5">Lớp dự kiến</th>
                  <th className="py-4 px-5 text-center">Phân loại</th>
                  <th className="py-4 px-5 text-center">Sĩ số</th>
                  <th className="py-4 px-5 text-center w-[130px]">Trạng thái</th>
                  <th className="py-4 px-5 text-center w-[100px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700 divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan="9" className="text-center py-12 text-gray-500 font-medium">Đang tải dữ liệu...</td></tr>
                ) : flatData.length === 0 ? (
                  <tr><td colSpan="9" className="text-center py-12 text-gray-500 font-medium bg-gray-50/50">Không tìm thấy lớp nào phù hợp</td></tr>
                ) : (
                  flatData.map((item) => {
                    const isSub = !!item.parent_class_id;
                    const parent = item._parent;
                    const targets = isSub
                      ? (item.target_classes?.length ? item.target_classes : (parent?.target_classes || []))
                      : (item.target_classes || []);

                    return (
                      <tr
                        key={item.class_id}
                        className={`hover:bg-blue-50/50 transition-colors group ${isSub ? 'bg-gray-50/50' : 'bg-white'}`}
                      >
                        <td className="py-3 px-5">
                          <div className={`flex items-center font-medium ${isSub ? 'text-gray-500 pl-4 border-l-2 border-gray-300' : 'text-blue-700'}`}>
                            {isSub && <CornerDownRight size={14} className="mr-2 text-gray-400" />}
                            {item.class_id}
                          </div>
                        </td>
                        <td className={`py-3 px-5 ${isSub ? 'text-gray-500' : 'text-gray-900 font-medium'}`}>
                          {getSubjectLabel(item.subject_id || parent?.subject_id)}
                        </td>
                        <td className="py-3 px-5 font-medium">
                          {getHierarchyLabel(item, parent)}
                        </td>
                        <td className="py-3 px-5">{getLecturerName(item.lecturer_id)}</td>
                        <td className="py-3 px-5 text-gray-500 text-xs max-w-[200px] truncate" title={getTargetClassesLabel(targets)}>
                          {getTargetClassesLabel(targets)}
                        </td>
                        <td className="py-3 px-5 text-center">
                          <ClassTypeBadge type={item.class_type} />
                        </td>
                        <td className="py-3 px-5 text-center font-medium">
                          <span className={item.current_students >= item.max_students ? 'text-amber-600' : 'text-gray-700'}>
                            {item.current_students ?? 0}
                          </span>
                          <span className="text-gray-400 mx-1">/</span>
                          {item.max_students}
                        </td>
                        <td className="py-3 px-5 text-center">
                          <StatusBadge item={item} />
                        </td>
                        <td className="py-3 px-5 text-center">
                          <div className="flex items-center justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleEditClick(item)} 
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Chỉnh sửa"
                            >
                              <Edit2 size={16} strokeWidth={2} />
                            </button>
                            <button 
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Xóa"
                            >
                              <Trash2 size={16} strokeWidth={2} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Phân trang tĩnh (UI) */}
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-3.5 flex justify-between items-center text-sm text-gray-600">
            <div>Hiển thị <span className="font-semibold text-gray-900">{flatData.length}</span> lớp tín chỉ</div>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                <ChevronRight size={16} className="rotate-180" />
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-md bg-blue-600 text-white font-semibold shadow-sm">1</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors">2</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors">3</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========== WIZARD TẠO LỚP ========== */}
      {isWizardOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 transition-opacity">
          <div className="bg-white w-full max-w-[900px] max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Khởi tạo Lớp Tín Chỉ mới
                {wizardData.semester_id && <span className="text-sm font-medium text-gray-500 bg-gray-200/50 px-2.5 py-1 rounded-md ml-2">{getSemesterLabel(wizardData.semester_id)}</span>}
              </h2>
              <button
                onClick={() => setIsWizardOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50/50">
              
              {/* Bước 1 */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">1</span>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Thông tin cốt lõi</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                  <div>
                    <label className={labelCls}>Học kỳ <span className="text-red-500">*</span></label>
                    <SearchableSelect
                      options={semesters}
                      value={wizardData.semester_id}
                      onChange={(val) => setWizardData(prev => ({ ...prev, semester_id: val }))}
                      placeholder="Chọn học kỳ..."
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Môn học <span className="text-red-500">*</span></label>
                    <SearchableSelect
                      options={subjects}
                      value={wizardData.subject_id}
                      onChange={(val) => setWizardData(prev => ({ ...prev, subject_id: val }))}
                      placeholder="Tìm kiếm môn học..."
                    />
                  </div>
                </div>
              </div>

              {/* Bước 2 */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">2</span>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Cấu hình Nhóm & Tổ</h3>
                  </div>
                  <button
                    onClick={addGroup}
                    className="flex items-center gap-1.5 text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-100 font-semibold transition-colors"
                  >
                    <Plus size={16} /> Thêm Nhóm LT
                  </button>
                </div>

                <div className="space-y-6">
                  {wizardData.groups.map((group) => {
                    const subSum = group.sub_groups.reduce((acc, sg) => acc + (Number(sg.max_students) || 0), 0);
                    const mismatch = group.sub_groups.length > 0 && subSum !== Number(group.max_students);

                    return (
                      <div key={group.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                        
                        {/* Header Nhóm */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50/80">
                          <span className="text-sm font-bold text-gray-800 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            Nhóm {formatGroupNumber(group.group_number)}
                          </span>
                          {wizardData.groups.length > 1 && (
                            <button
                              onClick={() => removeGroup(group.id)}
                              className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                              title="Xóa nhóm này"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>

                        <div className="p-5">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                            <div>
                              <label className={labelCls}>Giảng viên LT <span className="text-red-500">*</span></label>
                              <SearchableSelect
                                options={lecturers}
                                value={group.lecturer_id}
                                onChange={(val) => updateGroup(group.id, 'lecturer_id', val)}
                                placeholder="Chọn Giảng viên..."
                              />
                            </div>
                            <div>
                              <label className={labelCls}>Sĩ số Nhóm <span className="text-red-500">*</span></label>
                              <input
                                type="number"
                                className={inputCls}
                                value={group.max_students}
                                onChange={(e) => updateGroup(group.id, 'max_students', parseInt(e.target.value) || 0)}
                              />
                            </div>
                            <div>
                              <label className={labelCls}>Lớp biên chế (Dự kiến)</label>
                              <SearchableSelect
                                options={adminClasses}
                                value={group.target_classes}
                                onChange={(val) => updateGroup(group.id, 'target_classes', val)}
                                placeholder="Thêm lớp..."
                                multiple={true}
                              />
                            </div>
                          </div>

                          {/* Tổ thực hành */}
                          <div className="mt-6 pt-5 border-t border-dashed border-gray-200">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                  Tổ thực hành trực thuộc
                                </span>
                                {group.sub_groups.length > 0 && (
                                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${mismatch ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
                                    Sĩ số: {subSum} / {group.max_students}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => addSubGroup(group.id)}
                                className="flex items-center gap-1 text-xs font-semibold bg-gray-100 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-200 transition-colors"
                              >
                                <Plus size={14} /> Thêm Tổ TH
                              </button>
                            </div>

                            {group.sub_groups.length === 0 ? (
                              <div className="text-sm text-gray-400 bg-gray-50 border border-gray-100 rounded-md p-4 text-center border-dashed">
                                Lớp không chia tổ thực hành.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {group.sub_groups.map(sg => (
                                  <div key={sg.id} className="relative bg-gray-50 border border-gray-200 rounded-lg p-4 group">
                                    <button
                                      onClick={() => removeSubGroup(group.id, sg.id)}
                                      className="absolute right-2 top-2 text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-white transition-colors opacity-0 group-hover:opacity-100"
                                      title="Xóa tổ"
                                    >
                                      <X size={16} />
                                    </button>
                                    
                                    <div className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5">
                                      <CornerDownRight size={14} className="text-gray-400"/>
                                      Tổ {formatGroupNumber(sg.sub_group_number)}
                                    </div>
                                    
                                    <div className="space-y-4">
                                      <div>
                                        <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Giảng viên TH</label>
                                        <SearchableSelect
                                          options={lecturers}
                                          value={sg.lecturer_id}
                                          onChange={(val) => updateSubGroup(group.id, sg.id, 'lecturer_id', val)}
                                          placeholder="Chọn..."
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Sĩ số Tổ</label>
                                        <input
                                          type="number"
                                          className={inputCls}
                                          value={sg.max_students}
                                          onChange={(e) => updateSubGroup(group.id, sg.id, 'max_students', parseInt(e.target.value) || 0)}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
              <button
                onClick={() => setIsWizardOpen(false)}
                className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveDraft}
                className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center gap-2 transition-colors shadow-sm focus:ring-4 focus:ring-blue-600/20"
              >
                <Save size={18} /> Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL CHỈNH SỬA ========== */}
      {editModalData && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 transition-opacity">
          <div className="bg-white w-full max-w-[600px] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">
                Chỉnh sửa: <span className="text-blue-600">{editModalData.class_id}</span>
              </h2>
              <button onClick={() => setEditModalData(null)} className="p-2 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6 pb-6 border-b border-gray-100">
                <div>
                  <label className={labelCls}>Môn học</label>
                  <input type="text" disabled value={getSubjectLabel(editModalData.subject_id)} className={`${inputCls} bg-gray-100 text-gray-500 cursor-not-allowed`} />
                </div>
                <div>
                  <label className={labelCls}>Phân loại</label>
                  <div className="flex h-[38px] items-center px-3 border border-gray-200 rounded-md bg-gray-50">
                    <ClassTypeBadge type={editModalData.class_type} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className={labelCls}>Giảng viên phụ trách <span className="text-red-500">*</span></label>
                  <SearchableSelect
                    options={lecturers}
                    value={editModalData.lecturer_id}
                    onChange={(val) => setEditModalData({ ...editModalData, lecturer_id: val })}
                  />
                </div>
                <div>
                  <label className={labelCls}>Sĩ số tối đa <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    className={inputCls}
                    value={editModalData.max_students}
                    onChange={(e) => setEditModalData({ ...editModalData, max_students: parseInt(e.target.value) || 0 })}
                  />
                </div>

                {!editModalData.parent_class_id && (
                  <div>
                    <label className={labelCls}>Lớp biên chế (Dự kiến)</label>
                    <SearchableSelect
                      options={adminClasses}
                      value={editModalData.target_classes || []}
                      onChange={(val) => setEditModalData({ ...editModalData, target_classes: val })}
                      multiple={true}
                      placeholder="Chọn lớp..."
                    />
                    <p className="text-[11px] text-gray-500 mt-2 flex items-center gap-1">
                       <CornerDownRight size={12}/> Các tổ thực hành sẽ tự động kế thừa danh sách này.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
              <button onClick={() => setEditModalData(null)} className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm">
                Hủy bỏ
              </button>
              <button onClick={handleSaveEdit} className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center gap-2 transition-colors shadow-sm focus:ring-4 focus:ring-blue-600/20">
                <Save size={18} /> Cập nhật
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}






// import React, { useState, useEffect, useMemo } from 'react';
// import { Search, Plus, Edit2, Trash2, ChevronRight, Save, X, Filter } from 'lucide-react';
// import SearchableSelect from '../common/SearchableSelect';

// export default function CreditClassesManagement({ showToast }) {
//   const [classes, setClasses] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [subjects, setSubjects] = useState([]);
//   const [lecturers, setLecturers] = useState([]);
//   const [semesters, setSemesters] = useState([]);
//   const [adminClasses, setAdminClasses] = useState([]);
//   const [faculties, setFaculties] = useState([]);

//   const [selectedSemester, setSelectedSemester] = useState("");
//   const [selectedFaculty, setSelectedFaculty] = useState("");
//   const [selectedSubject, setSelectedSubject] = useState("");

//   const [isWizardOpen, setIsWizardOpen] = useState(false);
//   const [editModalData, setEditModalData] = useState(null);
//   const [wizardData, setWizardData] = useState({
//     semester_id: "",
//     subject_id: "",
//     groups: []
//   });

//   const generateEmptyGroup = (index = 0) => ({
//     id: Date.now() + Math.random(),
//     group_number: index + 1,
//     lecturer_id: "",
//     max_students: 100,
//     target_classes: [],
//     sub_groups: []
//   });

//   const generateEmptySubGroup = (parentGroup) => ({
//     id: Date.now() + Math.random(),
//     sub_group_number: parentGroup.sub_groups.length + 1,
//     lecturer_id: parentGroup.lecturer_id,
//     max_students: 40
//   });

//   const fetchData = async () => {
//     try {
//       setLoading(true);
//       const [clsRes, subRes, lecRes, semRes, adminRes] = await Promise.all([
//         fetch('http://localhost:8000/api/credit-classes/').then(r => r.json()),
//         fetch('http://localhost:8000/api/subjects/').then(r => r.json()),
//         fetch('http://localhost:8000/api/admin/lecturers/').then(r => r.json()),
//         fetch('http://localhost:8000/api/semesters/').then(r => r.json()),
//         fetch('http://localhost:8000/api/administrative-classes/').then(r => r.json())
//       ]);

//       setClasses(clsRes.data || clsRes);

//       const subList = (subRes.data || subRes).map(s => ({
//         value: s.subject_id,
//         label: `${s.subject_id} - ${s.subject_name}`,
//         faculty_id: s.faculty_id || s.department_id || null
//       }));
//       setSubjects(subList);

//       setLecturers((lecRes.data || lecRes).map(l => ({
//         value: l.lecturer_id,
//         label: `${l.lecturer_id} - ${l.full_name}`
//       })));

//       const actualSemRes = semRes.data || semRes;
//       const semList = actualSemRes.map(s => ({
//         value: s.semester_id,
//         label: `Học kỳ ${s.semester} - ${s.academic_year}`
//       }));
//       setSemesters(semList);

//       const defaultSem = semList.find(s => s.label.includes('2026-2027'));
//       if (defaultSem) {
//         setSelectedSemester(defaultSem.value);
//         setWizardData(prev => ({ ...prev, semester_id: defaultSem.value }));
//       } else if (semList.length > 0) {
//         setSelectedSemester(semList[0].value);
//         setWizardData(prev => ({ ...prev, semester_id: semList[0].value }));
//       }

//       const actualAdminRes = adminRes.data || adminRes;
//       setAdminClasses(actualAdminRes.map(c => ({
//         value: c.class_id,
//         label: c.class_id,
//         faculty_id: c.faculty_id || c.department_id || null
//       })));

//       const facultyMap = new Map();
//       actualAdminRes.forEach(c => {
//         const fid = c.faculty_id || c.department_id;
//         const fname = c.faculty_name || c.department_name;
//         if (fid && fname) facultyMap.set(fid, fname);
//       });
//       if (facultyMap.size === 0) {
//         facultyMap.set('CNTT', 'Công nghệ thông tin');
//         facultyMap.set('KT', 'Kinh tế');
//         facultyMap.set('NN', 'Ngoại ngữ');
//       }
//       setFaculties(Array.from(facultyMap.entries()).map(([value, label]) => ({ value, label })));
//     } catch (error) {
//       if (showToast) showToast('Lỗi khi tải dữ liệu!', 'error');
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchData();
//   }, []);

//   const getSubjectLabel = (id) => {
//     const s = subjects.find(x => x.value === id);
//     return s ? s.label : (id || 'Đang cập nhật');
//   };

//   const getLecturerName = (id) => lecturers.find(l => l.value === id)?.label.split(' - ')[1] || (id || '—');

//   const getTargetClassesLabel = (targetClasses) => {
//     if (!targetClasses || targetClasses.length === 0) return '—';
//     if (Array.isArray(targetClasses)) {
//       return targetClasses.length > 3
//         ? `${targetClasses.slice(0, 3).join(', ')} +${targetClasses.length - 3}`
//         : targetClasses.join(', ');
//     }
//     return String(targetClasses);
//   };

//   const formatGroupNumber = (num) => {
//     if (num === null || num === undefined || num === '') return '01';
//     return String(num).padStart(2, '0');
//   };

//   const getHierarchyLabel = (item, parent) => {
//     if (item.parent_class_id && parent) {
//       const gNum = formatGroupNumber(parent.class_group || parent.group_number);
//       const tNum = formatGroupNumber(item.class_group || item.sub_group_number);
//       return `Nhóm ${gNum} - Tổ ${tNum}`;
//     }
//     return `Nhóm ${formatGroupNumber(item.class_group || item.group_number)}`;
//   };

//   const getSemesterLabel = (id) => semesters.find(s => s.value === id)?.label || '';

//   const flatData = useMemo(() => {
//     let filtered = classes.filter(c => {
//       if (selectedSemester && c.semester_id !== selectedSemester) return false;
//       if (selectedSubject && c.subject_id !== selectedSubject) return false;
//       if (selectedFaculty) {
//         const subject = subjects.find(s => s.value === c.subject_id);
//         const hasFacultyFromSubject = subject?.faculty_id === selectedFaculty;
//         const targets = c.target_classes || [];
//         const hasFacultyFromTarget = targets.some(tc => {
//           const admin = adminClasses.find(a => a.value === tc);
//           return admin?.faculty_id === selectedFaculty;
//         });
//         if (!hasFacultyFromSubject && !hasFacultyFromTarget) return false;
//       }
//       if (searchTerm && !c.class_id.toLowerCase().includes(searchTerm.toLowerCase())) return false;
//       return true;
//     });

//     const parents = filtered.filter(c => !c.parent_class_id);
//     const children = filtered.filter(c => c.parent_class_id);

//     const result = [];
//     parents
//       .sort((a, b) => String(a.class_id).localeCompare(String(b.class_id)))
//       .forEach(p => {
//         result.push({ ...p, _parent: null });
//         children
//           .filter(ch => ch.parent_class_id === p.class_id)
//           .sort((a, b) => String(a.class_id).localeCompare(String(b.class_id)))
//           .forEach(ch => result.push({ ...ch, _parent: p }));
//       });

//     children
//       .filter(ch => !parents.find(p => p.class_id === ch.parent_class_id))
//       .forEach(ch => result.push({ ...ch, _parent: null }));

//     return result;
//   }, [classes, selectedSemester, selectedSubject, selectedFaculty, searchTerm, subjects, adminClasses]);

//   const handleChangeStatus = async (classItem, newStatus) => {
//     if (classItem.status === newStatus) return;
//     try {
//       const res = await fetch(`http://localhost:8000/api/credit-classes/${classItem.class_id}`, {
//         method: 'PUT',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ status: newStatus })
//       });
//       if (!res.ok) throw new Error('Failed to update status');
//       setClasses(prev => prev.map(c => c.class_id === classItem.class_id ? { ...c, status: newStatus } : c));
//       const statusLabel = { Active: 'Đang mở', Planning: 'Dự kiến', Cancelled: 'Đã hủy' }[newStatus] || newStatus;
//       if (showToast) showToast(`Đã chuyển trạng thái sang "${statusLabel}"`, 'success');
//     } catch (error) {
//       console.error(error);
//       if (showToast) showToast('Lỗi khi cập nhật trạng thái!', 'error');
//     }
//   };

//   const handleEditClick = (classItem) => {
//     let subjId = classItem.subject_id;
//     if (!subjId && classItem.parent_class_id) {
//       const parent = classes.find(c => c.class_id === classItem.parent_class_id);
//       subjId = parent?.subject_id;
//     }
//     setEditModalData({
//       ...classItem,
//       subject_id: subjId,
//       target_classes: classItem.target_classes || []
//     });
//   };

//   const handleSaveEdit = async () => {
//     if (!editModalData.lecturer_id || !editModalData.max_students) {
//       if (showToast) showToast('Vui lòng điền đủ Giảng viên và Sĩ số!', 'error');
//       return;
//     }
//     try {
//       const res = await fetch(`http://localhost:8000/api/credit-classes/${editModalData.class_id}`, {
//         method: 'PUT',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           lecturer_id: editModalData.lecturer_id,
//           max_students: editModalData.max_students,
//           target_classes: editModalData.target_classes
//         })
//       });
//       if (!res.ok) throw new Error('Failed to update');
//       if (showToast) showToast('Cập nhật lớp thành công!', 'success');
//       setEditModalData(null);
//       fetchData();
//     } catch (error) {
//       console.error(error);
//       if (showToast) showToast('Lỗi khi cập nhật lớp!', 'error');
//     }
//   };

//   const handleOpenWizard = () => {
//     setWizardData(prev => ({
//       ...prev,
//       subject_id: "",
//       groups: [generateEmptyGroup(0)]
//     }));
//     setIsWizardOpen(true);
//   };

//   const addGroup = () => {
//     setWizardData(prev => ({ ...prev, groups: [...prev.groups, generateEmptyGroup(prev.groups.length)] }));
//   };

//   const removeGroup = (groupId) => {
//     setWizardData(prev => {
//       const filtered = prev.groups.filter(g => g.id !== groupId);
//       return { ...prev, groups: filtered.map((g, idx) => ({ ...g, group_number: idx + 1 })) };
//     });
//   };

//   const addSubGroup = (groupId) => {
//     setWizardData(prev => ({
//       ...prev,
//       groups: prev.groups.map(g =>
//         g.id === groupId ? { ...g, sub_groups: [...g.sub_groups, generateEmptySubGroup(g)] } : g
//       )
//     }));
//   };

//   const removeSubGroup = (groupId, subGroupId) => {
//     setWizardData(prev => ({
//       ...prev,
//       groups: prev.groups.map(g =>
//         g.id === groupId
//           ? {
//               ...g,
//               sub_groups: g.sub_groups
//                 .filter(sg => sg.id !== subGroupId)
//                 .map((sg, idx) => ({ ...sg, sub_group_number: idx + 1 }))
//             }
//           : g
//       )
//     }));
//   };

//   const updateGroup = (groupId, field, value) => {
//     setWizardData(prev => ({
//       ...prev,
//       groups: prev.groups.map(g => g.id === groupId ? { ...g, [field]: value } : g)
//     }));
//   };

//   const updateSubGroup = (groupId, subGroupId, field, value) => {
//     setWizardData(prev => ({
//       ...prev,
//       groups: prev.groups.map(g =>
//         g.id === groupId
//           ? {
//               ...g,
//               sub_groups: g.sub_groups.map(sg =>
//                 sg.id === subGroupId ? { ...sg, [field]: value } : sg
//               )
//             }
//           : g
//       )
//     }));
//   };

//   const handleSaveDraft = async () => {
//     if (!wizardData.subject_id) {
//       if (showToast) showToast('Vui lòng chọn Môn học!', 'error');
//       return;
//     }
//     const invalidGroups = wizardData.groups.some(g => !g.lecturer_id || !g.max_students);
//     if (invalidGroups) {
//       if (showToast) showToast('Vui lòng điền đủ Giảng viên và Sĩ số cho tất cả các Nhóm!', 'error');
//       return;
//     }

//     for (const g of wizardData.groups) {
//       if (g.sub_groups.length > 0) {
//         const sum = g.sub_groups.reduce((acc, sg) => acc + (Number(sg.max_students) || 0), 0);
//         if (sum !== Number(g.max_students)) {
//           if (showToast) {
//             showToast(
//               `Nhóm ${formatGroupNumber(g.group_number)}: Tổng sĩ số các Tổ (${sum}) phải bằng sĩ số Nhóm (${g.max_students})`,
//               'error'
//             );
//           }
//           return;
//         }
//       }
//     }

//     try {
//       const payload = {
//         subject_id: wizardData.subject_id,
//         lecturer_id: wizardData.groups[0]?.lecturer_id || "UNKNOWN",
//         semester_id: wizardData.semester_id,
//         groups: wizardData.groups.map(g => ({
//           class_group: formatGroupNumber(g.group_number),
//           max_students: g.max_students,
//           class_type: g.sub_groups.length > 0 ? "Theory" : "Combined",
//           target_classes: g.target_classes,
//           lecturer_id: g.lecturer_id,
//           sub_groups: g.sub_groups.map(sg => ({
//             class_group: formatGroupNumber(sg.sub_group_number),
//             max_students: sg.max_students,
//             class_type: "Practice",
//             lecturer_id: sg.lecturer_id
//           }))
//         }))
//       };
//       const res = await fetch('http://localhost:8000/api/credit-classes/batch', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload)
//       });
//       if (!res.ok) throw new Error('Failed to save');
//       if (showToast) showToast('Lưu lớp thành công!', 'success');
//       setIsWizardOpen(false);
//       fetchData();
//     } catch (error) {
//       console.error(error);
//       if (showToast) showToast('Lỗi khi lưu lớp!', 'error');
//     }
//   };

//   const StatusBadge = ({ item }) => {
//     const statusConfig = {
//       Active: { label: 'Đang mở', bg: 'bg-[#e6f4ea]', text: 'text-[#1e8e3e]' },
//       Planning: { label: 'Dự kiến', bg: 'bg-[#fce8e6]', text: 'text-[#d93025]' },
//       Cancelled: { label: 'Đã hủy', bg: 'bg-gray-200', text: 'text-gray-600' }
//     };
//     const cfg = statusConfig[item.status] || statusConfig.Planning;

//     return (
//       <select
//         value={item.status || 'Planning'}
//         onChange={(e) => handleChangeStatus(item, e.target.value)}
//         className={`text-[12px] font-medium px-3 py-1.5 rounded-md border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400 ${cfg.bg} ${cfg.text}`}
//         title="Nhấn để đổi trạng thái"
//       >
//         <option value="Planning">Dự kiến</option>
//         <option value="Active">Đang mở</option>
//         <option value="Cancelled">Đã hủy</option>
//       </select>
//     );
//   };

//   const inputCls = "w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500 bg-white";
//   const labelCls = "block text-xs font-medium text-slate-600 mb-1.5";

//   return (
//     <div className="bg-slate-50 min-h-screen p-6 font-sans">
//       <div className="max-w-[1400px] mx-auto">

//         {/* Header */}
//         <div className="flex justify-between items-center mb-6">
//           <h1 className="text-[22px] font-bold text-slate-800 tracking-tight">Quản lý Lớp Tín Chỉ</h1>
//           <button
//             onClick={handleOpenWizard}
//             className="flex items-center gap-2 bg-[#d32f2f] text-white px-5 py-2.5 rounded shadow-sm hover:bg-red-700 transition-colors text-sm font-semibold"
//           >
//             <Plus size={16} /> Tạo Lớp Mới
//           </button>
//         </div>

//         {/* Filter */}
//         <div className="bg-white rounded-lg border border-slate-200 p-5 mb-6 shadow-sm">
//           <div className="flex flex-wrap gap-5 items-end">
//             <div className="flex-1 min-w-[160px]">
//               <label className="block text-xs font-bold text-slate-600 mb-2">Học kỳ</label>
//               <SearchableSelect options={semesters} value={selectedSemester} onChange={setSelectedSemester} />
//             </div>
//             <div className="flex-1 min-w-[160px]">
//               <label className="block text-xs font-bold text-slate-600 mb-2">Khoa/Bộ môn</label>
//               <select
//                 className="w-full border border-slate-300 rounded text-sm px-3 py-[9px] text-slate-700 bg-white focus:outline-none focus:border-[#1565c0]"
//                 value={selectedFaculty}
//                 onChange={(e) => setSelectedFaculty(e.target.value)}
//               >
//                 <option value="">Tất cả khoa</option>
//                 {faculties.map(f => (
//                   <option key={f.value} value={f.value}>{f.label}</option>
//                 ))}
//               </select>
//             </div>
//             <div className="flex-1 min-w-[180px]">
//               <label className="block text-xs font-bold text-slate-600 mb-2">Môn học</label>
//               <SearchableSelect
//                 options={[{ value: '', label: 'Tất cả môn học' }, ...subjects]}
//                 value={selectedSubject}
//                 onChange={setSelectedSubject}
//                 placeholder="Chọn môn học..."
//               />
//             </div>
//             <div className="flex-1 min-w-[160px]">
//               <label className="block text-xs font-bold text-slate-600 mb-2">Tìm kiếm</label>
//               <div className="relative">
//                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
//                 <input
//                   type="text"
//                   placeholder="Mã lớp..."
//                   className="w-full pl-9 pr-3 py-[9px] border border-slate-300 rounded text-sm focus:outline-none focus:border-[#1565c0]"
//                   value={searchTerm}
//                   onChange={(e) => setSearchTerm(e.target.value)}
//                 />
//               </div>
//             </div>
//             <button
//               onClick={() => { setSelectedFaculty(''); setSelectedSubject(''); setSearchTerm(''); }}
//               className="flex items-center justify-center gap-2 px-6 py-[9px] border border-[#1565c0] rounded text-sm font-semibold text-[#1565c0] hover:bg-blue-50 transition-colors h-[40px]"
//             >
//               <Filter size={16} /> Xóa lọc
//             </button>
//           </div>
//         </div>

//         {/* Table */}
//         <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-6 shadow-sm">
//           <div className="overflow-x-auto">
//             <table className="w-full text-left border-collapse">
//               <thead>
//                 <tr className="bg-[#f4f5f7] border-b border-slate-200 text-slate-700 text-[13px]">
//                   <th className="py-3.5 px-4 font-bold whitespace-nowrap">Mã Lớp TC</th>
//                   <th className="py-3.5 px-4 font-bold">Môn học</th>
//                   <th className="py-3.5 px-4 font-bold whitespace-nowrap">Nhóm / Tổ</th>
//                   <th className="py-3.5 px-4 font-bold min-w-[140px]">Giảng viên</th>
//                   <th className="py-3.5 px-4 font-bold min-w-[140px]">Lớp biên chế dự kiến</th>
//                   <th className="py-3.5 px-4 font-bold text-center">Phân loại</th>
//                   <th className="py-3.5 px-4 font-bold text-center">Sĩ số</th>
//                   <th className="py-3.5 px-4 font-bold text-center">Trạng thái</th>
//                   <th className="py-3.5 px-4 font-bold text-center">Thao tác</th>
//                 </tr>
//               </thead>
//               <tbody className="text-[14px]">
//                 {loading ? (
//                   <tr><td colSpan="9" className="text-center py-10 text-slate-500">Đang tải dữ liệu...</td></tr>
//                 ) : flatData.length === 0 ? (
//                   <tr><td colSpan="9" className="text-center py-10 text-slate-500">Không tìm thấy lớp nào</td></tr>
//                 ) : (
//                   flatData.map((item) => {
//                     const isSub = !!item.parent_class_id;
//                     const parent = item._parent;
//                     const targets = isSub
//                       ? (item.target_classes?.length ? item.target_classes : (parent?.target_classes || []))
//                       : (item.target_classes || []);

//                     return (
//                       <tr
//                         key={item.class_id}
//                         className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${isSub ? 'bg-slate-50/40' : 'bg-white'}`}
//                       >
//                         <td className={`py-3.5 px-4 font-medium whitespace-nowrap ${isSub ? 'text-slate-500 pl-8' : 'text-[#1565c0] font-bold'}`}>
//                           {item.class_id}
//                         </td>
//                         <td className={`py-3.5 px-4 ${isSub ? 'text-slate-500' : 'text-slate-700 font-medium'}`}>
//                           {getSubjectLabel(item.subject_id || parent?.subject_id)}
//                         </td>
//                         <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
//                           {getHierarchyLabel(item, parent)}
//                         </td>
//                         <td className="py-3.5 px-4 text-slate-700">{getLecturerName(item.lecturer_id)}</td>
//                         <td className="py-3.5 px-4 text-slate-600 text-[13px]">{getTargetClassesLabel(targets)}</td>
//                         <td className="py-3.5 px-4 text-center">
//                           <span className="bg-[#f1f3f5] text-slate-700 px-3 py-1.5 rounded-md text-[12px] font-medium">
//                             {item.class_type === 'Theory' ? 'Lý thuyết' : item.class_type === 'Practice' ? 'Thực hành' : 'Chung'}
//                           </span>
//                         </td>
//                         <td className="py-3.5 px-4 text-center text-slate-700">{item.current_students ?? 0}/{item.max_students}</td>
//                         <td className="py-3.5 px-4 text-center"><StatusBadge item={item} /></td>
//                         <td className="py-3.5 px-4 text-center">
//                           <div className="flex items-center justify-center gap-4 text-slate-500">
//                             <button onClick={() => handleEditClick(item)} className="hover:text-[#1565c0] transition-colors">
//                               <Edit2 size={16} strokeWidth={2} />
//                             </button>
//                             <button className="hover:text-red-600 transition-colors">
//                               <Trash2 size={16} strokeWidth={2} />
//                             </button>
//                           </div>
//                         </td>
//                       </tr>
//                     );
//                   })
//                 )}
//               </tbody>
//             </table>
//           </div>

//           <div className="bg-white border-t border-slate-200 p-4 flex justify-between items-center text-[13px] text-slate-600 font-medium px-6">
//             <div>Hiển thị {flatData.length} lớp</div>
//             <div className="flex items-center gap-1.5">
//               <button className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:bg-slate-100"><ChevronRight size={16} className="rotate-180" /></button>
//               <button className="w-8 h-8 flex items-center justify-center rounded bg-[#1565c0] text-white font-bold">1</button>
//               <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600">2</button>
//               <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600">3</button>
//               <button className="w-8 h-8 flex items-center justify-center rounded text-slate-600 hover:bg-slate-100"><ChevronRight size={16} /></button>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* ========== WIZARD TẠO LỚP – căn giữa, padding thoáng ========== */}
//       {isWizardOpen && (
//         <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 sm:p-6">
//           <div className="bg-white w-full max-w-[880px] max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
            
//             {/* Header */}
//             <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
//               <h2 className="text-base font-semibold text-blue-800">
//                 Cấu hình Nhóm & Tổ
//                 {wizardData.semester_id ? ` – ${getSemesterLabel(wizardData.semester_id)}` : ''}
//               </h2>
//               <button
//                 onClick={() => setIsWizardOpen(false)}
//                 className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
//               >
//                 <X size={18} />
//               </button>
//             </div>

//             {/* Body – scroll riêng, padding thoáng */}
//             <div className="flex-1 overflow-y-auto px-6 py-5">
              
//               {/* 1. Thông tin chung */}
//               <div className="mb-6">
//                 <h3 className="text-sm font-semibold text-slate-700 mb-3">1. Thông tin chung</h3>
//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
//                   <div>
//                     <label className={labelCls}>Học kỳ <span className="text-red-500">*</span></label>
//                     <SearchableSelect
//                       options={semesters}
//                       value={wizardData.semester_id}
//                       onChange={(val) => setWizardData(prev => ({ ...prev, semester_id: val }))}
//                       placeholder="Chọn học kỳ..."
//                     />
//                   </div>
//                   <div>
//                     <label className={labelCls}>Môn học <span className="text-red-500">*</span></label>
//                     <SearchableSelect
//                       options={subjects}
//                       value={wizardData.subject_id}
//                       onChange={(val) => setWizardData(prev => ({ ...prev, subject_id: val }))}
//                       placeholder="Tìm môn học..."
//                     />
//                   </div>
//                 </div>
//               </div>

//               {/* 2. Cấu hình nhóm */}
//               <div>
//                 <div className="flex items-center justify-between mb-4">
//                   <h3 className="text-sm font-semibold text-slate-700">2. Cấu hình Nhóm & Tổ</h3>
//                   <button
//                     onClick={addGroup}
//                     className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
//                   >
//                     <Plus size={15} /> Thêm nhóm
//                   </button>
//                 </div>

//                 <div className="space-y-5">
//                   {wizardData.groups.map((group) => {
//                     const subSum = group.sub_groups.reduce((acc, sg) => acc + (Number(sg.max_students) || 0), 0);
//                     const mismatch = group.sub_groups.length > 0 && subSum !== Number(group.max_students);

//                     return (
//                       <div key={group.id} className="border border-slate-200 rounded-lg overflow-hidden">
//                         {/* Header nhóm */}
//                         <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
//                           <span className="text-sm font-semibold text-blue-700">
//                             Nhóm {formatGroupNumber(group.group_number)}
//                           </span>
//                           {wizardData.groups.length > 1 && (
//                             <button
//                               onClick={() => removeGroup(group.id)}
//                               className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
//                             >
//                               <Trash2 size={15} />
//                             </button>
//                           )}
//                         </div>

//                         <div className="p-4">
//                           {/* 3 trường chính */}
//                           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//                             <div>
//                               <label className={labelCls}>Giảng viên dự kiến <span className="text-red-500">*</span></label>
//                               <SearchableSelect
//                                 options={lecturers}
//                                 value={group.lecturer_id}
//                                 onChange={(val) => updateGroup(group.id, 'lecturer_id', val)}
//                                 placeholder="Chọn GV..."
//                               />
//                             </div>
//                             <div>
//                               <label className={labelCls}>Sĩ số tối đa nhóm <span className="text-red-500">*</span></label>
//                               <input
//                                 type="number"
//                                 className={inputCls}
//                                 value={group.max_students}
//                                 onChange={(e) => updateGroup(group.id, 'max_students', parseInt(e.target.value) || 0)}
//                               />
//                             </div>
//                             <div>
//                               <label className={labelCls}>Lớp biên chế dự kiến</label>
//                               <SearchableSelect
//                                 options={adminClasses}
//                                 value={group.target_classes}
//                                 onChange={(val) => updateGroup(group.id, 'target_classes', val)}
//                                 placeholder="Thêm lớp..."
//                                 multiple={true}
//                               />
//                             </div>
//                           </div>

//                           {/* Tổ thực hành */}
//                           <div className="mt-4 pt-3 border-t border-slate-100">
//                             <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
//                               <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
//                                 Tổ thực hành
//                               </span>
//                               <div className="flex items-center gap-3">
//                                 {group.sub_groups.length > 0 && (
//                                   <span className={`text-xs font-medium ${mismatch ? 'text-red-600' : 'text-green-600'}`}>
//                                     Tổng sĩ số: {subSum} / {group.max_students}
//                                     {mismatch && ' (phải bằng)'}
//                                   </span>
//                                 )}
//                                 <button
//                                   onClick={() => addSubGroup(group.id)}
//                                   className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
//                                 >
//                                   <Plus size={14} /> Thêm tổ
//                                 </button>
//                               </div>
//                             </div>

//                             {group.sub_groups.length === 0 ? (
//                               <p className="text-xs text-slate-400 italic py-1">Chưa có tổ thực hành</p>
//                             ) : (
//                               <div className="space-y-3">
//                                 {group.sub_groups.map(sg => (
//                                   <div key={sg.id} className="bg-slate-50 border border-slate-200 rounded-md px-3.5 py-3">
//                                     <div className="flex items-center justify-between mb-2.5">
//                                       <span className="text-sm font-medium text-slate-700">
//                                         Tổ {formatGroupNumber(sg.sub_group_number)}
//                                       </span>
//                                       <button
//                                         onClick={() => removeSubGroup(group.id, sg.id)}
//                                         className="text-slate-400 hover:text-red-500 p-0.5 rounded hover:bg-red-50"
//                                       >
//                                         <X size={14} />
//                                       </button>
//                                     </div>
//                                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//                                       <div>
//                                         <label className={labelCls}>Giảng viên TH</label>
//                                         <SearchableSelect
//                                           options={lecturers}
//                                           value={sg.lecturer_id}
//                                           onChange={(val) => updateSubGroup(group.id, sg.id, 'lecturer_id', val)}
//                                           placeholder="Chọn GV..."
//                                         />
//                                       </div>
//                                       <div>
//                                         <label className={labelCls}>Sĩ số</label>
//                                         <input
//                                           type="number"
//                                           className={inputCls}
//                                           value={sg.max_students}
//                                           onChange={(e) => updateSubGroup(group.id, sg.id, 'max_students', parseInt(e.target.value) || 0)}
//                                         />
//                                       </div>
//                                     </div>
//                                   </div>
//                                 ))}
//                               </div>
//                             )}
//                           </div>
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>
//             </div>

//             {/* Footer */}
//             <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-slate-200 bg-slate-50 shrink-0">
//               <button
//                 onClick={() => setIsWizardOpen(false)}
//                 className="px-4 py-2 rounded-md border border-slate-300 text-sm font-medium text-slate-600 hover:bg-white transition-colors"
//               >
//                 Hủy
//               </button>
//               <button
//                 onClick={handleSaveDraft}
//                 className="px-5 py-2 rounded-md bg-[#d32f2f] text-white text-sm font-medium hover:bg-red-700 flex items-center gap-1.5 transition-colors"
//               >
//                 <Save size={16} /> Lưu tất cả
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ========== MODAL SỬA ========== */}
//       {editModalData && (
//         <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 sm:p-6">
//           <div className="bg-white w-full max-w-xl max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
//             <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
//               <h2 className="text-base font-semibold text-slate-800">
//                 Cập nhật: <span className="text-blue-700">{editModalData.class_id}</span>
//               </h2>
//               <button onClick={() => setEditModalData(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
//                 <X size={18} />
//               </button>
//             </div>

//             <div className="flex-1 overflow-y-auto px-6 py-5">
//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 pb-4 border-b border-slate-100">
//                 <div>
//                   <label className={labelCls}>Môn học</label>
//                   <input type="text" disabled value={getSubjectLabel(editModalData.subject_id)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-500" />
//                 </div>
//                 <div>
//                   <label className={labelCls}>Phân loại</label>
//                   <input
//                     type="text"
//                     disabled
//                     value={editModalData.class_type === 'Theory' ? 'Lý thuyết (Nhóm)' : editModalData.class_type === 'Practice' ? 'Thực hành (Tổ)' : 'Hỗn hợp'}
//                     className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-500 text-center"
//                   />
//                 </div>
//               </div>

//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
//                 <div>
//                   <label className={labelCls}>Giảng viên <span className="text-red-500">*</span></label>
//                   <SearchableSelect
//                     options={lecturers}
//                     value={editModalData.lecturer_id}
//                     onChange={(val) => setEditModalData({ ...editModalData, lecturer_id: val })}
//                   />
//                 </div>
//                 <div>
//                   <label className={labelCls}>Sĩ số tối đa <span className="text-red-500">*</span></label>
//                   <input
//                     type="number"
//                     className={inputCls}
//                     value={editModalData.max_students}
//                     onChange={(e) => setEditModalData({ ...editModalData, max_students: parseInt(e.target.value) || 0 })}
//                   />
//                 </div>
//               </div>

//               {!editModalData.parent_class_id && (
//                 <div>
//                   <label className={labelCls}>Lớp biên chế dự kiến</label>
//                   <SearchableSelect
//                     options={adminClasses}
//                     value={editModalData.target_classes || []}
//                     onChange={(val) => setEditModalData({ ...editModalData, target_classes: val })}
//                     multiple={true}
//                     placeholder="Chọn lớp..."
//                   />
//                   <p className="text-xs text-slate-400 mt-1.5">Tổ thực hành sẽ kế thừa danh sách này.</p>
//                 </div>
//               )}
//             </div>

//             <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-slate-200 bg-slate-50 shrink-0">
//               <button onClick={() => setEditModalData(null)} className="px-4 py-2 rounded-md border border-slate-300 text-sm font-medium text-slate-600 hover:bg-white">
//                 Hủy
//               </button>
//               <button onClick={handleSaveEdit} className="px-5 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5">
//                 <Save size={16} /> Lưu
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }