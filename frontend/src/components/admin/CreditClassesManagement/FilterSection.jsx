import React from 'react';
import { Search, Filter } from 'lucide-react';
import SearchableSelect from '../common/SearchableSelect';

export default function FilterSection({
  semesters, faculties, subjects, adminClasses,
  selectedSemester, setSelectedSemester,
  selectedFaculty, setSelectedFaculty,
  selectedSubject, setSelectedSubject,
  searchTerm, setSearchTerm
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 mb-6 shadow-sm">
      <div className="flex flex-wrap gap-5 items-end">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-bold text-slate-600 mb-2">Học kỳ</label>
          <SearchableSelect options={semesters} value={selectedSemester} onChange={setSelectedSemester} />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-bold text-slate-600 mb-2">Khoa/Bộ môn</label>
          <select
            className="w-full border border-slate-300 rounded text-sm px-3 py-[9px] text-slate-700 bg-white focus:outline-none focus:border-[#1565c0]"
            value={selectedFaculty}
            onChange={(e) => setSelectedFaculty(e.target.value)}
          >
            <option value="">Tất cả khoa</option>
            {faculties.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-bold text-slate-600 mb-2">Môn học</label>
          <SearchableSelect
            options={[{ value: '', label: 'Tất cả môn học' }, ...subjects]}
            value={selectedSubject}
            onChange={setSelectedSubject}
            placeholder="Chọn môn học..."
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-bold text-slate-600 mb-2">Tìm kiếm</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Mã lớp..."
              className="w-full pl-9 pr-3 py-[9px] border border-slate-300 rounded text-sm focus:outline-none focus:border-[#1565c0]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <button
          onClick={() => { setSelectedFaculty(''); setSelectedSubject(''); setSearchTerm(''); }}
          className="flex items-center justify-center gap-2 px-6 py-[9px] border border-[#1565c0] rounded text-sm font-semibold text-[#1565c0] hover:bg-blue-50 transition-colors h-[40px]"
        >
          <Filter size={16} /> Xóa lọc
        </button>
      </div>
    </div>
  );
}