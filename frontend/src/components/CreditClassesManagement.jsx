import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, ChevronDown, ChevronRight, Save, X, Filter } from 'lucide-react';
import SearchableSelect from './SearchableSelect';

export default function CreditClassesManagement({ showToast }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [adminClasses, setAdminClasses] = useState([]);
  
  const [selectedSemester, setSelectedSemester] = useState("");
  const [expandedRows, setExpandedRows] = useState(new Set());
  
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editModalData, setEditModalData] = useState(null);
  const [wizardData, setWizardData] = useState({
    semester_id: "",
    subject_id: "",
    groups: []
  });

  // Luôn bắt đầu từ Nhóm 01
  const generateEmptyGroup = (index = 0) => ({
    id: Date.now() + Math.random(),
    group_number: index + 1,
    lecturer_id: "",
    max_students: 100,
    room: "",
    start_date: "",
    end_date: "",
    start_time: "07:00",
    end_time: "09:00",
    target_classes: [],
    sub_groups: []
  });

  const generateEmptySubGroup = (parentGroup) => ({
    id: Date.now() + Math.random(),
    sub_group_number: parentGroup.sub_groups.length + 1,
    lecturer_id: parentGroup.lecturer_id,
    max_students: 40,
    room: "",
    start_date: "",
    end_date: "",
    start_time: "07:00",
    end_time: "09:00"
  });

  const toggleRow = (classId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(classId)) newExpanded.delete(classId);
    else newExpanded.add(classId);
    setExpandedRows(newExpanded);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [clsRes, subRes, lecRes, semRes, adminRes] = await Promise.all([
        fetch('http://localhost:8000/api/lop_tin_chi/').then(r => r.json()),
        fetch('http://localhost:8000/api/subjects/').then(r => r.json()),
        fetch('http://localhost:8000/api/admin/lecturers/').then(r => r.json()),
        fetch('http://localhost:8000/api/semesters/').then(r => r.json()),
        fetch('http://localhost:8000/api/administrative-classes/').then(r => r.json())
      ]);
      setClasses(clsRes.data || clsRes);
      setSubjects(subRes.map(s => ({ value: s.subject_id, label: `${s.subject_id} - ${s.subject_name}` })));
      setLecturers(lecRes.map(l => ({ value: l.lecturer_id, label: `${l.lecturer_id} - ${l.full_name}` })));
      
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
      setAdminClasses(actualAdminRes.map(c => ({ value: c.class_id, label: c.class_id })));
    } catch (error) {
      if (showToast) showToast('Lỗi khi tải dữ liệu!', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getSubjectName = (id) => subjects.find(s => s.value === id)?.label.split(' - ')[1] || 'Đang cập nhật';
  const getLecturerName = (id) => lecturers.find(l => l.value === id)?.label.split(' - ')[1] || (id || '—');
  
  // Hiển thị danh sách lớp biên chế gọn
  const getTargetClassesLabel = (targetClasses) => {
    if (!targetClasses || targetClasses.length === 0) return '—';
    if (Array.isArray(targetClasses)) {
      return targetClasses.length > 2 
        ? `${targetClasses.slice(0, 2).join(', ')} +${targetClasses.length - 2}` 
        : targetClasses.join(', ');
    }
    return targetClasses;
  };

  // Format số nhóm/tổ thành 01, 02...
  const formatGroupNumber = (num) => {
    if (!num && num !== 0) return '01';
    return String(num).padStart(2, '0');
  };

  const treeData = useMemo(() => {
    let filtered = classes.filter(c => {
      if (selectedSemester && c.semester_id !== selectedSemester) return false;
      if (searchTerm && !c.class_id.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });

    const groups = filtered.filter(c => !c.parent_class_id);
    const subGroups = classes.filter(c => c.parent_class_id);

    return groups.map(g => ({
      ...g,
      children: subGroups.filter(sg => sg.parent_class_id === g.class_id)
    }));
  }, [classes, selectedSemester, searchTerm]);

  const handleEditClick = (classItem) => {
    let subjId = classItem.subject_id;
    if (!subjId && classItem.parent_class_id) {
      const parent = classes.find(c => c.class_id === classItem.parent_class_id);
      subjId = parent?.subject_id;
    }

    setEditModalData({
      ...classItem,
      subject_id: subjId, 
      target_classes: classItem.target_classes || [],
      room: classItem.room || "",
      start_date: classItem.start_date || "",
      end_date: classItem.end_date || "",
      start_time: classItem.start_time || "07:00",
      end_time: classItem.end_time || "09:00",
    });
  };

  const handleSaveEdit = async () => {
    if (!editModalData.lecturer_id || !editModalData.max_students) {
      if (showToast) showToast('Vui lòng điền đủ Giảng viên và Sĩ số!', 'error');
      return;
    }
    try {
      const res = await fetch(`http://localhost:8000/api/lop_tin_chi/${editModalData.class_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lecturer_id: editModalData.lecturer_id,
          max_students: editModalData.max_students,
          target_classes: editModalData.target_classes,
          room: editModalData.room,
          start_date: editModalData.start_date,
          end_date: editModalData.end_date,
          start_time: editModalData.start_time,
          end_time: editModalData.end_time
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
    // Mặc định luôn có Nhóm 01
    setWizardData(prev => ({
      ...prev,
      subject_id: "",
      groups: [generateEmptyGroup(0)]
    }));
    setIsWizardOpen(true);
  };

  const addGroup = () => {
    setWizardData(prev => ({
      ...prev,
      groups: [...prev.groups, generateEmptyGroup(prev.groups.length)]
    }));
  };

  const removeGroup = (groupId) => {
    setWizardData(prev => {
      const filtered = prev.groups.filter(g => g.id !== groupId);
      // Đánh số lại từ 01
      return {
        ...prev,
        groups: filtered.map((g, idx) => ({ ...g, group_number: idx + 1 }))
      };
    });
  };

  const addSubGroup = (groupId) => {
    setWizardData(prev => ({
      ...prev,
      groups: prev.groups.map(g =>
        g.id === groupId
          ? { ...g, sub_groups: [...g.sub_groups, generateEmptySubGroup(g)] }
          : g
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
    const invalidGroups = wizardData.groups.some(g => !g.lecturer_id || !g.max_students);
    if (invalidGroups) {
      if (showToast) showToast('Vui lòng điền đủ Giảng viên và Sĩ số cho tất cả các Nhóm!', 'error');
      return;
    }
    if (!wizardData.subject_id) {
      if (showToast) showToast('Vui lòng chọn Môn học!', 'error');
      return;
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
          room: g.room,
          start_date: g.start_date,
          end_date: g.end_date,
          start_time: g.start_time,
          end_time: g.end_time,
          sub_groups: g.sub_groups.map(sg => ({
            class_group: formatGroupNumber(sg.sub_group_number),
            max_students: sg.max_students,
            class_type: "Practice",
            lecturer_id: sg.lecturer_id,
            room: sg.room,
            start_date: sg.start_date,
            end_date: sg.end_date,
            start_time: sg.start_time,
            end_time: sg.end_time
          }))
        }))
      };
      const res = await fetch('http://localhost:8000/api/lop_tin_chi/save-draft', {
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

  return (
    <div className="bg-gray-50 min-h-screen p-5 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <h1 className="text-xl font-semibold">Quản lý Lớp Tín Chỉ</h1>
          <button 
            onClick={handleOpenWizard} 
            className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm"
          >
            <Plus size={16} /> Tạo Lớp Mới
          </button>
        </div>

        {/* Filter */}
        <div className="bg-white border border-gray-200 rounded p-4 mb-5">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Học kỳ</label>
              <SearchableSelect options={semesters} value={selectedSemester} onChange={setSelectedSemester} />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Khoa/Bộ môn</label>
              <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                <option>Công nghệ thông tin</option>
              </select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Môn học</label>
              <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                <option>Tất cả</option>
              </select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Tìm kiếm</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Mã lớp..." 
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </div>
            </div>
            <button className="flex items-center gap-1.5 px-4 py-2 border border-blue-600 text-blue-600 rounded text-sm hover:bg-blue-50">
              <Filter size={15} /> Lọc
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200 text-left text-gray-700">
                  <th className="py-3 px-3 w-10"></th>
                  <th className="py-3 px-3 font-medium whitespace-nowrap">Mã Lớp TC</th>
                  <th className="py-3 px-3 font-medium">Tên Môn Học</th>
                  <th className="py-3 px-3 font-medium whitespace-nowrap">Nhóm/Tổ</th>
                  <th className="py-3 px-3 font-medium">Giảng viên dự kiến</th>
                  <th className="py-3 px-3 font-medium">Lớp biên chế dự kiến</th>
                  <th className="py-3 px-3 font-medium">Phòng & Lịch</th>
                  <th className="py-3 px-3 font-medium text-center">Loại</th>
                  <th className="py-3 px-3 font-medium text-center">Sĩ số</th>
                  <th className="py-3 px-3 font-medium text-center">Trạng thái</th>
                  <th className="py-3 px-3 font-medium text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="11" className="text-center py-8 text-gray-500">Đang tải dữ liệu...</td></tr>
                ) : treeData.length === 0 ? (
                  <tr><td colSpan="11" className="text-center py-8 text-gray-500">Không tìm thấy lớp nào</td></tr>
                ) : (
                  treeData.map((group) => (
                    <React.Fragment key={group.class_id}>
                      {/* Hàng Nhóm */}
                      <tr className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-3 text-center">
                          {group.children?.length > 0 && (
                            <button onClick={() => toggleRow(group.class_id)} className="text-gray-500 hover:text-gray-800">
                              {expandedRows.has(group.class_id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-3 font-medium text-blue-700 whitespace-nowrap">{group.class_id}</td>
                        <td className="py-3 px-3">{getSubjectName(group.subject_id)}</td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          Nhóm {formatGroupNumber(group.class_group || group.group_number)}
                        </td>
                        <td className="py-3 px-3 text-gray-700">
                          {getLecturerName(group.lecturer_id)}
                        </td>
                        <td className="py-3 px-3 text-gray-600 text-xs">
                          {getTargetClassesLabel(group.target_classes)}
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          {group.room ? (
                            <div className="text-xs">
                              <div>P. {group.room}</div>
                              <div>{group.start_time} – {group.end_time}</div>
                              <div className="text-gray-400">{group.start_date} → {group.end_date}</div>
                            </div>
                          ) : <span className="text-xs text-gray-400">Chưa xếp lịch</span>}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                            {group.class_type === 'Theory' ? 'Lý thuyết' : 'Chung'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">{group.current_students}/{group.max_students}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            group.status === 'Active' ? 'bg-green-100 text-green-700' : 
                            group.status === 'Planning' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {group.status === 'Active' ? 'Đang mở' : group.status === 'Planning' ? 'Dự kiến' : 'Đã đầy'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex justify-center gap-3 text-gray-500">
                            <button onClick={() => handleEditClick(group)} className="hover:text-blue-600"><Edit2 size={15} /></button>
                            <button className="hover:text-red-600"><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Hàng Tổ */}
                      {expandedRows.has(group.class_id) && group.children?.map((sg) => (
                        <tr key={sg.class_id} className="border-b border-gray-100 bg-gray-50/50 hover:bg-gray-50">
                          <td className="py-2.5 px-3"></td>
                          <td className="py-2.5 px-3 text-gray-500 pl-6 whitespace-nowrap">{sg.class_id}</td>
                          <td className="py-2.5 px-3 text-gray-500">{getSubjectName(group.subject_id)}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            Tổ {formatGroupNumber(sg.class_group || sg.sub_group_number)}
                          </td>
                          <td className="py-2.5 px-3 text-gray-600">
                            {getLecturerName(sg.lecturer_id)}
                          </td>
                          <td className="py-2.5 px-3 text-gray-400 text-xs">
                            {/* Tổ kế thừa từ nhóm cha */}
                            {getTargetClassesLabel(group.target_classes)}
                          </td>
                          <td className="py-2.5 px-3 text-gray-600">
                            {sg.room ? (
                              <div className="text-xs">
                                <div>P. {sg.room}</div>
                                <div>{sg.start_time} – {sg.end_time}</div>
                                <div className="text-gray-400">{sg.start_date} → {sg.end_date}</div>
                              </div>
                            ) : <span className="text-xs text-gray-400">Chưa xếp lịch</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">Thực hành</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">{sg.current_students}/{sg.max_students}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              sg.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {sg.status === 'Active' ? 'Đang mở' : 'Đã đầy'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex justify-center gap-3 text-gray-500">
                              <button onClick={() => handleEditClick(sg)} className="hover:text-blue-600"><Edit2 size={15} /></button>
                              <button className="hover:text-red-600"><Trash2 size={15} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {expandedRows.has(group.class_id) && group.children?.length === 0 && (
                        <tr className="border-b border-gray-100">
                          <td className="py-2.5 px-3"></td>
                          <td colSpan="10" className="py-2.5 px-3 text-gray-400 italic text-sm">Không có lớp thực hành</td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="border-t border-gray-200 px-4 py-3 flex justify-between items-center text-sm text-gray-600">
            <div>Hiển thị 1-10 của 124 lớp</div>
            <div className="flex gap-1">
              <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400">
                <ChevronRight size={16} className="rotate-180" />
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded bg-blue-600 text-white">1</button>
              <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100">2</button>
              <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100">3</button>
              <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== WIZARD TẠO LỚP ===== */}
      {isWizardOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-lg shadow-lg flex flex-col">
            <div className="border-b border-gray-200 px-5 py-3 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-blue-700">Tạo Lớp Tín Chỉ Mới</h2>
              <button onClick={() => setIsWizardOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {/* Step 1 */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">1. Thông tin chung</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Học kỳ <span className="text-red-500">*</span></label>
                    <SearchableSelect 
                      options={semesters} 
                      value={wizardData.semester_id} 
                      onChange={(val) => setWizardData(prev => ({...prev, semester_id: val}))} 
                      placeholder="Chọn học kỳ..." 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Môn học <span className="text-red-500">*</span></label>
                    <SearchableSelect 
                      options={subjects} 
                      value={wizardData.subject_id} 
                      onChange={(val) => setWizardData(prev => ({...prev, subject_id: val}))} 
                      placeholder="Tìm môn học..." 
                    />
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">2. Cấu hình Nhóm & Tổ</h3>
                
                {wizardData.groups.map((group) => (
                  <div key={group.id} className="border border-gray-200 rounded p-4 mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-semibold text-blue-700">
                        Nhóm {formatGroupNumber(group.group_number)}
                      </span>
                      {wizardData.groups.length > 1 && (
                        <button onClick={() => removeGroup(group.id)} className="text-gray-400 hover:text-red-600">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Giảng viên phân công dự kiến <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect 
                          options={lecturers} 
                          value={group.lecturer_id} 
                          onChange={(val) => updateGroup(group.id, 'lecturer_id', val)} 
                          placeholder="Chọn GV..." 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Sĩ số tối đa</label>
                        <input 
                          type="number" 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" 
                          value={group.max_students} 
                          onChange={(e) => updateGroup(group.id, 'max_students', parseInt(e.target.value) || 0)} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Lớp biên chế dự kiến
                        </label>
                        <SearchableSelect 
                          options={adminClasses} 
                          value={group.target_classes} 
                          onChange={(val) => updateGroup(group.id, 'target_classes', val)} 
                          placeholder="Thêm lớp..." 
                          multiple={true} 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Phòng học (LT)</label>
                        <input 
                          type="text" 
                          placeholder="VD: 301-A2" 
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" 
                          value={group.room} 
                          onChange={(e) => updateGroup(group.id, 'room', e.target.value)} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Thời gian (ngày)</label>
                        <div className="flex items-center gap-1.5">
                          <input type="date" className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" value={group.start_date} onChange={(e) => updateGroup(group.id, 'start_date', e.target.value)} />
                          <span className="text-gray-400">–</span>
                          <input type="date" className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" value={group.end_date} onChange={(e) => updateGroup(group.id, 'end_date', e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Ca học</label>
                        <div className="flex items-center gap-1.5">
                          <input type="time" className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" value={group.start_time} onChange={(e) => updateGroup(group.id, 'start_time', e.target.value)} />
                          <span className="text-gray-400">–</span>
                          <input type="time" className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" value={group.end_time} onChange={(e) => updateGroup(group.id, 'end_time', e.target.value)} />
                        </div>
                      </div>
                    </div>

                    {/* Tổ thực hành */}
                    <div className="bg-gray-50 border border-gray-200 rounded p-3">
                      <div className="text-xs font-medium text-gray-500 mb-2">Tổ thực hành</div>
                      
                      {group.sub_groups.map(sg => (
                        <div key={sg.id} className="bg-white border border-gray-200 rounded p-3 mb-2">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-blue-700">
                              Tổ {formatGroupNumber(sg.sub_group_number)}
                            </span>
                            <button onClick={() => removeSubGroup(group.id, sg.id)} className="text-gray-400 hover:text-red-500">
                              <X size={14} />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Giảng viên TH dự kiến</label>
                              <SearchableSelect 
                                options={lecturers} 
                                value={sg.lecturer_id} 
                                onChange={(val) => updateSubGroup(group.id, sg.id, 'lecturer_id', val)} 
                                placeholder="Chọn GV..." 
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Sĩ số</label>
                              <input 
                                type="number" 
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" 
                                value={sg.max_students} 
                                onChange={(e) => updateSubGroup(group.id, sg.id, 'max_students', parseInt(e.target.value) || 0)} 
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Phòng máy</label>
                              <input 
                                type="text" 
                                placeholder="Lab 1" 
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" 
                                value={sg.room} 
                                onChange={(e) => updateSubGroup(group.id, sg.id, 'room', e.target.value)} 
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Thời gian</label>
                              <div className="flex items-center gap-1">
                                <input type="date" className="w-full px-1.5 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500" value={sg.start_date} onChange={(e) => updateSubGroup(group.id, sg.id, 'start_date', e.target.value)} />
                                <span className="text-gray-400 text-xs">–</span>
                                <input type="date" className="w-full px-1.5 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500" value={sg.end_date} onChange={(e) => updateSubGroup(group.id, sg.id, 'end_date', e.target.value)} />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Ca học</label>
                              <div className="flex items-center gap-1">
                                <input type="time" className="w-full px-1.5 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500" value={sg.start_time} onChange={(e) => updateSubGroup(group.id, sg.id, 'start_time', e.target.value)} />
                                <span className="text-gray-400 text-xs">–</span>
                                <input type="time" className="w-full px-1.5 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-blue-500" value={sg.end_time} onChange={(e) => updateSubGroup(group.id, sg.id, 'end_time', e.target.value)} />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      <button 
                        onClick={() => addSubGroup(group.id)} 
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
                      >
                        <Plus size={14} /> Thêm tổ thực hành
                      </button>
                    </div>
                  </div>
                ))}
                
                <button 
                  onClick={addGroup} 
                  className="w-full border border-dashed border-gray-300 text-gray-600 py-2.5 rounded text-sm hover:bg-gray-50 flex items-center justify-center gap-1"
                >
                  <Plus size={16} /> Thêm nhóm mới
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 px-5 py-3 flex justify-end gap-3">
              <button onClick={() => setIsWizardOpen(false)} className="px-4 py-2 rounded border border-gray-300 text-sm hover:bg-gray-50">
                Hủy
              </button>
              <button onClick={handleSaveDraft} className="px-5 py-2 rounded bg-red-600 text-white text-sm hover:bg-red-700 flex items-center gap-1.5">
                <Save size={16} /> Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL SỬA ===== */}
      {editModalData && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-lg shadow-lg flex flex-col">
            <div className="border-b border-gray-200 px-5 py-3 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-blue-700">
                Cập nhật: <span className="text-gray-800">{editModalData.class_id}</span>
              </h2>
              <button onClick={() => setEditModalData(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5 pb-4 border-b border-gray-100">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Môn học</label>
                  <input 
                    type="text" 
                    disabled 
                    value={`${getSubjectName(editModalData.subject_id)} (${editModalData.subject_id})`} 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-500" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Phân loại</label>
                  <input 
                    type="text" 
                    disabled 
                    value={editModalData.class_type === 'Theory' ? 'Lý thuyết (Nhóm)' : editModalData.class_type === 'Practice' ? 'Thực hành (Tổ)' : 'Hỗn hợp'} 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-500 text-center" 
                  />
                </div>
              </div>

              <h3 className="text-xs font-semibold text-blue-700 mb-3">THÔNG TIN CƠ BẢN</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Giảng viên phân công dự kiến <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect 
                    options={lecturers} 
                    value={editModalData.lecturer_id} 
                    onChange={(val) => setEditModalData({...editModalData, lecturer_id: val})} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sĩ số tối đa <span className="text-red-500">*</span></label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" 
                    value={editModalData.max_students} 
                    onChange={(e) => setEditModalData({...editModalData, max_students: parseInt(e.target.value) || 0})} 
                  />
                </div>
              </div>

              <h3 className="text-xs font-semibold text-blue-700 mb-3">LỊCH HỌC & PHÒNG</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phòng học</label>
                  <input 
                    type="text" 
                    placeholder="VD: 301-A2" 
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" 
                    value={editModalData.room} 
                    onChange={(e) => setEditModalData({...editModalData, room: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Thời gian (ngày)</label>
                  <div className="flex items-center gap-1.5">
                    <input type="date" className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" value={editModalData.start_date} onChange={(e) => setEditModalData({...editModalData, start_date: e.target.value})} />
                    <span className="text-gray-400">–</span>
                    <input type="date" className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" value={editModalData.end_date} onChange={(e) => setEditModalData({...editModalData, end_date: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ca học</label>
                  <div className="flex items-center gap-1.5">
                    <input type="time" className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" value={editModalData.start_time} onChange={(e) => setEditModalData({...editModalData, start_time: e.target.value})} />
                    <span className="text-gray-400">–</span>
                    <input type="time" className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" value={editModalData.end_time} onChange={(e) => setEditModalData({...editModalData, end_time: e.target.value})} />
                  </div>
                </div>
              </div>

              {!editModalData.parent_class_id && (
                <div className="pt-4 border-t border-gray-100">
                  <h3 className="text-xs font-semibold text-blue-700 mb-3">PHÂN LUỒNG SINH VIÊN</h3>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Lớp biên chế dự kiến</label>
                  <SearchableSelect 
                    options={adminClasses} 
                    value={editModalData.target_classes || []} 
                    onChange={(val) => setEditModalData({...editModalData, target_classes: val})} 
                    multiple={true} 
                    placeholder="Chọn lớp..." 
                  />
                  <p className="text-xs text-gray-400 mt-1">Tổ thực hành sẽ kế thừa danh sách này.</p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 px-5 py-3 flex justify-end gap-3">
              <button onClick={() => setEditModalData(null)} className="px-4 py-2 rounded border border-gray-300 text-sm hover:bg-gray-50">
                Hủy
              </button>
              <button onClick={handleSaveEdit} className="px-5 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 flex items-center gap-1.5">
                <Save size={16} /> Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}