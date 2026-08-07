import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Plus, Trash2, Clock, MapPin, ChevronDown, Search, BookOpen, Edit2, Info } from 'lucide-react';
import { API_BASE } from '../../../api/client';

// =====================================================================
// COMPONENT SEARCHABLE SELECT
// =====================================================================
function CustomSearchSelect({ options, value, onChange, placeholder, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm(''); 
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find(opt => String(opt.value) === String(value));
  const filtered = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div
        className={`w-full h-11 px-3 py-2 border rounded-lg flex items-center justify-between transition-all ${
          disabled 
            ? 'bg-gray-100 border-gray-200 cursor-not-allowed' 
            : 'bg-white border-gray-300 cursor-pointer focus-within:border-[#005bbf] focus-within:ring-1 focus-within:ring-[#005bbf]'
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={`text-[13px] ${selected ? 'text-gray-900 font-medium' : 'text-gray-500'} truncate pr-2`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={18} className={`text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-gray-100 bg-gray-50/50">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:border-[#005bbf] text-[13px]"
                placeholder="Nhập từ khóa tìm kiếm..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onClick={e => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            {filtered.length > 0 ? filtered.map(opt => (
              <div
                key={opt.value}
                className={`px-3 py-2.5 cursor-pointer hover:bg-gray-100 text-[13px] transition-colors ${
                  String(value) === String(opt.value) ? 'bg-[#005bbf]/10 text-[#005bbf] font-medium' : 'text-gray-700'
                }`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
              >
                {opt.label}
              </div>
            )) : (
              <div className="px-3 py-4 text-gray-500 text-[13px] text-center italic">
                Không tìm thấy phòng phù hợp với sĩ số hoặc loại phòng
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// COMPONENT CHÍNH
// =====================================================================
export default function EditClassModal({
  editData,
  onClose,
  onSuccess,
  showToast
}) {
  const classId = editData?.class_id || '';

  const [lecturersList, setLecturersList] = useState([]);
  const [rawClassrooms, setRawClassrooms] = useState([]);

  const [classDetail, setClassDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(true);

  const [formData, setFormData] = useState({
    lecturer_id: '',
    max_students: 100,
    status: 'active',
    target_classes: ''
  });

  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  
  const [scheduleForm, setScheduleForm] = useState({
    type: 'Lý thuyết',
    session_date: '',
    room_id: '',
    start_time: '',
    shift: 1
  });

  const [editingScheduleIndex, setEditingScheduleIndex] = useState(null);
  const [isSavingAll, setIsSavingAll] = useState(false);

  // === FETCH DỮ LIỆU TỪ BACKEND ===
  useEffect(() => {
    const fetchAllData = async () => {
      if (!classId) return;
      setLoadingDetail(true);
      try {
        const detailRes = await fetch(`${API_BASE}/api/credit-classes/${classId}`);
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          if (detailData.status === 'success' && detailData.data) {
            const data = detailData.data;
            setClassDetail(data);
            setFormData({
              lecturer_id: data.lecturer_id || '',
              max_students: data.max_students || 100,
              status: data.status || 'active',
              target_classes: data.target_classes ? data.target_classes.join(', ') : ''
            });
            // Nếu là lớp tổ thực hành, mặc định form chọn loại lịch là Thực hành
            if (data.sub_group_number) {
              setScheduleForm(prev => ({ ...prev, type: 'Thực hành' }));
            }
          }
        }

        const [lecRes, roomRes] = await Promise.all([
          fetch(`${API_BASE}/api/admin/lecturers/`),
          fetch(`${API_BASE}/api/admin/classrooms/`)
        ]);
        
        if (lecRes.ok) {
          const lecData = await lecRes.json();
          const formattedLecturers = lecData.map(l => {
            const lecturerId = l.id || l.lecturer_id;
            const lecturerName = l.name || l.full_name || 'Chưa rõ tên';
            return {
              value: lecturerId,
              label: `${lecturerName} - ${lecturerId}`
            };
          });
          setLecturersList(formattedLecturers);
        }

        if (roomRes.ok) {
          const roomData = await roomRes.json();
          setRawClassrooms(roomData);
        }
      } catch (err) {
        console.error("Lỗi tải dữ liệu:", err);
      } finally {
        setLoadingDetail(false);
      }
    };

    fetchAllData();
    if (classId) fetchSchedules();
  }, [classId]);

  const fetchSchedules = async () => {
    setLoadingSchedules(true);
    try {
      const res = await fetch(`${API_BASE}/api/schedules`);
      const data = await res.json();
      if (res.ok && data.schedules) {
        const classSchedules = data.schedules.filter(s => s.class_id === classId);
        classSchedules.sort((a, b) => new Date(a.session_date) - new Date(b.session_date));
        setSchedules(classSchedules);
      }
    } catch (err) {} finally {
      setLoadingSchedules(false);
    }
  };

  const hasPractice = Boolean(classDetail?.sub_group_number || classDetail?.class_type === 'Practice');

  // === BỘ LỌC PHÒNG HỌC THÔNG MINH (LÝ THUYẾT / THỰC HÀNH + SĨ SỐ) ===
  const getFilteredRooms = () => {
    const maxStd = Number(formData.max_students) || 0;
    return rawClassrooms
      .filter(r => {
        const capacity = r.capacity || r.max_capacity || 0;
        const hasEnoughCapacity = capacity >= maxStd;
        
        const typeStr = (r.room_type || r.type || '').toLowerCase();
        // Nhận diện phòng lý thuyết (Theory, Lý thuyết, LT)
        const isTheoryRoom = typeStr.includes('theory') || typeStr.includes('lý thuyết') || typeStr.includes('lt') || (!typeStr && true);
        // Nhận diện phòng thực hành (Practice, Thực hành, TH, Lab)
        const isPracticeRoom = typeStr.includes('practice') || typeStr.includes('thực hành') || typeStr.includes('th') || typeStr.includes('lab');

        if (scheduleForm.type === 'Lý thuyết') {
          return isTheoryRoom && hasEnoughCapacity;
        } else {
          return isPracticeRoom && hasEnoughCapacity;
        }
      })
      .map(r => ({
        value: r.id || r.room_id,
        label: `Phòng ${r.id || r.room_id} - ${r.room_type || 'Thường'} (Sức chứa: ${r.capacity || r.max_capacity || 'N/A'})`
      }));
  };

  useEffect(() => {
    if (editingScheduleIndex === null) {
      setScheduleForm(prev => ({ ...prev, room_id: '' }));
    }
  }, [scheduleForm.type, formData.max_students]);

  const handleSelectScheduleToEdit = (idx, schedule) => {
    setScheduleForm({
      type: schedule.loai_lich || 'Lý thuyết',
      session_date: schedule.session_date,
      room_id: schedule.room_id,
      start_time: schedule.start_time ? schedule.start_time.substring(0, 5) : '',
      shift: schedule.shift || 1,
    });
    setEditingScheduleIndex(idx);
  };

  const handleCancelEdit = () => {
    setScheduleForm({ type: hasPractice ? 'Thực hành' : 'Lý thuyết', session_date: '', room_id: '', start_time: '', shift: 1 });
    setEditingScheduleIndex(null);
  };

  const handleSaveScheduleLocal = (e) => {
    e.preventDefault();
    if (!scheduleForm.session_date || !scheduleForm.room_id || !scheduleForm.start_time) {
      showToast?.('Vui lòng nhập đầy đủ thông tin lịch học', 'warning');
      return;
    }

    const scheduleData = {
      ...scheduleForm,
      class_id: classId,
      loai_lich: scheduleForm.type,
      isNew: true,
      isEdited: true
    };

    let updatedSchedules = [...schedules];

    if (editingScheduleIndex !== null) {
      updatedSchedules[editingScheduleIndex] = { ...updatedSchedules[editingScheduleIndex], ...scheduleData };
      setEditingScheduleIndex(null);
    } else {
      updatedSchedules.push(scheduleData);
    }

    updatedSchedules.sort((a, b) => {
      const dateA = new Date(`${a.session_date}T${a.start_time || '00:00'}`);
      const dateB = new Date(`${b.session_date}T${b.start_time || '00:00'}`);
      return dateA - dateB;
    });

    setSchedules(updatedSchedules);
    setScheduleForm({ type: hasPractice ? 'Thực hành' : 'Lý thuyết', session_date: '', room_id: '', start_time: '', shift: 1 });
  };

  const handleDeleteSchedule = (indexToRemove, schedule) => {
    if (schedule.isNew) {
      setSchedules(prev => prev.filter((_, i) => i !== indexToRemove));
      if (editingScheduleIndex === indexToRemove) handleCancelEdit();
    } else {
      showToast?.('Tính năng xóa lịch đã lưu trên hệ thống đang cập nhật!', 'warning');
    }
  };

  const handleSaveAll = async () => {
    if (!formData.lecturer_id || !formData.max_students) {
      showToast?.('Vui lòng điền đủ Giảng viên và Sĩ số!', 'error');
      return;
    }
    setIsSavingAll(true);
    try {
      const resClass = await fetch(`${API_BASE}/api/credit-classes/${classId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lecturer_id: formData.lecturer_id,
          max_students: Number(formData.max_students),
          status: formData.status
        })
      });
      if (!resClass.ok) throw new Error('Lỗi cập nhật thông tin chung của lớp');

      const newSchedules = schedules.filter(s => s.isNew);
      for (const s of newSchedules) {
        const form = new FormData();
        form.append('ma_lop_tc', s.class_id);
        form.append('ngay_hoc', s.session_date);
        form.append('phong_hoc', s.room_id);
        form.append('gio_bat_dau', s.start_time);
        form.append('ca_hoc', s.shift);
        form.append('loai_lich', s.loai_lich);

        const resSchedule = await fetch(`${API_BASE}/api/schedules`, { method: 'POST', body: form });
        if (!resSchedule.ok) {
           const errData = await resSchedule.json();
           throw new Error(`Lỗi lưu lịch ngày ${s.session_date}: ${errData.detail || 'Không rõ nguyên nhân'}`);
        }
      }

      showToast?.('Cập nhật lớp và lưu lịch học thành công!', 'success');
      onSuccess?.();
      onClose();
    } catch (error) {
      showToast?.(error.message, 'error');
    } finally {
      setIsSavingAll(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.12)] w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-[#106fa6]/10 p-2 rounded-lg text-[#106fa6]">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-gray-900 leading-tight">Cập nhật Lớp Tín Chỉ</h2>
              <p className="text-[13px] font-medium text-gray-500 mt-0.5">{classId}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:bg-gray-200 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* ================= CỘT TRÁI: THÔNG TIN LỚP ================= */}
          <div className="flex flex-col gap-5">
            <div>
               <h3 className="text-[13px] font-bold text-[#1a73e8] uppercase tracking-wider mb-3 border-b border-gray-200 pb-1.5">
                Thông tin Môn Học
              </h3>
              {loadingDetail ? (
                <div className="p-4 text-center text-gray-400 text-[13px]">Đang tải thông tin môn học...</div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 grid grid-cols-2 gap-y-3 gap-x-4">
                  <div className="col-span-2 flex flex-col">
                    <span className="text-[11px] text-gray-500 font-semibold uppercase">Môn học</span>
                    <span className="text-[14px] text-gray-800 font-medium">
                      {classDetail?.subject_id} - {classDetail?.subject_name}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-gray-500 font-semibold uppercase">Số tín chỉ</span>
                    <span className="text-[14px] text-gray-800 font-medium">{classDetail?.credits || 0} Tín</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-gray-500 font-semibold uppercase">Nhóm / Tổ</span>
                    <span className="text-[14px] text-gray-800 font-medium">
                      Nhóm {classDetail?.group_number || classDetail?.class_group || '01'} 
                      {classDetail?.sub_group_number ? <span className="text-blue-600 font-semibold"> (Tổ thực hành {classDetail.sub_group_number})</span> : ''}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4 mt-2">
              <h3 className="text-[13px] font-bold text-[#1a73e8] uppercase tracking-wider mb-1 border-b border-gray-200 pb-1.5">
                Chi tiết lớp học
              </h3>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-gray-700">Giảng viên phụ trách</label>
                <CustomSearchSelect 
                  options={lecturersList}
                  value={formData.lecturer_id}
                  onChange={(val) => setFormData({...formData, lecturer_id: val})}
                  placeholder="-- Tìm tên hoặc mã giảng viên --"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-gray-700">Sĩ số tối đa</label>
                  <input 
                    type="number" 
                    className="w-full h-11 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#005bbf] text-[13px]"
                    value={formData.max_students}
                    onChange={(e) => setFormData({...formData, max_students: e.target.value})}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-gray-700">Trạng thái</label>
                  <div className="relative">
                    <select 
                      className="w-full h-11 px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#005bbf] appearance-none text-[13px]"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                    >
                      <option value="active">Đã mở (Active)</option>
                      <option value="Planning">Dự kiến (Planning)</option>
                      <option value="Cancelled">Đã hủy (Cancelled)</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-gray-700">Lớp hành chính mục tiêu (Chỉ xem)</label>
                <input 
                  type="text" 
                  className="w-full h-11 px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed text-[13px]"
                  value={formData.target_classes}
                  readOnly
                />
              </div>

              <button 
                onClick={handleSaveAll}
                disabled={isSavingAll}
                className="mt-auto h-11 text-white text-[14px] font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"
                style={{ backgroundColor: '#106fa6' }}
              >
                <Save size={18} /> 
                {isSavingAll ? 'Đang lưu hệ thống...' : 'Lưu thông tin & Đồng bộ Lịch'}
              </button>
            </div>
          </div>

          {/* ================= CỘT PHẢI: LỊCH HỌC ================= */}
          <div className="flex flex-col gap-5 border-l-0 lg:border-l border-gray-200 lg:pl-8">
            
            <div className={`p-4 rounded-xl border ${editingScheduleIndex !== null ? 'border-orange-300 bg-orange-50' : 'border-transparent'}`}>
              <h3 className="text-[13px] font-bold text-[#1a73e8] uppercase tracking-wider mb-2 border-b border-gray-200 pb-1.5 flex items-center gap-2">
                {editingScheduleIndex !== null ? <><Edit2 size={16}/> Đang sửa Buổi {editingScheduleIndex + 1}</> : 'Thêm lịch học'}
              </h3>

              {/* Thông báo hướng dẫn nghiệp vụ tổ thực hành */}
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 p-2.5 rounded-lg mb-3 text-[12px] text-blue-800">
                <Info size={16} className="shrink-0 mt-0.5 text-blue-600" />
                <span>
                  {hasPractice 
                    ? "Lớp này có tổ thực hành: Lịch lý thuyết dùng chung cho các tổ cùng nhóm; Lịch thực hành độc lập theo từng tổ và tự động lọc phòng máy/thực hành." 
                    : "Lớp lý thuyết đơn: Hệ thống sẽ tự động lọc các phòng lý thuyết đáp ứng đủ sĩ số."}
                </span>
              </div>

              <div className="flex flex-col gap-1.5 mb-3">
                 <label className="text-[12px] font-semibold text-gray-700">Loại lịch</label>
                 <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                      <input 
                        type="radio" 
                        name="scheduleType" 
                        className="w-4 h-4 text-[#005bbf]"
                        checked={scheduleForm.type === 'Lý thuyết'}
                        onChange={() => setScheduleForm({...scheduleForm, type: 'Lý thuyết'})}
                      />
                      Lý thuyết (Chung nhóm)
                    </label>
                    <label className={`flex items-center gap-2 text-[13px] ${!hasPractice ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                      <input 
                        type="radio" 
                        name="scheduleType"
                        className="w-4 h-4 text-[#005bbf]"
                        checked={scheduleForm.type === 'Thực hành'}
                        onChange={() => setScheduleForm({...scheduleForm, type: 'Thực hành'})}
                        disabled={!hasPractice}
                      />
                      Thực hành (Theo tổ) {!hasPractice && '(Không có tổ)'}
                    </label>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-gray-700">Ngày học</label>
                  <input 
                    type="date" 
                    className="w-full h-11 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#005bbf] text-[13px] bg-white"
                    value={scheduleForm.session_date}
                    onChange={(e) => setScheduleForm({...scheduleForm, session_date: e.target.value})}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-gray-700">Giờ bắt đầu</label>
                  <input 
                    type="time" 
                    className="w-full h-11 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#005bbf] text-[13px] bg-white"
                    value={scheduleForm.start_time}
                    onChange={(e) => setScheduleForm({...scheduleForm, start_time: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-[12px] font-semibold text-gray-700">
                    Phòng {scheduleForm.type} <span className="text-xs font-normal text-gray-500">(Đã lọc tự động)</span>
                  </label>
                  <CustomSearchSelect 
                    options={getFilteredRooms()}
                    value={scheduleForm.room_id}
                    onChange={(val) => setScheduleForm({...scheduleForm, room_id: val})}
                    placeholder={`-- Chọn phòng ${scheduleForm.type.toLowerCase()} --`}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-gray-700">Ca học</label>
                  <div className="relative">
                    <select 
                      className="w-full h-11 px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-[#005bbf] appearance-none text-[13px]"
                      value={scheduleForm.shift}
                      onChange={(e) => setScheduleForm({...scheduleForm, shift: e.target.value})}
                    >
                      <option value={1}>Ca 1 (Sáng)</option>
                      <option value={2}>Ca 2 (Sáng)</option>
                      <option value={3}>Ca 3 (Chiều)</option>
                      <option value={4}>Ca 4 (Chiều)</option>
                      <option value={5}>Ca 5 (Tối)</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={handleSaveScheduleLocal}
                  className="flex-1 h-11 bg-white border-2 text-[14px] font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
                  style={{ borderColor: '#106fa6', color: '#106fa6' }}
                >
                  <Plus size={18} strokeWidth={2.5} /> 
                  {editingScheduleIndex !== null ? 'Cập nhật lịch (Tạm)' : 'Thêm vào danh sách tạm'}
                </button>
                {editingScheduleIndex !== null && (
                  <button 
                    onClick={handleCancelEdit}
                    className="px-4 h-11 bg-gray-100 text-gray-600 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Hủy sửa
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-[150px]">
              <h3 className="text-[13px] font-bold text-[#1a73e8] uppercase tracking-wider mb-3 border-b border-gray-200 pb-1.5 mt-2">
                Danh sách lịch đã xếp
              </h3>
              
              {loadingSchedules ? (
                <div className="flex justify-center p-6"><span className="text-[13px] text-gray-500">Đang tải...</span></div>
              ) : schedules.length === 0 ? (
                <div className="border border-dashed border-gray-300 rounded-lg p-6 flex items-center justify-center bg-gray-50 flex-1">
                  <span className="text-[13px] text-gray-500 text-center">Chưa có lịch học nào.</span>
                </div>
              ) : (
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                  {schedules.map((schedule, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => handleSelectScheduleToEdit(idx, schedule)}
                      className={`flex justify-between items-center p-3 border rounded-lg transition-all shadow-sm cursor-pointer
                        ${editingScheduleIndex === idx ? 'border-orange-400 bg-orange-50 ring-2 ring-orange-100' 
                          : schedule.isEdited || schedule.isNew ? 'bg-blue-50/50 border-blue-200 hover:border-blue-400' 
                          : 'bg-gray-50 border-gray-200 hover:border-[#005bbf]/40 hover:bg-white'} 
                        `}
                    >
                      <div className="flex flex-col gap-1.5 text-[13px] text-gray-700 pointer-events-none">
                         <div className="flex items-center gap-2 font-bold text-[#005bbf]">
                           <span className="uppercase text-[11px] tracking-wider">Buổi {idx + 1}</span>
                           {(schedule.isNew || schedule.isEdited) && <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded ml-1">Chưa lưu DB</span>}
                         </div>

                         <div className="flex items-center gap-2 font-medium">
                           <Clock size={15} className="text-gray-400"/> 
                           <span className="text-gray-900">{schedule.session_date}</span> • {schedule.start_time} (Ca {schedule.shift})
                         </div>

                         <div className="flex items-center gap-2 text-gray-600">
                           <MapPin size={15} className="text-gray-400"/> 
                           Phòng: <span className="font-semibold text-[#106fa6]">{schedule.room_id}</span>
                           <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                             schedule.loai_lich === 'Thực hành' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                           }`}>
                             {schedule.loai_lich || 'Lý thuyết'}
                           </span>
                         </div>
                      </div>
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(idx, schedule); }}
                        className={`p-2 rounded-md transition-colors shadow-sm border ${
                          schedule.isNew 
                            ? 'text-gray-500 bg-white hover:text-red-600 border-gray-200 hover:border-red-200' 
                            : 'text-gray-300 bg-gray-50 border-transparent cursor-not-allowed'
                        }`}
                        title={schedule.isNew ? "Xóa lịch tạm" : "Không thể xóa lịch đã lưu tại đây"}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}