import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Plus, Trash2, Copy, Users, Wand2, Calendar, X, AlertTriangle, CheckSquare, Square, Clock } from 'lucide-react';

import { listSubjects } from '../../../api/subjects';
import { API_BASE } from '../../../api/client';
import { createCreditClass } from '../../../api/creditClasses';

export default function CreateClassModal({ onClose, onSuccess, metaData, showToast }) {
  // --- STATE QUẢN LÝ TỔNG THỂ ---
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [saving, setSaving] = useState(false);

  // 1. State Môn học
  const [subjectSearch, setSubjectSearch] = useState('');
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  
  // 2. State Học kỳ (Mặc định học kỳ hiện tại)
  const [selectedSemester, setSelectedSemester] = useState(metaData?.semesters?.[0]?.semester_id || '');

  // 3. State Danh sách Lớp tín chỉ
  const [classes, setClasses] = useState([
    {
      id: Date.now(),
      name: 'Lớp 01',
      maxStudents: 60,
      assignedClasses: [],
      isClassDropdownOpen: false,
      theory: {
        lecturerDept: 'All', // Khoa của giảng viên LT
        lecturerId: '',
        day: 'Thứ 2',
        room: '',
        sessions: 3,
        startDate: '15/08/2026',
        endDate: '15/12/2026'
      },
      practicalConfig: {
        roomCapacity: 30,
        maxPerGroup: 30
      },
      practicalGroups: []
    }
  ]);

  const [subjectsList, setSubjectsList] = useState([]);
  const [rawClassrooms, setRawClassrooms] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [subRes, roomRes] = await Promise.all([
          listSubjects(),
          fetch(`${API_BASE}/api/admin/classrooms/`)
        ]);
        if (subRes && subRes.data) setSubjectsList(subRes.data);
        else if (Array.isArray(subRes)) setSubjectsList(subRes);
        
        if (roomRes.ok) {
          const roomData = await roomRes.json();
          setRawClassrooms(roomData);
        }
      } catch (err) {
        console.error('Lỗi lấy data', err);
      }
    };
    loadData();
  }, []);

  // --- LOGIC XỬ LÝ MÔN HỌC ---
  const filteredSubjects = subjectsList.filter(s => 
    (s.subject_id || '').toLowerCase().includes(subjectSearch.toLowerCase()) || 
    (s.subject_name || '').toLowerCase().includes(subjectSearch.toLowerCase())
  );

  const handleSelectSubject = (subject) => {
    setSelectedSubject(subject);
    setSubjectSearch(`${subject.subject_id} - ${subject.subject_name}`);
    setIsSubjectDropdownOpen(false);
  };

  const clearSubject = () => {
    setSelectedSubject(null);
    setSubjectSearch('');
  };

  // --- LOGIC XỬ LÝ LỚP HỌC & TỔ ---
  const handleAddClass = () => {
    setClasses([...classes, {
      id: Date.now(),
      name: `Lớp ${String(classes.length + 1).padStart(2, '0')}`,
      maxStudents: 60,
      assignedClasses: [],
      isClassDropdownOpen: false,
      theory: { lecturerDept: 'All', lecturerId: '', day: 'Thứ 2', room: '', sessions: 3, startDate: '', endDate: '' },
      practicalConfig: { roomCapacity: 30, maxPerGroup: 30 },
      practicalGroups: []
    }]);
  };

  const updateClass = (classId, field, value) => {
    setClasses(classes.map(c => c.id === classId ? { ...c, [field]: value } : c));
  };

  const updateTheory = (classId, field, value) => {
    setClasses(classes.map(c => c.id === classId ? { ...c, theory: { ...c.theory, [field]: value } } : c));
  };

  const updatePracticalConfig = (classId, field, value) => {
    setClasses(classes.map(c => c.id === classId ? { ...c, practicalConfig: { ...c.practicalConfig, [field]: value } } : c));
  };

  const toggleAssignedClass = (classId, assignedClassName) => {
    setClasses(classes.map(c => {
      if (c.id === classId) {
        const isSelected = c.assignedClasses.includes(assignedClassName);
        const newAssigned = isSelected 
          ? c.assignedClasses.filter(name => name !== assignedClassName)
          : [...c.assignedClasses, assignedClassName];
        return { ...c, assignedClasses: newAssigned };
      }
      return c;
    }));
  };

  // Tự động chia tổ TH
  const handleAutoSplit = (classId) => {
    setClasses(classes.map(c => {
      if (c.id === classId) {
        const capacity = Math.min(c.practicalConfig.roomCapacity, c.practicalConfig.maxPerGroup);
        const numGroups = Math.ceil(c.maxStudents / capacity);
        const newGroups = Array.from({ length: numGroups }).map((_, i) => ({
          id: Date.now() + i,
          name: `Tổ ${i + 1}`,
          maxStudents: (i === numGroups - 1 && c.maxStudents % capacity !== 0) ? c.maxStudents % capacity : capacity,
          lecturerId: '',
          day: 'Thứ 3',
          room: '',
          sessions: 2,
          startDate: c.theory.startDate,
          endDate: c.theory.endDate
        }));
        return { ...c, practicalGroups: newGroups };
      }
      return c;
    }));
  };

  const handleAddPracticalGroup = (classId) => {
    setClasses(classes.map(c => {
      if (c.id === classId) {
        return {
          ...c,
          practicalGroups: [...c.practicalGroups, {
            id: Date.now(),
            name: `Tổ ${c.practicalGroups.length + 1}`,
            maxStudents: c.practicalConfig.maxPerGroup,
            lecturerId: '', day: 'Thứ 3', room: '', sessions: 2, startDate: '', endDate: ''
          }]
        };
      }
      return c;
    }));
  };

  const updatePracticalGroup = (classId, groupId, field, value) => {
    setClasses(classes.map(c => {
      if (c.id === classId) {
        return {
          ...c,
          practicalGroups: c.practicalGroups.map(g => g.id === groupId ? { ...g, [field]: value } : g)
        };
      }
      return c;
    }));
  };

  const removePracticalGroup = (classId, groupId) => {
    setClasses(classes.map(c => {
      if (c.id === classId) {
        return { ...c, practicalGroups: c.practicalGroups.filter(g => g.id !== groupId) };
      }
      return c;
    }));
  };

  const removeClass = (classId) => {
    setClasses(classes.filter(c => c.id !== classId));
    setDeleteConfirm(null);
  };

  // Logic kiểm tra trùng lịch (Mock)
  const checkConflicts = () => {
    const newWarnings = [];
    classes.forEach(c => {
      // Mock validation can be adjusted here if needed
    });
    setWarnings(newWarnings);
  };

  useEffect(() => {
    checkConflicts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes]);

  const handleSave = async () => {
    if (!selectedSubject || !selectedSemester) {
      showToast?.('Vui lòng chọn môn học và học kỳ', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        semester_id: selectedSemester,
        subject_id: selectedSubject.subject_id || selectedSubject.id,
        classes: classes.map(c => ({
          max_students: c.maxStudents,
          target_classes: c.assignedClasses,
          theory: {
            lecturer_id: c.theory.lecturerId,
            day_of_week: c.theory.day,
            room: c.theory.room,
            sessions: parseInt(c.theory.sessions)
          },
          practical_groups: c.practicalGroups.map(g => ({
            max_students: g.maxStudents,
            lecturer_id: g.lecturerId,
            day_of_week: g.day,
            room: g.room,
            sessions: parseInt(g.sessions)
          }))
        }))
      };
      await createCreditClass(payload);
      showToast?.('Tạo lớp thành công', 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast?.(err.message || 'Lỗi khi lưu lớp', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 font-sans">
        <div className="bg-white rounded-xl border border-gray-200 shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
          
          {/* TOP HEADER */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
                <Plus size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 leading-tight">Tạo lớp tín chỉ mới</h2>
                <p className="text-sm font-medium text-slate-500 mt-0.5">Cấu hình, chia tổ và mở lớp tín chỉ.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                Hủy
              </button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70">
                {saving ? 'Đang lưu...' : 'Lưu hệ thống'}
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto flex-1 bg-slate-100/50 flex flex-col gap-6 custom-scrollbar relative">
            
            {/* ALERT BOX */}
            {warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 shadow-sm">
                <AlertTriangle className="text-amber-500 flex-shrink-0" size={20} />
                <div>
                  <h4 className="font-semibold text-amber-800 text-sm mb-1">Cảnh báo trùng lịch</h4>
                  <ul className="list-disc pl-4 text-xs text-amber-700 space-y-1">
                    {warnings.map((w, idx) => <li key={idx}>{w}</li>)}
                  </ul>
                </div>
              </div>
            )}

            {/* SECTION 1: THÔNG TIN MÔN HỌC */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">1</span>
                <h2 className="text-base font-bold text-slate-800">Thông tin môn học</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-2">
                {/* Chọn Môn Học Có Dropdown Search */}
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-xs font-semibold text-slate-600">Mã môn học / Tên môn học</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Nhập mã hoặc tên môn..."
                      value={subjectSearch}
                      onChange={(e) => {
                        setSubjectSearch(e.target.value);
                        setIsSubjectDropdownOpen(true);
                        if(selectedSubject) setSelectedSubject(null);
                      }}
                      onFocus={() => setIsSubjectDropdownOpen(true)}
                      className="w-full h-10 pl-9 pr-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  {/* Dropdown Menu (Hiển thị khoảng 5 dòng) */}
                  {isSubjectDropdownOpen && (
                    <div className="absolute top-16 left-0 w-full bg-white border border-slate-200 shadow-lg rounded-lg max-h-40 overflow-y-auto z-10">
                      {filteredSubjects.length > 0 ? filteredSubjects.map(sub => (
                        <div 
                          key={sub.subject_id} 
                          onClick={() => handleSelectSubject(sub)}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 flex justify-between items-center"
                        >
                          <span className="text-sm font-medium text-slate-700">{sub.subject_id} - {sub.subject_name}</span>
                          <span className="text-xs text-slate-400">{sub.credits} TC</span>
                        </div>
                      )) : (
                         <div className="px-3 py-3 text-sm text-slate-500 text-center">Không tìm thấy môn học</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600">Học kỳ / Năm học</label>
                  <div className="relative">
                    <select 
                      value={selectedSemester}
                      onChange={(e) => setSelectedSemester(e.target.value)}
                      className="w-full h-10 px-3 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm appearance-none bg-white font-medium"
                    >
                      {metaData?.semesters?.map(sem => (
                        <option key={sem.semester_id} value={sem.semester_id}>Học kỳ {sem.semester} ({sem.academic_year})</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>
              </div>

              {/* Box hiển thị thông tin khi chọn xong */}
              {selectedSubject && (
                <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-3 flex items-start justify-between mt-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-blue-900">{selectedSubject.subject_name}</span>
                      <span className="text-xs font-bold bg-blue-200 text-blue-800 px-2 py-0.5 rounded">{selectedSubject.subject_id}</span>
                    </div>
                    <div className="text-xs text-blue-700/80 font-medium">
                      Số tín chỉ: {selectedSubject.credits}
                    </div>
                  </div>
                  <button onClick={clearSubject} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors">
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>

            {/* SECTION 2: CẤU TRÚC LỚP TÍN CHỈ */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">2</span>
                  <h2 className="text-base font-bold text-slate-800">Cấu trúc lớp tín chỉ</h2>
                </div>
                <button onClick={handleAddClass} className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                  <Plus size={16} /> Thêm lớp
                </button>
              </div>

              <div className="flex flex-col gap-6">
                {classes.map((cls, idx) => (
                  <div key={cls.id} className="border border-slate-200 rounded-xl overflow-visible shadow-sm bg-white">
                    {/* Header Lớp */}
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between rounded-t-xl">
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-slate-800 text-base">{cls.name}</span>
                        <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-md px-2 py-1">
                          <Users size={14} className="text-slate-400" />
                          <span className="text-[11px] text-slate-500 font-semibold uppercase">Sĩ số Max:</span>
                          <input 
                            type="number" 
                            value={cls.maxStudents} 
                            onChange={(e) => updateClass(cls.id, 'maxStudents', parseInt(e.target.value) || 0)}
                            className="w-12 text-sm font-bold text-slate-800 focus:outline-none text-center" 
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-200 rounded transition-colors" title="Nhân bản lớp">
                          <Copy size={16} />
                        </button>
                        <button onClick={() => setDeleteConfirm({ type: 'class', id: cls.id, name: cls.name })} className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition-colors" title="Xóa lớp">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="p-4 flex flex-col gap-5">
                      {/* --- THÔNG TIN LÝ THUYẾT --- */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                          <span className="font-bold text-slate-700 text-sm">Cấu hình Lý thuyết</span>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                          
                          {/* Lớp biên chế - MULTI-SELECT DROP DOWN */}
                          <div className="col-span-12 lg:col-span-3 flex flex-col gap-1.5 relative">
                            <label className="text-[11px] font-bold text-slate-500 uppercase">Lớp biên chế (Ghép)</label>
                            <div 
                              className="w-full min-h-[36px] px-3 border border-slate-300 rounded bg-white flex items-center justify-between cursor-pointer"
                              onClick={() => updateClass(cls.id, 'isClassDropdownOpen', !cls.isClassDropdownOpen)}
                            >
                              <div className="text-sm truncate text-slate-700 font-medium">
                                {cls.assignedClasses.length > 0 ? cls.assignedClasses.join(', ') : 'Chọn lớp...'}
                              </div>
                              <ChevronDown size={14} className="text-slate-400 ml-2" />
                            </div>
                            
                            {cls.isClassDropdownOpen && (
                              <div className="absolute top-16 left-0 w-full bg-white border border-slate-200 shadow-xl rounded-lg max-h-40 overflow-y-auto z-20">
                                {metaData?.adminClasses?.map(ac => (
                                  <div 
                                    key={ac.class_id} 
                                    onClick={() => toggleAssignedClass(cls.id, ac.class_id)}
                                    className="px-3 py-2 flex items-center gap-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                                  >
                                    {cls.assignedClasses.includes(ac.class_id) ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} className="text-slate-300" />}
                                    <span className="text-sm text-slate-700">{ac.class_name || ac.class_id}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Giảng viên lý thuyết - Filter theo Khoa */}
                          <div className="col-span-12 lg:col-span-4 flex flex-col gap-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase">Giảng viên LT</label>
                            <div className="flex gap-2">
                              <select 
                                value={cls.theory.lecturerDept}
                                onChange={(e) => updateTheory(cls.id, 'lecturerDept', e.target.value)}
                                className="w-24 h-9 px-2 border border-slate-300 rounded bg-slate-50 focus:outline-none text-xs font-semibold"
                              >
                                <option value="All">Tất cả</option>
                                <option value="CNTT">CNTT</option>
                                <option value="ATTT">ATTT</option>
                                <option value="CB">Cơ bản</option>
                              </select>
                              <div className="relative flex-1">
                                <select 
                                  value={cls.theory.lecturerId}
                                  onChange={(e) => updateTheory(cls.id, 'lecturerId', e.target.value)}
                                  className="w-full h-9 px-2 pr-6 border border-slate-300 rounded focus:outline-none text-sm appearance-none"
                                >
                                  <option value="">-- Chọn giảng viên --</option>
                                  {metaData?.lecturers?.map(l => (
                                    <option key={l.value} value={l.value}>{l.label}</option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                              </div>
                            </div>
                          </div>

                          {/* Ngày, Phòng & Tiết */}
                          <div className="col-span-12 lg:col-span-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[11px] font-bold text-slate-500 uppercase">Thứ / Số tiết</label>
                              <div className="flex gap-1">
                                <select value={cls.theory.day} onChange={(e) => updateTheory(cls.id, 'day', e.target.value)} className="w-2/3 h-9 px-1 border border-slate-300 rounded text-xs bg-white">
                                  {['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'].map(d => <option key={d}>{d}</option>)}
                                </select>
                                <input type="number" value={cls.theory.sessions} onChange={(e) => updateTheory(cls.id, 'sessions', e.target.value)} className="w-1/3 h-9 border border-slate-300 rounded text-center text-xs" title="Số tiết" />
                              </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[11px] font-bold text-slate-500 uppercase">Phòng học (LT)</label>
                              <select value={cls.theory.room} onChange={(e) => updateTheory(cls.id, 'room', e.target.value)} className="w-full h-9 px-2 border border-slate-300 rounded text-xs bg-white">
                                <option value="">-- Chọn --</option>
                                {rawClassrooms.map(r => <option key={r.room_id || r.id} value={r.room_id || r.id}>{r.room_name || r.name || r.room_id || r.id}</option>)}
                              </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[11px] font-bold text-slate-500 uppercase">Bắt đầu / Kết thúc</label>
                              <div className="flex flex-col gap-1 relative group">
                                <div className="flex items-center gap-1 border border-slate-300 rounded h-9 px-2 bg-white">
                                  <Calendar size={12} className="text-slate-400"/>
                                  <span className="text-[10px] text-slate-700 whitespace-nowrap">{cls.theory.startDate} - {cls.theory.endDate}</span>
                                </div>
                                {/* Dropdown chọn ngày (Mock UI) */}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="h-px w-full bg-slate-200"></div>

                      {/* --- THÔNG TIN THỰC HÀNH --- */}
                      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                          <span className="font-bold text-slate-700 text-sm">Tổ thực hành (Phân rã đồng bộ)</span>
                        </div>

                        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-5">
                          <div className="flex flex-wrap items-center gap-4 bg-white p-2.5 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-3">
                              <label className="text-[11px] font-bold text-slate-600 uppercase">Sức chứa Lab:</label>
                              <input type="number" value={cls.practicalConfig.roomCapacity} onChange={(e) => updatePracticalConfig(cls.id, 'roomCapacity', parseInt(e.target.value))} className="w-16 h-8 text-center border border-slate-300 rounded focus:border-blue-500 text-sm font-semibold" />
                            </div>
                            <div className="w-px h-6 bg-slate-200 hidden lg:block"></div>
                            <div className="flex items-center gap-3">
                              <label className="text-[11px] font-bold text-slate-600 uppercase">Sĩ số tối đa/Tổ:</label>
                              <input type="number" value={cls.practicalConfig.maxPerGroup} onChange={(e) => updatePracticalConfig(cls.id, 'maxPerGroup', parseInt(e.target.value))} className="w-16 h-8 text-center border border-slate-300 rounded focus:border-blue-500 text-sm font-semibold" />
                            </div>
                            <div className="text-xs font-semibold text-blue-600 ml-2">
                              Tổng: {cls.maxStudents} SV &rarr; Dự kiến: {Math.ceil(cls.maxStudents / Math.min(cls.practicalConfig.roomCapacity, cls.practicalConfig.maxPerGroup))} Tổ
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <button onClick={() => handleAutoSplit(cls.id)} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded shadow-sm hover:bg-blue-700 transition-colors">
                              <Wand2 size={14} /> Tự động chia tổ
                            </button>
                            <button onClick={() => handleAddPracticalGroup(cls.id)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-100 transition-colors">
                              <Plus size={14} /> Thêm thủ công
                            </button>
                          </div>
                        </div>

                        {/* Danh sách tổ */}
                        <div className="space-y-3">
                          {cls.practicalGroups.map((group) => (
                            <div key={group.id} className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm hover:border-blue-300 transition-colors">
                              
                              {/* Group Label */}
                              <div className="flex flex-row lg:flex-col justify-center items-center px-4 lg:border-r border-slate-200 gap-2 lg:gap-1 min-w-[80px]">
                                <span className="font-extrabold text-slate-800 text-sm">{group.name}</span>
                                <div className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                                  {group.maxStudents} SV
                                </div>
                              </div>

                              {/* Cấu hình chi tiết */}
                              <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3">
                                <div className="lg:col-span-4 flex flex-col gap-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">Giảng viên TH</label>
                                  <select 
                                    value={group.lecturerId}
                                    onChange={(e) => updatePracticalGroup(cls.id, group.id, 'lecturerId', e.target.value)}
                                    className="w-full h-8 px-2 border border-slate-300 rounded bg-slate-50 focus:outline-none text-xs"
                                  >
                                    <option value="">-- Chọn GV --</option>
                                    {metaData?.lecturers?.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                                  </select>
                                </div>
                                <div className="lg:col-span-2 flex flex-col gap-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">Thứ</label>
                                  <select value={group.day} onChange={(e) => updatePracticalGroup(cls.id, group.id, 'day', e.target.value)} className="w-full h-8 px-2 border border-slate-300 rounded bg-white text-xs">
                                    {['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'].map(d => <option key={d}>{d}</option>)}
                                  </select>
                                </div>
                                <div className="lg:col-span-2 flex flex-col gap-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">Số tiết</label>
                                  <div className="relative">
                                    <input type="number" value={group.sessions} onChange={(e) => updatePracticalGroup(cls.id, group.id, 'sessions', e.target.value)} className="w-full h-8 pl-7 pr-2 border border-slate-300 rounded bg-white text-xs" />
                                    <Clock size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                  </div>
                                </div>
                                <div className="lg:col-span-4 flex flex-col gap-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">Phòng Lab</label>
                                  <select value={group.room} onChange={(e) => updatePracticalGroup(cls.id, group.id, 'room', e.target.value)} className="w-full h-8 px-2 border border-slate-300 rounded bg-white text-xs">
                                    <option value="">-- Phòng thực hành --</option>
                                    {rawClassrooms.map(r => <option key={r.room_id || r.id} value={r.room_id || r.id}>{r.room_name || r.name || r.room_id || r.id}</option>)}
                                  </select>
                                </div>
                              </div>

                              <div className="flex justify-end lg:block mt-2 lg:mt-0">
                                <button onClick={() => removePracticalGroup(cls.id, group.id)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors ml-2">
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                          {cls.practicalGroups.length === 0 && (
                            <div className="text-center p-4 border border-dashed border-slate-300 rounded-lg text-slate-500 text-sm font-medium">
                              Chưa có tổ thực hành nào được tạo.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* DIALOG XÁC NHẬN XÓA */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/60 flex items-center justify-center font-sans">
          <div className="bg-white rounded-xl w-[400px] max-w-[90%] shadow-2xl overflow-hidden">
            <div className="p-5 flex gap-4">
              <div className="bg-red-100 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={24} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Xác nhận xóa {deleteConfirm.type === 'class' ? 'lớp' : 'tổ'}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Bạn có chắc chắn muốn xóa {deleteConfirm.type === 'class' ? 'toàn bộ ' : ''} 
                  <span className="font-bold text-slate-800">{deleteConfirm.name}</span> không? Hành động này không thể hoàn tác.
                </p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-200">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-100 transition-colors">
                Hủy
              </button>
              <button 
                onClick={() => removeClass(deleteConfirm.id)} 
                className="px-4 py-2 rounded-lg bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-colors flex items-center gap-2 shadow-sm"
              >
                <Trash2 size={16} /> Xóa {deleteConfirm.type === 'class' ? 'lớp' : 'tổ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}