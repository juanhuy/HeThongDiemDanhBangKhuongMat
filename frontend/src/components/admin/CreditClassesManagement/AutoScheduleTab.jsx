import React, { useState, useEffect } from 'react';
import { Rocket, SlidersHorizontal, Building2, CalendarDays, FileDown, Trash2 } from 'lucide-react';
import { API_BASE } from '../../../api/client';
import { listRooms } from '../../../api/rooms';

export default function AutoScheduleTab({ classes = [], lecturers = [], semesters = [], faculties = [], showToast, onSuccess }) {
  const [params, setParams] = useState({
    semester: semesters.length > 0 ? semesters[0].semester_id : '',
    startDate: '2024-09-01',
    faculty: 'all',
    theoryPeriods: 30, practicePeriods: 15,
    avoidSunday: true, avoidEvening: true, blockScheduling: true 
  });

  const [hasData, setHasData] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [scheduleResults, setScheduleResults] = useState([]);
  const [roomStats, setRoomStats] = useState({ total: 0, theoryReady: 0, theoryMaintenance: 0, practiceReady: 0, practiceMaintenance: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  useEffect(() => { if (semesters.length > 0 && !params.semester) setParams(prev => ({ ...prev, semester: semesters[0].semester_id })); }, [semesters]);

  // Load existing schedules when changing semester
  useEffect(() => {
    if (!params.semester) return;
    const existingClasses = classes.filter(c => c.semester_id === params.semester && c.schedules && c.schedules.length > 0);
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
  }, [params.semester, classes, unsavedChanges]);

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
    if (!params.semester || !params.startDate) return showToast?.('Vui lòng chọn học kỳ và ngày khai giảng', 'error');
    setIsGenerating(true); setHasData(false); setScheduleResults([]);

    try {
      const targetClasses = classes.filter(c => c.semester_id === params.semester && c.lecturer_id && (!c.schedules || c.schedules.length === 0));
      if (targetClasses.length === 0) { showToast?.('Không còn lớp nào cần xếp lịch!', 'warning'); setIsGenerating(false); return; }

      const classRequests = targetClasses.map(cls => ({
        credit_class_id: cls.class_id, lecturer_id: cls.lecturer_id,
        theory_periods: parseInt(params.theoryPeriods) || 0, practice_periods: parseInt(params.practicePeriods) || 0,
        max_students: cls.max_students || 40, subject_name: cls.subject_name
      }));

      const payload = { start_date: params.startDate, avoid_evening_shift: params.avoidEvening, allow_block_scheduling: params.blockScheduling, classes: classRequests };
      const response = await fetch(`${API_BASE}/api/schedules/auto-suggest-batch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
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
      const response = await fetch(`${API_BASE}/api/schedules/batch-save`, { 
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
    if (!params.semester) return showToast?.('Vui lòng chọn học kỳ', 'error');
    if (!window.confirm('Bạn có chắc chắn muốn XÓA TOÀN BỘ lịch học của học kỳ này không? Hành động này không thể hoàn tác!')) return;
    
    setIsResetting(true);
    try {
      const response = await fetch(`${API_BASE}/api/schedules/reset`, { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ semester_id: params.semester }) 
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
    <div className="flex flex-col gap-6 w-full font-sans bg-white p-2">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h2 className="text-[22px] font-bold text-slate-800">Xếp lịch & Phòng học Tự động</h2><p className="text-[13px] text-slate-500 mt-1">Configure parameters and run the scheduling algorithm.</p></div>
        <div className="flex items-center gap-3">
          <button onClick={handleReset} disabled={isGenerating || isSaving || isResetting} className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-70 shadow-sm transition-all"><Trash2 size={18} className={isResetting ? "animate-spin" : ""} /> {isResetting ? 'Đang xóa...' : 'Reset Lịch'}</button>
          {unsavedChanges && hasData && (
             <button onClick={handleSave} disabled={isSaving || isGenerating || isResetting} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-70 shadow-sm transition-all"><FileDown size={18} className={isSaving ? "animate-bounce" : ""} /> {isSaving ? 'Đang lưu...' : 'Lưu & Áp dụng Lịch'}</button>
          )}
          <button onClick={handleGenerate} disabled={isGenerating || isSaving || isResetting} className="bg-[#106fa6] hover:bg-[#0b5a96] text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-70 shadow-sm"><Rocket size={18} className={isGenerating ? "animate-pulse" : ""} /> {isGenerating ? 'Đang chạy...' : 'Chạy thuật toán'}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-bold text-slate-800 flex items-center gap-2 text-[15px]"><SlidersHorizontal size={18} className="text-[#106fa6]" /> Tham số Đầu vào</h3></div>
            <div className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5"><label className="text-[12px] font-semibold text-slate-600">Học kỳ</label><select className="w-full h-10 px-3 border border-slate-300 rounded-lg text-[13px] outline-none" value={params.semester} onChange={(e) => setParams({...params, semester: e.target.value})}>{semesters.map(s => <option key={s.semester_id} value={s.semester_id}>Học kỳ {s.semester}</option>)}</select></div>
              <div className="flex flex-col gap-1.5"><label className="text-[12px] font-semibold text-slate-600">Ngày khai giảng (Tính lịch từ tuần này)</label><input type="date" className="w-full h-10 px-3 border border-slate-300 rounded-lg text-[13px] outline-none" value={params.startDate} onChange={(e) => setParams({...params, startDate: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5"><label className="text-[12px] font-semibold text-slate-600">Tiết Lý thuyết/Lớp</label><input type="number" min="0" className="w-full h-10 px-3 border border-slate-300 rounded-lg text-[13px] outline-none" value={params.theoryPeriods} onChange={(e) => setParams({...params, theoryPeriods: e.target.value})} /></div>
                <div className="flex flex-col gap-1.5"><label className="text-[12px] font-semibold text-slate-600">Tiết Thực hành/Lớp</label><input type="number" min="0" className="w-full h-10 px-3 border border-slate-300 rounded-lg text-[13px] outline-none" value={params.practicePeriods} onChange={(e) => setParams({...params, practicePeriods: e.target.value})} /></div>
              </div>
              <div className="border-t border-slate-100 pt-4 mt-2 flex flex-col gap-3">
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={params.avoidEvening} onChange={(e) => setParams({...params, avoidEvening: e.target.checked})} className="w-4 h-4 rounded text-[#106fa6]" /><span className="text-[13px] text-slate-700">Tránh xếp ca tối</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={params.blockScheduling} onChange={(e) => setParams({...params, blockScheduling: e.target.checked})} className="w-4 h-4 rounded text-[#106fa6]" /><span className="text-[13px] text-slate-700 font-semibold text-emerald-600">Dồn 2 buổi/tuần (Nếu kẹt phòng)</span></label>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
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
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm h-full flex flex-col min-h-[500px]">
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