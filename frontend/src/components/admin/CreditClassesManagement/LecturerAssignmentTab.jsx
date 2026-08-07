import React, { useState, useMemo } from 'react';
import { BookOpen, PieChart as PieChartIcon, UserCheck, UserX, AlertTriangle, ClipboardList, Users, Search } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function LecturerAssignmentTab({ classes = [], lecturers = [], showToast, onSuccess }) {
  const [searchTerm, setSearchTerm] = useState('');

  const unassignedClasses = useMemo(() => classes.filter(c => !c.lecturer_id && !c.lecturer_name), [classes]);
  const assignedCount = classes.length - unassignedClasses.length;
  const percent = classes.length === 0 ? 0 : Math.round((assignedCount / classes.length) * 100);

  const chartData = [
    { name: 'Đã phân công', value: assignedCount, color: '#10b981' },
    { name: 'Chưa phân công', value: unassignedClasses.length, color: '#f43f5e' }
  ];

  // Tính số giờ giảng viên (Mock 1 lớp = 3 giờ)
  const lecturerWorkloads = useMemo(() => {
    const workloads = {};
    lecturers.forEach(l => workloads[l.value] = { name: l.label, dept: l.department, hours: 0, classes: [] });
    classes.forEach(c => {
      if (c.lecturer_id && workloads[c.lecturer_id]) {
        workloads[c.lecturer_id].hours += (c.credits || 3) * 1.5;
        workloads[c.lecturer_id].classes.push(c.class_id);
      }
    });
    return Object.values(workloads).sort((a,b) => b.hours - a.hours);
  }, [classes, lecturers]);

  const overloadedLecturers = lecturerWorkloads.filter(l => l.hours > 40);
  const renderCustomizedLabel = ({ cx, cy }) => (<text x={cx} y={cy} fill="#0f172a" textAnchor="middle" dominantBaseline="central" fontSize="18" fontWeight="bold">{percent}%</text>);

  return (
    <div className="flex flex-col gap-6 font-sans">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen size={24} className="text-[#106fa6]" /><h2 className="text-[20px] font-bold text-slate-800 m-0">Phân công Giảng viên</h2>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-[15px] font-bold text-slate-700 flex items-center gap-2 mb-5"><PieChartIcon size={18} className="text-slate-500" /> Tình trạng Phân công</h3>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center mb-6">
          <div className="md:col-span-3 flex justify-center md:justify-start lg:pl-4">
            <div className="w-28 h-28 relative">
              <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData} cx="50%" cy="50%" innerRadius={35} outerRadius={50} dataKey="value" stroke="none" labelLine={false} label={renderCustomizedLabel}>{chartData.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie></PieChart></ResponsiveContainer>
            </div>
          </div>
          <div className="md:col-span-9 flex flex-col gap-3">
            <div className="flex items-center justify-between bg-[#d1fae5] px-4 py-2.5 rounded-lg border border-[#a7f3d0]"><div className="flex items-center gap-2 text-[#059669] font-semibold text-[13px]"><UserCheck size={16} /> Đã phân công:</div><span className="font-bold text-[#059669] text-[14px]">{assignedCount}</span></div>
            <div className="flex items-center justify-between bg-[#ffe4e6] px-4 py-2.5 rounded-lg border border-[#fecdd3]"><div className="flex items-center gap-2 text-[#e11d48] font-semibold text-[13px]"><UserX size={16} /> Chưa có GV:</div><span className="font-bold text-[#e11d48] text-[14px]">{unassignedClasses.length}</span></div>
          </div>
        </div>
        <hr className="border-slate-100 mb-5" />
        <div>
          <h4 className="text-[13px] font-bold text-[#e11d48] flex items-center gap-2 mb-3"><AlertTriangle size={16} /> Cảnh báo quá tải ({">"}40h/tuần)</h4>
          <div className="flex flex-col gap-2.5">
            {overloadedLecturers.length > 0 ? overloadedLecturers.map((gv, idx) => (
              <div key={idx} className="flex items-center justify-between bg-[#ffe4e6] px-4 py-2 rounded-lg border border-[#fecdd3]"><span className="text-[13px] font-semibold text-[#be123c]">{gv.name}</span><span className="text-[13px] font-bold text-[#be123c]">{gv.hours}h</span></div>
            )) : <span className="text-[13px] text-emerald-600 font-semibold italic">Không có giảng viên nào vượt định mức.</span>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center"><h3 className="text-[15px] font-bold text-slate-800 flex items-center gap-2"><ClipboardList size={18} className="text-[#e11d48]" /> Lớp chưa phân công</h3><span className="bg-[#ffe4e6] text-[#e11d48] px-3 py-1 rounded-full text-[12px] font-bold border border-[#fecdd3]">{unassignedClasses.length} Lớp</span></div>
        <div className="overflow-x-auto max-h-[300px] custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white border-b border-slate-200 sticky top-0 shadow-sm">
              <tr className="text-[12px] text-slate-500 font-semibold"><th className="py-3 px-5">Mã Lớp</th><th className="py-3 px-5">Môn học</th><th className="py-3 px-5">Số giờ</th><th className="py-3 px-5">Phân công Giảng viên</th><th className="py-3 px-5 text-center">Thao tác</th></tr>
            </thead>
            <tbody className="text-[13px] text-slate-700">
              {unassignedClasses.map((cls, idx) => (
                <tr key={idx} className="border-b border-slate-100"><td className="py-3 px-5 font-semibold text-slate-800">{cls.class_id}</td><td className="py-3 px-5">{cls.subject_name}</td><td className="py-3 px-5">{cls.credits*1.5}h</td>
                  <td className="py-3 px-5"><select className="w-full max-w-[200px] h-9 px-3 border border-slate-300 rounded-md text-[13px] outline-none"><option value="">-- Chọn --</option>{lecturers.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}</select></td>
                  <td className="py-3 px-5 text-center"><button className="bg-[#0284c7] hover:bg-[#0369a1] text-white px-4 py-1.5 rounded-md font-semibold">Lưu</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col md:flex-row justify-between gap-4 bg-slate-50/50"><h3 className="text-[15px] font-bold text-slate-800 flex items-center gap-2"><Users size={18} className="text-slate-600" /> Khối lượng giảng dạy</h3>
          <div className="relative w-full md:w-64"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Tìm..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full h-9 pl-9 pr-3 border border-slate-300 rounded-md text-[13px] outline-none"/></div>
        </div>
        <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white border-b border-slate-200 sticky top-0"><tr className="text-[12px] text-slate-500 font-semibold"><th className="py-3 px-5">Giảng viên</th><th className="py-3 px-5 text-center">Tổng giờ</th><th className="py-3 px-5">Các lớp phụ trách</th><th className="py-3 px-5 text-center">Trạng thái</th></tr></thead>
            <tbody className="text-[13px] text-slate-700">
              {lecturerWorkloads.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase())).map((gv, idx) => (
                <tr key={idx} className="border-b border-slate-100"><td className="py-3 px-5 font-semibold text-slate-800">{gv.name}</td><td className={`py-3 px-5 font-bold text-center ${gv.hours>40?'text-[#e11d48]':'text-slate-700'}`}>{gv.hours}h</td><td className="py-3 px-5 max-w-[250px] truncate" title={gv.classes.join(', ')}>{gv.classes.join(', ') || 'Chưa dạy'}</td>
                  <td className="py-3 px-5 text-center"><span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${gv.hours<=40?'bg-[#d1fae5] text-[#059669] border-[#a7f3d0]':'bg-[#ffe4e6] text-[#e11d48] border-[#fecdd3]'}`}>{gv.hours<=40?'Bình thường':'Quá tải'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}