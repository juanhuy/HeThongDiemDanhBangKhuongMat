import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen, Check, Edit2, Loader2, Plus, AlertCircle, X, Search,
  UserPlus, Users, Clock, AlertTriangle, Calendar, UserCheck
} from 'lucide-react';
import SearchableSelect from './SearchableSelect';

const initialSingleForm = {
  subject_id: '',
  lecturer_id: '',
  semester: '1',
  academic_year: '2024-2025',
  class_group: '',
  class_type: 'Theory',
  max_students: 50,
  status: 'Active',
  target_classes: [],
};

const getInitials = (name) => {
  if (!name) return 'GV';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const CreditClassesManagement = ({ showToast }) => {
  const [subjectsList, setSubjectsList] = useState([]);
  const [lecturersList, setLecturersList] = useState([]);
  const [adminClassesList, setAdminClassesList] = useState([]);
  
  const [classes, setClasses] = useState([]);
  const [filters, setFilters] = useState({ subject_id: '', status: 'all', department: 'all' });
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  
  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Forms state
  const [singleForm, setSingleForm] = useState(initialSingleForm);
  const [editForm, setEditForm] = useState(initialSingleForm);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New UI states
  const [selectedAssignClass, setSelectedAssignClass] = useState(null);
  const [lecturerSearchTerm, setLecturerSearchTerm] = useState('');

  useEffect(() => {
    fetchMetadata();
    fetchCreditClasses();
  }, []);

  const notify = (message, type = 'success') => {
    if (typeof showToast === 'function') {
      showToast(message, type);
    }
  };

  const parseApiError = async (res) => {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      return json.detail || json.message || json.error || 'Không thể xử lý yêu cầu';
    } catch {
      return text || 'Không thể xử lý yêu cầu';
    }
  };

  const fetchMetadata = async () => {
    try {
      const [subjRes, lectRes, adminRes] = await Promise.all([
        fetch('http://localhost:8000/api/subjects/'),
        fetch('http://localhost:8000/api/admin/lecturers/'),
        fetch('http://localhost:8000/api/lop_tin_chi/administrative-classes')
      ]);
      
      if (subjRes.ok) {
        const data = await subjRes.json();
        setSubjectsList(Array.isArray(data) ? data : data.items || []);
      }
      if (lectRes.ok) {
        const data = await lectRes.json();
        setLecturersList(Array.isArray(data) ? data : data.items || []);
      }
      if (adminRes.ok) {
        const data = await adminRes.json();
        setAdminClassesList(Array.isArray(data) ? data : data.data || []);
      }
    } catch (error) {
      console.error('fetchMetadata error', error);
    }
  };

  const fetchCreditClasses = async () => {
    setIsLoadingLists(true);
    try {
      const res = await fetch('http://localhost:8000/api/lop_tin_chi');
      if (res.ok) {
        const data = await res.json();
        setClasses(Array.isArray(data) ? data : data.data || []);
      }
    } catch (error) {
      console.error('fetchCreditClasses error', error);
    } finally {
      setIsLoadingLists(false);
    }
  };

  const handleCreate = async () => {
    if (!singleForm.subject_id) {
      notify('Vui lòng chọn môn học.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const semesterId = `${singleForm.academic_year.replace('-', '_')}_${singleForm.semester}`;
      const payload = {
        ...singleForm,
        semester_id: semesterId,
        max_students: Number(singleForm.max_students) || 0,
        target_classes: singleForm.target_classes,
        lecturer_id: singleForm.lecturer_id || null
      };

      const res = await fetch('http://localhost:8000/api/lop_tin_chi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        notify('Đã tạo lớp tín chỉ thành công.', 'success');
        setSingleForm(initialSingleForm);
        setIsCreateModalOpen(false);
        fetchCreditClasses();
      } else {
        const err = await parseApiError(res);
        notify(`Lỗi tạo lớp: ${err}`, 'error');
      }
    } catch (error) {
      notify('Không thể kết nối server.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (creditClass) => {
    const parts = creditClass.semester_id?.split('_') || ['2024', '2025', '1'];
    const academic_year = parts.length >= 3 ? `${parts[0]}-${parts[1]}` : '2024-2025';
    const semester = parts.length >= 3 ? parts[2] : '1';

    setEditForm({
      class_id: creditClass.class_id,
      subject_id: creditClass.subject_id || '',
      lecturer_id: creditClass.lecturer_id || '',
      semester: semester,
      academic_year: academic_year,
      class_group: creditClass.class_group || '',
      class_type: creditClass.class_type || 'Theory',
      max_students: creditClass.max_students || 50,
      status: creditClass.status || 'Active',
      target_classes: creditClass.target_classes || [],
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    setIsSubmitting(true);
    try {
      const semesterId = `${editForm.academic_year.replace('-', '_')}_${editForm.semester}`;
      const payload = {
        lecturer_id: editForm.lecturer_id || null,
        semester_id: semesterId,
        class_group: editForm.class_group || null,
        class_type: editForm.class_type,
        max_students: Number(editForm.max_students) || 0,
        status: editForm.status,
        target_classes: editForm.target_classes
      };

      const res = await fetch(`http://localhost:8000/api/lop_tin_chi/${editForm.class_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        notify('Cập nhật thông tin thành công.', 'success');
        setIsEditModalOpen(false);
        fetchCreditClasses();
        // Update selected class if it's the one being edited
        if (selectedAssignClass && selectedAssignClass.class_id === editForm.class_id) {
            setSelectedAssignClass(prev => ({...prev, lecturer_id: editForm.lecturer_id || null}));
        }
      } else {
        const err = await parseApiError(res);
        notify(`Lỗi cập nhật: ${err}`, 'error');
      }
    } catch (error) {
      notify('Không thể kết nối server.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignLecturer = async (lecturerId) => {
    if (!selectedAssignClass) {
        notify('Vui lòng chọn "Phân công" ở một lớp học bên danh sách lớp trước.', 'error');
        return;
    }

    setIsSubmitting(true);
    try {
      const payload = { lecturer_id: lecturerId };
      const res = await fetch(`http://localhost:8000/api/lop_tin_chi/${selectedAssignClass.class_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        notify(`Đã phân công giảng viên ${lecturerId} thành công!`, 'success');
        setSelectedAssignClass(null);
        fetchCreditClasses();
      } else {
        const err = await parseApiError(res);
        notify(`Lỗi phân công: ${err}`, 'error');
      }
    } catch (error) {
      notify('Không thể kết nối server.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredClasses = classes.filter((creditClass) => {
    if (filters.subject_id && creditClass.subject_id !== filters.subject_id) return false;
    if (filters.status === 'pending' && creditClass.lecturer_id) return false;
    if (filters.status === 'assigned' && !creditClass.lecturer_id) return false;
    return true;
  });

  const searchedLecturers = useMemo(() => {
    if (!lecturerSearchTerm) return lecturersList;
    const lowerTerm = lecturerSearchTerm.toLowerCase();
    return lecturersList.filter(l => 
        (l.full_name && l.full_name.toLowerCase().includes(lowerTerm)) ||
        (l.lecturer_id && l.lecturer_id.toLowerCase().includes(lowerTerm))
    );
  }, [lecturersList, lecturerSearchTerm]);

  const getSubjectName = (subjectId) => {
      const subject = subjectsList.find(s => s.subject_id === subjectId);
      return subject ? subject.subject_name : '';
  };

  // Options for SearchableSelect
  const subjectOptions = subjectsList.map(s => ({ value: s.subject_id, label: s.subject_name || s.subject_id, subtitle: s.subject_id }));
  const lecturerOptions = lecturersList.map(l => ({ value: l.lecturer_id, label: l.full_name || l.lecturer_id, subtitle: l.lecturer_id }));
  const adminClassOptions = adminClassesList.map(c => ({ value: c.class_id, label: c.class_id, subtitle: c.class_name }));
  const semesterOptions = [
    { value: '1', label: 'Học kỳ 1' },
    { value: '2', label: 'Học kỳ 2' },
    { value: '3', label: 'Học kỳ 3 (Hè)' }
  ];
  const statusOptions = [
    { value: 'Active', label: 'Đang mở (Active)' },
    { value: 'Planning', label: 'Lên kế hoạch (Planning)' },
    { value: 'Cancelled', label: 'Đã hủy (Cancelled)' }
  ];
  const typeOptions = [
    { value: 'Theory', label: 'Lý thuyết' },
    { value: 'Practice', label: 'Thực hành' },
    { value: 'Combined', label: 'Tích hợp' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-5 text-slate-800 relative">
      <div className="mx-auto max-w-[1400px] space-y-4">
        
        {/* Split pane layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            
            {/* LEFT PANE: Classes List */}
            <div className="xl:col-span-2 space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between border-b border-red-200 pb-3 mb-2">
                    <div className="flex items-center gap-2">
                        <BookOpen size={24} className="text-red-600" />
                        <h2 className="text-xl font-bold text-slate-900 m-0">Quản lý Lớp tín chỉ (Chờ phân công)</h2>
                    </div>
                    <div className="flex gap-2">
                        <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 shadow-sm flex items-center gap-1"
                        >
                        <Plus size={16} /> Tạo lớp tín chỉ
                        </button>
                    </div>
                </div>

                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    {/* Filters inline */}
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <div className="w-64">
                            <SearchableSelect
                            options={subjectOptions}
                            value={filters.subject_id}
                            onChange={(v) => setFilters({ ...filters, subject_id: v || '' })}
                            placeholder="Lọc theo môn học..."
                            />
                        </div>
                        <div className="w-56">
                            <SearchableSelect
                            options={[
                                { value: 'all', label: 'Trạng thái: Tất cả' },
                                { value: 'pending', label: 'Trạng thái: Chưa phân công' },
                                { value: 'assigned', label: 'Trạng thái: Đã phân công' }
                            ]}
                            value={filters.status}
                            onChange={(v) => setFilters({ ...filters, status: v || 'all' })}
                            placeholder="Trạng thái..."
                            />
                        </div>
                        <div className="w-48">
                            <SearchableSelect
                            options={[
                                { value: 'all', label: 'Khoa: Tất cả' },
                                { value: 'cntt', label: 'Khoa: CNTT' },
                            ]}
                            value={filters.department}
                            onChange={(v) => setFilters({ ...filters, department: v || 'all' })}
                            placeholder="Khoa..."
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto pb-4">
                        <table className="min-w-full border-collapse">
                            <thead>
                                <tr className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 border-b border-slate-100">
                                <th className="px-3 py-3 text-left w-32">Mã lớp</th>
                                <th className="px-3 py-3 text-left">Môn học</th>
                                <th className="px-3 py-3 text-center">Lịch dự kiến</th>
                                <th className="px-3 py-3 text-center">Sĩ số</th>
                                <th className="px-3 py-3 text-left">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoadingLists ? (
                                <tr>
                                    <td colSpan="5" className="px-3 py-6 text-center text-sm text-slate-500">
                                    <div className="inline-flex items-center gap-2">
                                        <Loader2 size={16} className="animate-spin" /> Đang tải dữ liệu...
                                    </div>
                                    </td>
                                </tr>
                                ) : filteredClasses.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-3 py-8 text-center text-sm text-slate-500">
                                    <div className="inline-flex items-center gap-2">
                                        <AlertCircle size={16} /> Không có lớp nào phù hợp
                                    </div>
                                    </td>
                                </tr>
                                ) : (
                                filteredClasses.map((creditClass) => (
                                    <tr 
                                        key={creditClass.class_id} 
                                        className={`text-sm text-slate-700 hover:bg-slate-50 transition border-b border-slate-50 last:border-0 ${
                                            selectedAssignClass?.class_id === creditClass.class_id ? 'bg-blue-50/50' : 'bg-white'
                                        }`}
                                    >
                                        <td className="px-3 py-3 font-semibold text-slate-900 text-left align-top">
                                            {creditClass.class_id}
                                            <button 
                                                onClick={() => openEditModal(creditClass)} 
                                                className="text-xs font-normal text-blue-600 hover:underline flex items-center gap-1 mt-1 opacity-70 hover:opacity-100 transition-opacity"
                                            >
                                                <Edit2 size={12}/> Sửa T.tin
                                            </button>
                                        </td>
                                        <td className="px-3 py-3 text-left align-top">
                                            <div className="font-medium text-slate-900">{getSubjectName(creditClass.subject_id)}</div>
                                            <div className="text-xs text-slate-500">Mã: {creditClass.subject_id}</div>
                                            {creditClass.lecturer_id && (
                                                <div className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                                                    <UserCheck size={12}/> {creditClass.lecturer_id}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-center align-top">
                                            <div className="inline-flex items-center justify-center gap-1.5 text-[11px] text-slate-600 bg-slate-100 px-2 py-1 rounded-md whitespace-nowrap">
                                                <Calendar size={12} /> T2 (1-3) - P.301
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-center align-top whitespace-nowrap">
                                            <span className="font-semibold">{creditClass.current_students || 0}</span>
                                            <span className="text-slate-400">/{creditClass.max_students || 0}</span>
                                        </td>
                                        <td className="px-3 py-3 text-left align-top">
                                            <button
                                                onClick={() => setSelectedAssignClass(creditClass.class_id === selectedAssignClass?.class_id ? null : creditClass)}
                                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition shadow-sm border whitespace-nowrap ${
                                                selectedAssignClass?.class_id === creditClass.class_id
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-blue-200'
                                                    : creditClass.lecturer_id 
                                                    ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                    : 'bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100 hover:border-blue-200'
                                                }`}
                                            >
                                                {selectedAssignClass?.class_id === creditClass.class_id ? (
                                                    <>Đang chọn...</>
                                                ) : creditClass.lecturer_id ? (
                                                    <><Edit2 size={14} /> Đổi GV</>
                                                ) : (
                                                    <><UserPlus size={14} /> Phân công</>
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {/* RIGHT PANE: Lecturers Dictionary */}
            <div className="xl:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-4 sticky top-5 flex flex-col h-[calc(100vh-40px)]">
                <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <Users size={20} className="text-blue-600" />
                        Tìm kiếm Giảng viên
                    </h3>
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Nhập tên hoặc mã GV..." 
                            value={lecturerSearchTerm}
                            onChange={(e) => setLecturerSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    {selectedAssignClass && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg animate-in fade-in slide-in-from-top-2">
                            <p className="text-xs text-blue-800 font-medium mb-1">Đang chọn giảng viên cho:</p>
                            <p className="font-bold text-blue-900 text-sm">{selectedAssignClass.class_id}</p>
                            <p className="text-xs text-blue-700 truncate">{getSubjectName(selectedAssignClass.subject_id)}</p>
                            <p className="text-xs text-slate-500 mt-2">👉 Vui lòng click vào một giảng viên bên dưới để phân công.</p>
                        </div>
                    )}

                    {searchedLecturers.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm flex flex-col items-center">
                            <Search size={32} className="text-slate-300 mb-2" />
                            Không tìm thấy giảng viên
                        </div>
                    ) : (
                        searchedLecturers.map(lecturer => {
                            // Mocking stats for visuals as requested by UI design
                            const isBusy = Math.random() > 0.8;
                            const classCount = Math.floor(Math.random() * 5);
                            const hoursCount = Math.floor(Math.random() * 40 + 10);
                            const hasConflict = !isBusy && Math.random() > 0.7;

                            return (
                                <div 
                                    key={lecturer.lecturer_id} 
                                    onClick={() => handleAssignLecturer(lecturer.lecturer_id)}
                                    className={`
                                        border rounded-xl p-3 transition-all duration-200 
                                        ${selectedAssignClass 
                                            ? 'cursor-pointer hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5' 
                                            : 'opacity-70 cursor-not-allowed border-slate-200'} 
                                        ${selectedAssignClass && selectedAssignClass.lecturer_id === lecturer.lecturer_id 
                                            ? 'border-emerald-500 bg-emerald-50 shadow-sm' 
                                            : 'bg-white'}
                                    `}
                                >
                                    <div className="flex items-start gap-3 mb-2">
                                        <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                            {getInitials(lecturer.full_name)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-800 text-sm truncate">{lecturer.full_name || 'Chưa cập nhật tên'}</h4>
                                            <p className="text-xs text-slate-500 truncate mb-1">Mã: {lecturer.lecturer_id} • Khoa {lecturer.faculty_id || 'CNTT'}</p>
                                            
                                            {isBusy ? (
                                                <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-md">
                                                    KÍN LỊCH
                                                </span>
                                            ) : (
                                                <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-md">
                                                    RẢNH RỖI
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-[11px] text-slate-600 border-t border-slate-100 pt-2 mt-2">
                                        <div className="flex items-center gap-1 font-medium">
                                            <Users size={12} className="text-slate-400"/> Lớp HT: {classCount}
                                        </div>
                                        <div className="flex items-center gap-1 font-medium">
                                            <Clock size={12} className="text-slate-400"/> Giờ: {hoursCount}h
                                        </div>
                                    </div>

                                    {selectedAssignClass && hasConflict && (
                                        <div className="mt-2 bg-amber-50 text-amber-700 text-[11px] p-1.5 rounded flex items-start gap-1.5 font-medium border border-amber-200/50">
                                            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                                            <span>Trùng lịch T2 (1-3) với lớp đang chọn!</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

        </div>

      </div>

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <h3 className="text-xl font-bold text-slate-900">Tạo lớp tín chỉ</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Môn học <span className="text-red-500">*</span></label>
                  <SearchableSelect
                    options={subjectOptions}
                    value={singleForm.subject_id}
                    onChange={(v) => setSingleForm({ ...singleForm, subject_id: v })}
                    placeholder="Chọn môn học..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Giảng viên (Tùy chọn)</label>
                  <SearchableSelect
                    options={lecturerOptions}
                    value={singleForm.lecturer_id}
                    onChange={(v) => setSingleForm({ ...singleForm, lecturer_id: v })}
                    placeholder="Chọn giảng viên..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Học kỳ <span className="text-red-500">*</span></label>
                  <SearchableSelect
                    options={semesterOptions}
                    value={singleForm.semester}
                    onChange={(v) => setSingleForm({ ...singleForm, semester: v })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Niên khóa <span className="text-red-500">*</span></label>
                  <input
                    value={singleForm.academic_year}
                    onChange={(e) => setSingleForm({ ...singleForm, academic_year: e.target.value })}
                    className="w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Sĩ số dự kiến</label>
                  <input
                    type="number"
                    value={singleForm.max_students}
                    onChange={(e) => setSingleForm({ ...singleForm, max_students: Number(e.target.value) || 0 })}
                    className="w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Nhóm / Tổ (Tùy chọn)</label>
                  <input
                    value={singleForm.class_group}
                    onChange={(e) => setSingleForm({ ...singleForm, class_group: e.target.value })}
                    className="w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                    placeholder="VD: 01"
                  />
                </div>
              </div>
              
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Lớp hành chính (Ghép nhóm)</label>
                <SearchableSelect
                  options={adminClassOptions}
                  value={singleForm.target_classes}
                  onChange={(v) => setSingleForm({ ...singleForm, target_classes: v })}
                  placeholder="Chọn các lớp hành chính..."
                  multiple={true}
                />
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50 p-5 rounded-b-2xl flex justify-end gap-3">
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-lg font-semibold text-slate-600 hover:bg-slate-200 transition"
              >
                Hủy
              </button>
              <button
                onClick={handleCreate}
                disabled={isSubmitting || !singleForm.subject_id}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                Tạo lớp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <h3 className="text-xl font-bold text-slate-900">Cập nhật lớp: {editForm.class_id}</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Giảng viên (Phân công)</label>
                  <SearchableSelect
                    options={lecturerOptions}
                    value={editForm.lecturer_id}
                    onChange={(v) => setEditForm({ ...editForm, lecturer_id: v })}
                    placeholder="Chưa phân công..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Sĩ số tối đa</label>
                  <input
                    type="number"
                    value={editForm.max_students}
                    onChange={(e) => setEditForm({ ...editForm, max_students: Number(e.target.value) || 0 })}
                    className="w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Nhóm / Tổ</label>
                  <input
                    value={editForm.class_group}
                    onChange={(e) => setEditForm({ ...editForm, class_group: e.target.value })}
                    className="w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Loại lớp</label>
                  <SearchableSelect
                    options={typeOptions}
                    value={editForm.class_type}
                    onChange={(v) => setEditForm({ ...editForm, class_type: v })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Trạng thái</label>
                  <SearchableSelect
                    options={statusOptions}
                    value={editForm.status}
                    onChange={(v) => setEditForm({ ...editForm, status: v })}
                  />
                </div>
              </div>
              
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Lớp hành chính (Ghép nhóm)</label>
                <SearchableSelect
                  options={adminClassOptions}
                  value={editForm.target_classes}
                  onChange={(v) => setEditForm({ ...editForm, target_classes: v })}
                  placeholder="Chọn các lớp hành chính..."
                  multiple={true}
                />
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50 p-5 rounded-b-2xl flex justify-end gap-3">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-lg font-semibold text-slate-600 hover:bg-slate-200 transition"
              >
                Hủy
              </button>
              <button
                onClick={handleUpdate}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditClassesManagement;
