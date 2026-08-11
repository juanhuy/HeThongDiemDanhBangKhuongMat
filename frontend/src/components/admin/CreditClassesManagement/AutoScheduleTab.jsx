import React, { useState, useEffect } from 'react';
import { Rocket, SlidersHorizontal, Building2, CalendarDays, FileDown, Trash2 } from 'lucide-react';
import { API_BASE, authFetch } from '../../../api/client';
import { listRooms } from '../../../api/rooms';
import styles from './Styles';

export default function AutoScheduleTab({ classes = [], lecturers = [], semesters = [], faculties = [], showToast, onSuccess }) {
    const selectedSemesterId = classes[0]?.semester_id || '';
  const selectedSemester = semesters.find((sem) => sem.semester_id === selectedSemesterId);
  const selectedSemesterStart = selectedSemester?.start_date;
  const selectedSemesterEnd = selectedSemester?.end_date;

  const getClassPeriods = (classItem) => {
    const theoryPeriods = Number(classItem.theory_periods);
    const practicalPeriods = Number(classItem.practical_periods);
    const isPracticeClass = classItem.class_type === 'Practice' || Boolean(classItem.parent_class_id);

    if (Number.isFinite(theoryPeriods) || Number.isFinite(practicalPeriods)) {
      return {
        theory: !isPracticeClass && Number.isFinite(theoryPeriods) ? theoryPeriods : 0,
        practice: isPracticeClass && Number.isFinite(practicalPeriods) ? practicalPeriods : 0
      };
    }

    const credits = Number(classItem.credits || 0);
    return {
      theory: isPracticeClass ? 0 : credits * 15,
      practice: isPracticeClass ? credits * 45 : 0
    };
  };

  const [params, setParams] = useState({
    avoidEvening: true,
    blockScheduling: true,
  });

  const [hasData, setHasData] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [scheduleResults, setScheduleResults] = useState([]);
  const [roomStats, setRoomStats] = useState({ total: 0, theoryReady: 0, theoryMaintenance: 0, practiceReady: 0, practiceMaintenance: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Load existing schedules for the selected classes.
  useEffect(() => {
    const existingClasses = classes.filter(c => c.schedules && c.schedules.length > 0);
    if (existingClasses.length > 0 && !unsavedChanges) {
      const formattedResults = existingClasses.map(cls => ({
        class_id: cls.class_id,
        subject_name: cls.subject_name,
        lecturer_id: cls.lecturer_id,
        schedules: cls.schedules.map(s => {
          return {
             room_id: s.room_id,
             shift: s.start_shift || 1,
             weekday: (s.day_of_week ? s.day_of_week - 2 : 0)
          };
        }),
        errors: []
      }));
      setScheduleResults(formattedResults);
      setHasData(true);
    } else if (!unsavedChanges) {
      setScheduleResults([]);
      setHasData(false);
    }
  }, [classes, unsavedChanges]);

  useEffect(() => {
    listRooms().then(res => {
      const roomsArray = Array.isArray(res) ? res : (res?.data || res?.items || []);
      let tReady = 0, tMaint = 0, pReady = 0, pMaint = 0;
      roomsArray.forEach(r => {
        const isTheory = r.room_type === 'Theory' || r.room_type === 'Lý thuyết' || !r.room_type; 
        const isMaintenance = r.status === 'Maintenance' || r.status === 'Bảo trì';
        if (isTheory) { if (isMaintenance) tMaint++; else tReady++; } else { if (isMaintenance) pMaint++; else pReady++; }
      });
      setRoomStats({ total: roomsArray.length, theoryReady: tReady, theoryMaintenance: tMaint, practiceReady: pReady, practiceMaintenance: pMaint });
    }).catch(err => console.error(err));
  }, []);

  const handleGenerate = async () => {
    if (!selectedSemesterId || !selectedSemesterStart) return showToast?.('Thiếu học kỳ hoặc ngày bắt đầu học kỳ', 'error');
    setIsGenerating(true); setHasData(false); setScheduleResults([]);

    try {
      const targetClasses = classes.filter(c => c.lecturer_id && (!c.schedules || c.schedules.length === 0));
      if (targetClasses.length === 0) { showToast?.('Không còn lớp nào cần xếp lịch!', 'warning'); setIsGenerating(false); return; }

      const classRequests = targetClasses.map(cls => {
        const periods = getClassPeriods(cls);
        return {
        credit_class_id: cls.class_id, lecturer_id: cls.lecturer_id,
        theory_periods: periods.theory,
        practice_periods: periods.practice,
        max_students: cls.max_students || 40, subject_name: cls.subject_name
        };
      });

      const payload = { semester_id: selectedSemesterId, avoid_evening_shift: params.avoidEvening, allow_block_scheduling: params.blockScheduling, classes: classRequests };
      const response = await authFetch(`${API_BASE}/api/schedules/auto-suggest-batch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      
      if (data.status === 'success' && data.data) {
        setScheduleResults(data.data); setHasData(true); setUnsavedChanges(true);
        if (data.data.some(r => r.errors?.length > 0)) showToast?.('Có một số lớp bị kẹt lịch. Cần kiểm tra lại!', 'warning');
        else showToast?.('Thuật toán chạy thành công 100%! Bấm "Lưu Lịch" để áp dụng.', 'success');
      } else showToast?.(data.message, 'error');
    } catch (err) { showToast?.('Lỗi hệ thống máy chủ', 'error'); }
    setIsGenerating(false);
  };

  const handleSave = async () => {
    if (!scheduleResults || scheduleResults.length === 0) return;
    setIsSaving(true);
    try {
      // Flatten schedules
      const flatSchedules = [];
      const classIds = [];
      scheduleResults.forEach(res => {
        if (res.schedules && res.schedules.length > 0) {
          classIds.push(res.class_id);
          res.schedules.forEach(s => {
            flatSchedules.push({
              class_id: res.class_id,
              room_id: s.room_id,
              session_date: s.session_date,
              shift: s.shift,
              start_time: s.start_time,
              end_time: s.end_time,
              room_type: s.room_type || 'Theory'
            });
          });
        }
      });
      
      const payload = { classes: classIds, schedules: flatSchedules };
      const response = await authFetch(`${API_BASE}/api/schedules/batch-save`, { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) 
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        showToast?.(data.message, 'success');
        setUnsavedChanges(false);
        if (onSuccess) onSuccess();
      } else {
        showToast?.(data.message, 'error');
      }
    } catch (err) { showToast?.('Lỗi khi lưu lịch.', 'error'); }
    setIsSaving(false);
  };

  const handleReset = async () => {
    if (!selectedSemesterId) return showToast?.('Không xác định được học kỳ của lớp đã chọn', 'error');
    if (!window.confirm('Bạn có chắc chắn muốn XÓA TOÀN BỘ lịch học của học kỳ này không? Hành động này không thể hoàn tác!')) return;
    
    setIsResetting(true);
    try {
      const response = await authFetch(`${API_BASE}/api/schedules/reset`, { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ semester_id: selectedSemesterId }) 
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        showToast?.(data.message, 'success');
        setScheduleResults([]);
        setHasData(false);
        setUnsavedChanges(false);
        if (onSuccess) onSuccess();
      } else {
        showToast?.(data.message, 'error');
      }
    } catch (err) { showToast?.('Lỗi khi reset lịch.', 'error'); }
    setIsResetting(false);
  };

  return (
    <div style={{ ...styles.container, maxWidth: 'none', gap: 16 }}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Xếp lịch & Phòng học Tự động</h2>
          <p style={styles.description}>Tự động phân bổ lịch học và phòng cho các lớp đã chọn.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleReset} disabled={isGenerating || isSaving || isResetting} style={{ ...styles.secondaryButton, color: '#b91c1c', borderColor: '#fecaca', opacity: isResetting ? 0.7 : 1 }}><Trash2 size={18} className={isResetting ? "animate-spin" : ""} /> {isResetting ? 'Đang xóa...' : 'Reset Lịch'}</button>
          {unsavedChanges && hasData && (
             <button onClick={handleSave} disabled={isSaving || isGenerating || isResetting} style={{ ...styles.primaryButton, background: '#059669', opacity: isSaving ? 0.7 : 1 }}><FileDown size={18} className={isSaving ? "animate-bounce" : ""} /> {isSaving ? 'Đang lưu...' : 'Lưu & Áp dụng Lịch'}</button>
          )}
          <button onClick={handleGenerate} disabled={isGenerating || isSaving || isResetting} style={{ ...styles.primaryButton, opacity: isGenerating ? 0.7 : 1 }}><Rocket size={18} className={isGenerating ? "animate-pulse" : ""} /> {isGenerating ? 'Đang chạy...' : 'Chạy thuật toán'}</button>
        </div>
      </div>

      <div style={styles.card}>
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
          <h3 className="text-[15px] font-bold text-slate-800">Thông tin lớp tín chỉ đang xếp lịch</h3>
          <p className="mt-1 text-[12px] text-slate-500">Các thông tin dưới đây chỉ để xem và không thể chỉnh sửa tại bước xếp lịch.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-[13px]">
            <thead className="border-b border-slate-200 text-[12px] text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Lớp tín chỉ</th>
                <th className="px-5 py-3 font-semibold">Môn học</th>
                <th className="px-5 py-3 text-center font-semibold">Tiết lý thuyết</th>
                <th className="px-5 py-3 text-center font-semibold">Tiết thực hành</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((classItem) => {
                const periods = getClassPeriods(classItem);
                return (
                  <tr key={classItem.class_id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-5 py-3 font-semibold text-[#106fa6]">{classItem.class_id || '—'}</td>
                    <td className="px-5 py-3 text-slate-700">{classItem.subject_name || classItem.subject_id || '—'}</td>
                    <td className="px-5 py-3 text-center font-semibold text-slate-700">{periods.theory}</td>
                    <td className="px-5 py-3 text-center font-semibold text-slate-700">{periods.practice}</td>
                  </tr>
                );
              })}
              {classes.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-5 py-6 text-center text-slate-400">Chưa có lớp tín chỉ được chọn.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div style={styles.card}>
            <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-bold text-slate-800 flex items-center gap-2 text-[15px]"><SlidersHorizontal size={18} className="text-[#106fa6]" /> Tham số Đầu vào</h3></div>
            <div className="p-5 flex flex-col gap-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
                <div>Học kỳ của lớp đã chọn: <strong>{selectedSemesterId || 'Chưa xác định'}</strong></div>
                <div className="mt-1">Số tiết được tính theo loại lớp và số tín chỉ của từng môn.</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
                <div>Học kỳ mở đăng ký: <strong>{selectedSemesterId || 'Chưa xác định'}</strong></div>
                <div>Ngày bắt đầu: <strong>{selectedSemesterStart || 'Chưa có'}</strong></div>
                <div>Ngày kết thúc: <strong>{selectedSemesterEnd || 'Chưa có'}</strong></div>
              </div>
              <div className="border-t border-slate-100 pt-4 mt-2 flex flex-col gap-3">
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={params.avoidEvening} onChange={(e) => setParams({...params, avoidEvening: e.target.checked})} className="w-4 h-4 rounded text-[#106fa6]" /><span className="text-[13px] text-slate-700">Tránh xếp ca tối</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={params.blockScheduling} onChange={(e) => setParams({...params, blockScheduling: e.target.checked})} className="w-4 h-4 rounded text-[#106fa6]" /><span className="text-[13px] text-slate-700 font-semibold text-emerald-600">Dồn 2 buổi/tuần (Nếu kẹt phòng)</span></label>
              </div>
            </div>
          </div>
          
          <div style={{ ...styles.card, padding: 20 }}>
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-[15px] mb-5"><Building2 size={18} className="text-[#b47a26]" /> Thống kê Phòng học</h3>
            <div className="flex justify-between items-end mb-3"><span className="text-[13px] text-slate-500 font-medium">Tổng số phòng</span><span className="text-2xl font-bold text-slate-900">{roomStats.total}</span></div>
            {roomStats.total > 0 && (
              <div className="flex flex-col gap-2 text-[12px] font-semibold text-slate-600 mt-4">
                <div className="flex justify-between border-b border-slate-100 pb-2"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#106fa6]"></div>Lý thuyết sẵn sàng</div><span className="text-slate-800">{roomStats.theoryReady}</span></div>
                <div className="flex justify-between border-b border-slate-100 pb-2"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#106fa6] opacity-60"></div>Thực hành sẵn sàng</div><span className="text-slate-800">{roomStats.practiceReady}</span></div>
                <div className="flex justify-between"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#e8702a]"></div>Đang bảo trì</div><span className="text-[#e8702a]">{roomStats.theoryMaintenance + roomStats.practiceMaintenance}</span></div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-8">
          <div style={{ ...styles.card, minHeight: 500, display: 'flex', flexDirection: 'column' }}>
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center"><h3 className="font-bold text-slate-800 flex items-center gap-2 text-[15px]"><CalendarDays size={18} className="text-[#106fa6]" /> Kết quả Xếp lịch (Preview)</h3></div>
            <div className="p-5 flex-1 flex flex-col">
              {hasData ? (
                <div className="overflow-y-auto max-h-[600px] custom-scrollbar rounded-lg border border-slate-200">
                  <table className="w-full text-left bg-white">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0"><tr className="text-[12px] text-slate-500 font-semibold"><th className="py-3 px-4 border-r">Mã Lớp</th><th className="py-3 px-4 border-r">Môn Học</th><th className="py-3 px-4 border-r">Lịch Sinh Ra</th><th className="py-3 px-4">Trạng Thái</th></tr></thead>
                    <tbody className="text-[13px] align-middle">
                      {scheduleResults.map((res, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-[#106fa6] border-r">{res.class_id}</td>
                          <td className="py-3 px-4 border-r font-medium">{res.subject_name || 'N/A'}</td>
                          <td className="py-3 px-4 border-r">
                            {res.schedules && res.schedules.length > 0 ? (
                               <div className="flex flex-wrap gap-1.5">{res.schedules.map((s, i) => <div key={i} className="bg-blue-50 px-2 py-1 rounded border border-blue-100 text-blue-800 text-[11px] font-semibold">T{s.weekday+2}-Ca {s.shift} | {s.room_id}</div>)}</div>
                            ) : <span className="text-rose-500 font-semibold italic">Không xếp được</span>}
                          </td>
                          <td className="py-3 px-4">
                            {res.errors?.length > 0 ? <ul className="list-disc pl-4 text-[11px] text-rose-600 font-semibold">{res.errors.map((e,i) => <li key={i}>{e}</li>)}</ul> : <span className="text-emerald-500 font-bold text-[11px]">✔ Xếp đủ lịch</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex-1 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-10"><h3 className="text-xl font-bold text-slate-800 mb-2">Chưa có dữ liệu</h3><p className="text-[13px] text-slate-500">Chạy thuật toán để xem thời khóa biểu dự kiến.</p></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}