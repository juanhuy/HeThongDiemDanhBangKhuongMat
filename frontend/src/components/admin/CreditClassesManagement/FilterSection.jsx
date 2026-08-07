import React from 'react';
import { Search } from 'lucide-react';

const FilterSection = ({ filters, onFilterChange, metaData }) => {
  const handleChange = (e) => onFilterChange(e.target.name, e.target.value);

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-slate-200 flex flex-wrap gap-4 items-end">
      {/* 1. Học kỳ */}
      <div className="flex-1 min-w-[150px]">
        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Học kỳ</label>
        <select name="semester_id" value={filters.semester_id} onChange={handleChange} className="w-full bg-slate-50 border-slate-300 rounded-lg p-2 text-sm border focus:ring-2 focus:ring-blue-500">
          <option value="">-- Tất cả học kỳ --</option>
          {metaData.semesters.map(s => (
            <option key={s.semester_id} value={s.semester_id}>
              Học kỳ {s.semester} ({s.academic_year})
            </option>
          ))}
        </select>
      </div>

      {/* 2. Ngành học */}
      <div className="flex-1 min-w-[150px]">
        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Lọc theo Ngành</label>
        <select name="major_id" value={filters.major_id} onChange={handleChange} className="w-full bg-slate-50 border-slate-300 rounded-lg p-2 text-sm border focus:ring-2 focus:ring-blue-500">
          <option value="">-- Tất cả ngành --</option>
          {metaData.majors.map(m => <option key={m.major_id} value={m.major_id}>{m.major_name}</option>)}
        </select>
      </div>

      {/* 3. Lớp biên chế */}
      <div className="flex-1 min-w-[150px]">
        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Lớp biên chế</label>
        <select name="administrative_class_id" value={filters.administrative_class_id} onChange={handleChange} className="w-full bg-slate-50 border-slate-300 rounded-lg p-2 text-sm border focus:ring-2 focus:ring-blue-500">
          <option value="">-- Tất cả lớp --</option>
          {metaData.adminClasses.map(c => <option key={c.class_id} value={c.class_id}>{c.class_id}</option>)}
        </select>
      </div>

      {/* 4. Tìm kiếm tự do */}
      <div className="flex-[1.5] min-w-[200px]">
        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Mã / Tên Môn học</label>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input 
            type="text" name="subject_id" value={filters.subject_id} onChange={handleChange} 
            placeholder="Nhập mã môn..." 
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 text-sm rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

export default FilterSection;