import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, X, BarChart2, CheckCircle, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminClassesTab({ API_BASE, showToast, majors, faculties }) {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal tạo lớp mới
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ class_id: '', class_name: '', major_id: '', faculty_id: '', cohort: '2022-2027' });
  
  // Modal Thêm Sinh viên vào lớp
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [selectedClassForAdd, setSelectedClassForAdd] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);

  // Modal Xem danh sách sinh viên trong lớp
  const [selectedClassDetails, setSelectedClassDetails] = useState(null);

  useEffect(() => {
    fetchClassesAndStudents();
  }, []);

  const fetchClassesAndStudents = async () => {
    try {
      setLoading(true);
      const [clsRes, stRes] = await Promise.all([
        fetch(`${API_BASE}/api/administrative-classes`),
        fetch(`${API_BASE}/api/admin/students/`)
      ]);
      if (clsRes.ok) {
        const resJson = await clsRes.json();
        const listClasses = resJson.data || resJson.items || resJson || [];
        setClasses(Array.isArray(listClasses) ? listClasses : []);
      }
      if (stRes.ok) {
        const data = await stRes.json();
        setStudents(Array.isArray(data) ? data : (data.items || []));
      }
    } catch (err) {
      showToast?.('Lỗi tải dữ liệu lớp biên chế', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Tổng hợp danh sách lớp kết hợp mapping thông minh với Ngành và Khoa từ Sinh viên hoặc tên lớp
  const classesList = useMemo(() => {
    const studentMapByClass = {};
    students.forEach(s => {
      const cId = s.administrative_class || s.lop_base;
      if (cId) {
        if (!studentMapByClass[cId]) studentMapByClass[cId] = [];
        studentMapByClass[cId].push(s);
      }
    });

    const baseList = classes.length > 0 ? classes : Object.keys(studentMapByClass).map(cId => ({ class_id: cId }));

    return baseList.map(c => {
      const cId = c.class_id || c.name;
      const classStudents = studentMapByClass[cId] || [];
      
      // 1. Thử lấy major_id và faculty_id từ sinh viên đang thực tế ở trong lớp đó
      let foundMajorId = c.major_id;
      let foundFacultyId = c.faculty_id;

      if (!foundMajorId && classStudents.length > 0) {
        const sampleStudent = classStudents.find(s => s.major_id || s.major);
        foundMajorId = sampleStudent?.major_id || sampleStudent?.major;
      }

      if (!foundFacultyId && classStudents.length > 0) {
        const sampleStudent = classStudents.find(s => s.faculty_id);
        foundFacultyId = sampleStudent?.faculty_id;
      }

      // 2. Nếu lớp trống (sĩ số = 0), tự động nhận diện dựa vào ký tự viết tắt trên mã lớp (AT, CN, VT, PT, QT...)
      if (!foundMajorId) {
        const upperCId = cId.toUpperCase();
        const matchedMajor = majors.find(m => {
          const mName = (m.major_name || '').toLowerCase();
          const mId = (m.major_id || '').toLowerCase();
          if (upperCId.includes('AT') && (mName.includes('an toàn') || mId.includes('at'))) return true;
          if (upperCId.includes('CN') && (mName.includes('công nghệ thông tin') || mId.includes('cntt'))) return true;
          if (upperCId.includes('VT') && mName.includes('viễn thông')) return true;
          if (upperCId.includes('QT') && mName.includes('quản trị')) return true;
          if (upperCId.includes('PT') && (mName.includes('đa phương tiện') || mName.includes('truyền thông'))) return true;
          return false;
        });
        if (matchedMajor) {
          foundMajorId = matchedMajor.major_id;
          if (!foundFacultyId) foundFacultyId = matchedMajor.faculty_id;
        }
      }

      // Map ra tên hiển thị chuẩn
      const matchedMajor = majors.find(m => m.major_id === foundMajorId);
      const majorDisplay = matchedMajor ? `${matchedMajor.major_id} - ${matchedMajor.major_name}` : (foundMajorId || '—');

      const matchedFaculty = faculties.find(f => f.faculty_id === foundFacultyId || f.faculty_id === matchedMajor?.faculty_id);
      const facultyDisplay = matchedFaculty ? matchedFaculty.faculty_name : (foundFacultyId || '—');

      return {
        class_id: cId,
        class_name: c.class_name || c.name || cId,
        major_display: majorDisplay,
        faculty_display: facultyDisplay,
        studentsCount: classStudents.length
      };
    });
  }, [classes, students, majors, faculties]);

  // Sơ đồ trực quan: Số lượng sinh viên theo từng lớp biên chế
  const chartData = useMemo(() => {
    return classesList.map(cls => ({
      name: cls.class_id,
      count: cls.studentsCount
    }));
  }, [classesList]);

  const handleSaveClass = async (e) => {
    e.preventDefault();
    if (!form.class_id || !form.major_id) {
      showToast?.('Vui lòng điền đủ thông tin bắt buộc', 'danger');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/administrative-classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        showToast?.('Tạo lớp biên chế thành công');
        setIsModalOpen(false);
        setForm({ class_id: '', class_name: '', major_id: '', faculty_id: '', cohort: '2022-2027' });
        fetchClassesAndStudents();
      } else {
        const err = await res.json();
        showToast?.(err.detail || 'Lỗi khi tạo lớp', 'danger');
      }
    } catch (err) {
      showToast?.('Lỗi kết nối server', 'danger');
    }
  };

  const handleAddStudentsToClass = async () => {
    if (!selectedClassForAdd || selectedStudents.length === 0) {
      showToast?.('Vui lòng chọn lớp và ít nhất 1 sinh viên', 'danger');
      return;
    }
    try {
      await Promise.all(
        selectedStudents.map(sId => 
          fetch(`${API_BASE}/api/admin/students/${sId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ administrative_class: selectedClassForAdd.class_id })
          })
        )
      );
      showToast?.('Đã thêm sinh viên vào lớp biên chế thành công!');
      setIsAddStudentModalOpen(false);
      setSelectedStudents([]);
      fetchClassesAndStudents();
    } catch (err) {
      showToast?.('Lỗi khi thêm sinh viên vào lớp', 'danger');
    }
  };

  const filteredClasses = classesList.filter(c => 
    (c.class_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.major_display || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* TOOLBAR */}
      <div style={{ background: '#fff', padding: '15px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative', maxWidth: '350px', width: '100%' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Tìm kiếm lớp biên chế, ngành..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{ padding: '10px 16px', background: '#106fa6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={18}/> Tạo lớp biên chế mới
        </button>
      </div>

      {/* SƠ ĐỒ TRỰC QUAN */}
      <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <BarChart2 size={18} color="#106fa6"/> Sơ đồ trực quan: Số lượng sinh viên theo Lớp biên chế
        </h4>
        <div style={{ width: '100%', height: '240px' }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Số sinh viên" fill="#106fa6" radius={[4, 4, 0, 0]} barSize={35} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Chưa có dữ liệu sơ đồ</div>
          )}
        </div>
      </div>

      {/* BẢNG DANH SÁCH LỚP BIÊN CHẾ */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px', textAlign: 'center', width: '60px' }}>STT</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Mã Lớp Biên Chế</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Tên Lớp</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Thuộc Ngành</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Khoa Quản Lý</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Sĩ số SV</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Đang tải dữ liệu...</td></tr>
            ) : filteredClasses.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Chưa có lớp biên chế nào được tạo.</td></tr>
            ) : (
              filteredClasses.map((cls, index) => (
                <tr key={cls.class_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>{index + 1}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#106fa6' }}>{cls.class_id}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#334155' }}>{cls.class_name}</td>
                  <td style={{ padding: '12px 16px' }}>{cls.major_display}</td>
                  <td style={{ padding: '12px 16px' }}>{cls.faculty_display}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, fontSize: '0.8rem' }}>
                      {cls.studentsCount} sinh viên
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button 
                        onClick={() => setSelectedClassDetails(cls)} 
                        style={{ padding: '6px 12px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                      >
                        Xem SV
                      </button>
                      <button 
                        onClick={() => { setSelectedClassForAdd(cls); setIsAddStudentModalOpen(true); }} 
                        style={{ padding: '6px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                      >
                        + Add SV
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL TẠO LỚP BIÊN CHẾ */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '450px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>Tạo Lớp Biên Chế Mới</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: '#e2e8f0', border: 'none', borderRadius: '50%', padding: '6px', cursor: 'pointer' }}><X size={18}/></button>
            </div>
            <form onSubmit={handleSaveClass} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.85rem' }}>Mã Lớp Biên Chế *</label>
                <input required value={form.class_id} onChange={e => setForm({...form, class_id: e.target.value.toUpperCase()})} placeholder="VD: D22CQCN02-N" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.85rem' }}>Tên Lớp *</label>
                <input required value={form.class_name} onChange={e => setForm({...form, class_name: e.target.value})} placeholder="VD: Công nghệ thông tin 02" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.85rem' }}>Thuộc Ngành *</label>
                <select 
                  required 
                  value={form.major_id} 
                  onChange={e => {
                    const selectedMajorId = e.target.value;
                    const matchedMajor = majors.find(m => m.major_id === selectedMajorId);
                    setForm({
                      ...form, 
                      major_id: selectedMajorId,
                      faculty_id: matchedMajor?.faculty_id || form.faculty_id
                    });
                  }} 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                >
                  <option value="">-- Chọn Ngành --</option>
                  {majors.map(m => <option key={m.major_id} value={m.major_id}>{m.major_id} - {m.major_name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.85rem' }}>Thuộc Khoa Quản Lý *</label>
                <select required value={form.faculty_id} onChange={e => setForm({...form, faculty_id: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                  <option value="">-- Chọn Khoa --</option>
                  {faculties.map(f => <option key={f.faculty_id} value={f.faculty_id}>{f.faculty_name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Hủy</button>
                <button type="submit" style={{ padding: '10px 16px', background: '#106fa6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Xác nhận tạo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADD SINH VIÊN VÀO LỚP */}
      {isAddStudentModalOpen && selectedClassForAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>Thêm Sinh Viên vào lớp: <span style={{ color: '#106fa6' }}>{selectedClassForAdd.class_id}</span></h3>
              <button onClick={() => setIsAddStudentModalOpen(false)} style={{ background: '#e2e8f0', border: 'none', borderRadius: '50%', padding: '6px', cursor: 'pointer' }}><X size={18}/></button>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 10px 0' }}>Chọn các sinh viên dưới đây để phân bổ vào lớp biên chế:</p>
            
            <div style={{ overflowY: 'auto', maxHeight: '350px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
              {students.map(s => {
                const sId = s.student_id || s.mssv;
                const isSelected = selectedStudents.includes(sId);
                return (
                  <div 
                    key={sId} 
                    onClick={() => {
                      if (isSelected) setSelectedStudents(selectedStudents.filter(id => id !== sId));
                      else setSelectedStudents([...selectedStudents, sId]);
                    }}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: isSelected ? '#f0fdf4' : '#fff' }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{s.full_name || s.ho_ten} ({sId})</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Lớp hiện tại: {s.administrative_class || s.lop_base || 'Chưa có'}</div>
                    </div>
                    <input type="checkbox" checked={isSelected} onChange={() => {}} style={{ cursor: 'pointer' }} />
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setIsAddStudentModalOpen(false)} style={{ padding: '10px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Hủy</button>
              <button onClick={handleAddStudentsToClass} style={{ padding: '10px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Xác nhận thêm ({selectedStudents.length})</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XEM DANH SÁCH SINH VIÊN TRONG LỚP */}
      {selectedClassDetails && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '700px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>Danh sách SV lớp: <span style={{ color: '#106fa6' }}>{selectedClassDetails.class_id}</span></h3>
              <button onClick={() => setSelectedClassDetails(null)} style={{ background: '#e2e8f0', border: 'none', borderRadius: '50%', padding: '6px', cursor: 'pointer' }}><X size={18}/></button>
            </div>
            
            <div style={{ overflowY: 'auto', maxHeight: '400px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '10px', textAlign: 'center' }}>STT</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>MSSV</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Họ và Tên</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Email</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {students.filter(s => (s.administrative_class || s.lop_base) === selectedClassDetails.class_id).length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Lớp này chưa có sinh viên nào.</td></tr>
                  ) : (
                    students.filter(s => (s.administrative_class || s.lop_base) === selectedClassDetails.class_id).map((s, idx) => (
                      <tr key={s.student_id || s.mssv} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px', textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ padding: '10px', fontWeight: 600, color: '#106fa6' }}>{s.student_id || s.mssv}</td>
                        <td style={{ padding: '10px', fontWeight: 600 }}>{s.full_name || s.ho_ten}</td>
                        <td style={{ padding: '10px', color: '#64748b' }}>{s.email || '—'}</td>
                        <td style={{ padding: '10px' }}><span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '10px', fontWeight: 600, fontSize: '0.75rem' }}>{s.academic_status || 'Đang học'}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setSelectedClassDetails(null)} style={{ padding: '8px 16px', background: '#106fa6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}