import React from 'react';
import { Search } from 'lucide-react';

const FilterSection = ({ filters, onFilterChange, metaData }) => {
  const handleChange = (e) => onFilterChange(e.target.name, e.target.value);

  const containerStyle = {
    background: "#ffffff", padding: "15px 20px", borderRadius: "12px",
    border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    display: "flex", flexWrap: "wrap", gap: "15px", alignItems: "flex-end"
  };

  const labelStyle = { display: "block", fontSize: "0.8rem", fontWeight: "600", color: "#64748b", marginBottom: "6px", textTransform: "uppercase" };
  const inputStyle = { width: "100%", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "8px 12px", fontSize: "0.9rem", color: "#334155", outline: "none", transition: "all 0.2s" };

  return (
    <div style={containerStyle}>
      {/* 1. Học kỳ */}
      <div style={{ flex: "1 1 150px" }}>
        <label style={labelStyle}>Học kỳ</label>
        <select name="semester_id" value={filters.semester_id} onChange={handleChange} style={inputStyle}>
          <option value="">-- Tất cả học kỳ --</option>
          {metaData.semesters.map(s => (
            <option key={s.semester_id} value={s.semester_id}>Học kỳ {s.semester} ({s.academic_year})</option>
          ))}
        </select>
      </div>

      {/* 2. Ngành học */}
      <div style={{ flex: "1 1 150px" }}>
        <label style={labelStyle}>Lọc theo Ngành</label>
        <select name="major_id" value={filters.major_id} onChange={handleChange} style={inputStyle}>
          <option value="">-- Tất cả ngành --</option>
          {metaData.majors.map(m => <option key={m.major_id} value={m.major_id}>{m.major_name}</option>)}
        </select>
      </div>

      {/* 3. Lớp biên chế */}
      <div style={{ flex: "1 1 150px" }}>
        <label style={labelStyle}>Lớp biên chế</label>
        <select name="administrative_class_id" value={filters.administrative_class_id} onChange={handleChange} style={inputStyle}>
          <option value="">-- Tất cả lớp --</option>
          {metaData.adminClasses.map(c => <option key={c.class_id} value={c.class_id}>{c.class_id}</option>)}
        </select>
      </div>

      {/* 4. Tìm kiếm tự do */}
      <div style={{ flex: "1.5 1 200px", position: "relative" }}>
        <label style={labelStyle}>Mã / Tên Môn học</label>
        <div style={{ position: "relative" }}>
          <Search size={16} color="#94a3b8" style={{ position: "absolute", left: "12px", top: "10px" }} />
          <input 
            type="text" name="subject_id" value={filters.subject_id} onChange={handleChange} 
            placeholder="Nhập mã môn..." 
            style={{ ...inputStyle, paddingLeft: "36px" }}
          />
        </div>
      </div>
    </div>
  );
};

export default FilterSection;