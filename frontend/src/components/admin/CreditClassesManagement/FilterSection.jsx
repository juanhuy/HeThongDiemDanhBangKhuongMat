import React from 'react';
import { Search, RotateCcw } from 'lucide-react';

const controlClass =
  'h-10 w-full rounded-md border border-[#cbd5e1] bg-white px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#106fa6] focus:ring-2 focus:ring-[#106fa6]/20';

const labelClass =
  'mb-1 block text-[13px] font-semibold text-slate-600';

const FilterSection = ({
  filters,
  onFilterChange,
  onResetFilters,
  metaData,
}) => {
  const handleChange = (event) => {
    const { name, value } = event.target;
    onFilterChange(name, value);
  };

  return (
      <section style={{ padding: '1rem', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', minHeight: 'fit-content' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex h-9 items-center justify-center gap-2 self-start rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.98] sm:self-auto"
          >
            <RotateCcw className="h-4 w-4 text-slate-500" />
            Đặt lại
          </button>
        </div>
        {/* Các bộ lọc */}
        <div  style={{ display: 'flex', gap: '10px' }}>
            {/* Học kỳ */}
            <div className="min-w-0">
              <label
                htmlFor="semester_id"
                className="mb-1 block text-[13px] font-semibold text-slate-600"
              >
                Học kỳ
              </label>

              <select
                id="semester_id"
                name="semester_id"
                value={filters.semester_id}
                onChange={handleChange}
                className="h-10 w-full rounded-md border border-[#cbd5e1] bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#106fa6] focus:ring-2 focus:ring-[#106fa6]/20"
              >
                <option value="">-- Tất cả học kỳ --</option>

                {metaData.semesters.map((semester) => (
                  <option
                    key={semester.semester_id}
                    value={semester.semester_id}
                  >
                    Học kỳ {semester.semester} ({semester.academic_year})
                  </option>
                ))}
              </select>
            </div>

            {/* Ngành học */}
            <div className="min-w-0">
              <label
                htmlFor="major_id"
                className="mb-1 block text-[13px] font-semibold text-slate-600"
              >
                Ngành học
              </label>

              <select
                id="major_id"
                name="major_id"
                value={filters.major_id}
                onChange={handleChange}
                className="h-10 w-full rounded-md border border-[#cbd5e1] bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#106fa6] focus:ring-2 focus:ring-[#106fa6]/20"
              >
                <option value="">-- Tất cả ngành --</option>

                {metaData.majors.map((major) => (
                  <option key={major.major_id} value={major.major_id}>
                    {major.major_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Lớp biên chế */}
            <div className="min-w-0">
              <label
                htmlFor="administrative_class_id"
                className="mb-1 block text-[13px] font-semibold text-slate-600"
              >
                Lớp biên chế
              </label>

              <select
                id="administrative_class_id"
                name="administrative_class_id"
                value={filters.administrative_class_id}
                onChange={handleChange}
                className="h-10 w-full rounded-md border border-[#cbd5e1] bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#106fa6] focus:ring-2 focus:ring-[#106fa6]/20"
              >
                <option value="">-- Tất cả lớp --</option>

                {metaData.adminClasses.map((adminClass) => (
                  <option
                    key={adminClass.class_id}
                    value={adminClass.class_id}
                  >
                    {adminClass.class_id}
                  </option>
                ))}
              </select>
            </div>

            {/* Trạng thái */}
            <div className="min-w-0">
              <label
                htmlFor="status"
                className="mb-1 block text-[13px] font-semibold text-slate-600"
              >
                Trạng thái
              </label>

              <select
                id="status"
                name="status"
                value={filters.status}
                onChange={handleChange}
                className="h-10 w-full rounded-md border border-[#cbd5e1] bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#106fa6] focus:ring-2 focus:ring-[#106fa6]/20"
              >
                <option value="">-- Tất cả trạng thái --</option>
                <option value="Active">Đang mở</option>
                <option value="Planning">Kế hoạch</option>
                <option value="Closed">Đã đóng</option>
              </select>
            </div>

            {/* Mã / tên môn học */}
            <div className="min-w-0">
              <label
                htmlFor="subject_id"
                className="mb-1 block text-[13px] font-semibold text-slate-600"
              >
                Mã / tên môn học
              </label>

              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input 
                  type="text" 
                  placeholder="Tìm kiếm ngành..."
                  value={filters.subject_id}
                  onChange={handleChange}
                  style={{ padding: '8px 12px 8px 36px', borderRadius: '6px', border: '1px solid #d0e0eb', outline: 'none' }}
                />
              </div>
            </div>
        </div>
      </section>
  );
};

export default FilterSection;