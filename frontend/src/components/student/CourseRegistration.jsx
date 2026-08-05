import React, { useState, useEffect } from 'react';
import { creditClassesApi, schedulesApi } from '../../api';

export default function CourseRegistration({ user, showToast }) {
  const [availableClasses, setAvailableClasses] = useState([]);
  const [studentClasses, setStudentClasses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [regFilterMaLop, setRegFilterMaLop] = useState('');
  const [regFilterTenMon, setRegFilterTenMon] = useState('');
  const [regFilterNhom, setRegFilterNhom] = useState('');
  const [regFilterSoTC, setRegFilterSoTC] = useState('');
  const [regFilterLop, setRegFilterLop] = useState('');
  const [regFilterSoLuong, setRegFilterSoLuong] = useState('');
  const [regFilterConLai, setRegFilterConLai] = useState('');
  const [regFilterTo, setRegFilterTo] = useState('');

  const [scheduleModal, setScheduleModal] = useState({ open: false, classId: null, className: '' });

  const mssv = user?.mssv || user?.username?.toUpperCase();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [openRes, enrolledRes] = await Promise.all([
        creditClassesApi.listOpenCreditClasses(),
        mssv ? creditClassesApi.getStudentCreditClasses(mssv) : Promise.resolve({ classes: [] }),
      ]);
      setAvailableClasses(openRes.data || openRes.classes || []);
      setStudentClasses(enrolledRes.classes || []);
    } catch (err) {
      console.error(err);
      showToast?.(err.message || 'Lỗi tải dữ liệu đăng ký', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [mssv]);

  // Đăng ký (Rút gọn)
  const handleRegister = async (cItem) => {
    if (!mssv) return;
    try {
      await creditClassesApi.enrollStudent(cItem.class_id, mssv); // Gọi 1 lần duy nhất, Backend tự lo
      showToast?.(`Đăng ký học phần ${cItem.subject_id} thành công!`);
      await fetchData();
    } catch (err) {
      showToast?.(err.message || 'Đăng ký thất bại', 'danger');
    }
  };

  // Hủy đăng ký (Rút gọn)
  const handleUnregister = async (cGrouped) => {
    if (!mssv) return;
    if (!window.confirm(`Hủy đăng ký môn ${cGrouped.subject_name}?`)) return;
    try {
      // Ưu tiên gửi mã Tổ TH (nếu có), nếu không có thì gửi mã LT. Backend sẽ tự dọn dẹp các lớp liên đới.
      const targetClassId = cGrouped.practice_class_id || cGrouped.theory_class_id || cGrouped.class_id;
      await creditClassesApi.unenrollStudent(targetClassId, mssv);
      
      showToast?.(`Đã hủy đăng ký môn ${cGrouped.subject_name}`);
      await fetchData();
    } catch (err) {
      showToast?.(err.message || 'Hủy đăng ký thất bại', 'danger');
    }
  };

  const openSchedule = async (classId, className) => {
    try {
      const data = await schedulesApi.listSchedules();
      setSchedules(data.schedules || []);
    } catch {
      setSchedules([]);
    }
    setScheduleModal({ open: true, classId, className });
  };

  // KẾT HỢP DỮ LIỆU ĐỂ TÍNH TỔNG TÍN CHỈ CHUẨN (Chỉ cộng 1 lần/môn)
  const uniqueSubjects = [];
  let totalCredits = 0;
  studentClasses.forEach(c => {
    if (!uniqueSubjects.includes(c.subject_id)) {
      uniqueSubjects.push(c.subject_id);
      totalCredits += (Number(c.credits) || 0);
    }
  });

  const formatGroup = (num) => (num != null ? String(num).padStart(2, '0') : '-');

  // Helper lấy Lớp biên chế kế thừa
  const getTargetClassesLabel = (c) => {
    if (c.administrative_class_id) return c.administrative_class_id;
    if (Array.isArray(c.target_classes) && c.target_classes.length > 0) return c.target_classes.join(', ');
    if (c.class_type === 'Practice') {
      const parentId = c.parent_class_id || c.class_id.replace(/_T\d+$/, '');
      const parent = availableClasses.find(x => x.class_id === parentId) || studentClasses.find(x => x.class_id === parentId);
      if (parent && Array.isArray(parent.target_classes) && parent.target_classes.length > 0) {
        return parent.target_classes.join(', ');
      }
    }
    return '';
  };

  const enrolledIds = new Set(studentClasses.map((c) => c.class_id));

  // LỌC DANH SÁCH MỞ: Chỉ hiện Tổ TH (nếu môn có thực hành) hoặc Nhóm LT (nếu môn ko có thực hành)
  const practiceClasses = availableClasses.filter(c => c.class_type === 'Practice');
  const theoryWithPracticeIds = new Set(practiceClasses.map(c => c.parent_class_id));
  
  const selectableAvailableClasses = availableClasses.filter(c => {
    // Ẩn Nhóm LT nếu nó đã có Tổ TH (Bắt buộc SV phải chọn qua Tổ TH)
    if (c.class_type === 'Theory' && theoryWithPracticeIds.has(c.class_id)) return false;
    return true;
  });

  const filteredAvailable = selectableAvailableClasses.filter((c) => {
    const remaining = (c.max_students || 0) - (c.current_students || 0);
    return (
      (!regFilterMaLop || c.class_id?.toLowerCase().includes(regFilterMaLop.toLowerCase()) || c.subject_id?.toLowerCase().includes(regFilterMaLop.toLowerCase())) &&
      (!regFilterTenMon || c.subject_name?.toLowerCase().includes(regFilterTenMon.toLowerCase())) &&
      (!regFilterNhom || String(c.group_number || '').includes(regFilterNhom)) &&
      (!regFilterTo || String(c.sub_group_number || '').includes(regFilterTo)) &&
      (!regFilterSoTC || String(c.credits || '').includes(regFilterSoTC)) &&
      (!regFilterLop || getTargetClassesLabel(c).toLowerCase().includes(regFilterLop.toLowerCase())) &&
      (!regFilterSoLuong || String(c.max_students || '').includes(regFilterSoLuong)) &&
      (!regFilterConLai || String(remaining).includes(regFilterConLai))
    );
  });

  // GỘP DANH SÁCH ĐÃ ĐĂNG KÝ (Gom LT và TH vào 1 dòng)
  const groupedEnrolledClasses = Object.values(
    studentClasses.reduce((acc, c) => {
      if (!acc[c.subject_id]) {
        acc[c.subject_id] = { ...c, theory_class_id: c.class_type !== 'Practice' ? c.class_id : null, practice_class_id: c.class_type === 'Practice' ? c.class_id : null };
      } else {
        if (c.class_type === 'Practice') {
          acc[c.subject_id].sub_group_number = c.sub_group_number;
          acc[c.subject_id].practice_class_id = c.class_id;
        } else if (c.class_type === 'Theory' || c.class_type === 'Combined') {
          acc[c.subject_id].group_number = c.group_number;
          acc[c.subject_id].theory_class_id = c.class_id;
        }
      }
      return acc;
    }, {})
  );

  const exportCsv = () => {
    const rows = [['Mã MH', 'Tên môn học', 'Nhóm Tổ', 'Số TC', 'Lớp', 'Ngày đăng ký', 'Trạng thái']];
    groupedEnrolledClasses.forEach((c) =>
      rows.push([
        c.subject_id,
        c.subject_name || 'N/A',
        `${formatGroup(c.group_number)}${c.sub_group_number ? ' - ' + formatGroup(c.sub_group_number) : ''}`,
        c.credits != null ? c.credits : '-',
        getTargetClassesLabel(c) || '*',
        c.enrollment_date ? new Date(c.enrollment_date).toLocaleString('vi-VN') : '-',
        c.class_status || c.status || 'Enrolled',
      ])
    );
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'phieu_dang_ky.csv';
    a.click();
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</div>;
  }

  const thStyle = { padding: '12px 14px', textAlign: 'left', fontWeight: 600, color: '#0369a1', borderBottom: '1px solid #bae6fd', fontSize: '0.82rem', whiteSpace: 'nowrap' };
  const tdStyle = { padding: '10px 14px', color: '#475569', fontSize: '0.82rem', borderBottom: '1px solid #f0f9ff' };

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", padding: 20, background: '#f8fafc', minHeight: '100vh' }}>
      
      {/* Schedule Modal Giữ Nguyên */}
      {scheduleModal.open && (
         <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setScheduleModal({ open: false, classId: null, className: '' })}>
          {/* ... */}
          <div style={{ background: '#fff', borderRadius: 12, width: 560, maxWidth: '95vw', maxHeight: '80vh', overflow: 'auto', padding: 20 }} onClick={e => e.stopPropagation()}>
             <h3 style={{ color: '#0369a1', marginTop: 0 }}>Thời khóa biểu: {scheduleModal.className}</h3>
             <p style={{ color: '#64748b' }}>Tính năng xem TKB đang được tối ưu...</p>
          </div>
         </div>
      )}

      {/* TỰA ĐỀ CHUẨN PTIT */}
      <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '12px 20px', marginBottom: 20, color: '#0369a1', fontWeight: 600, fontSize: '0.9rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        ⚙️ ĐĂNG KÝ MÔN HỌC HỌC KỲ 1 - NĂM HỌC 2026 - 2027
      </div>

      <div style={{ marginBottom: 20 }}>
        <select style={{ width: '100%', maxWidth: 400, padding: '8px 12px', borderRadius: 4, border: '1px solid #cbd5e1', color: '#475569', outline: 'none' }}>
          <option>Môn chưa học trong CTĐT kế hoạch</option>
          <option>Tất cả các môn</option>
        </select>
      </div>

      {/* BẢNG 1: MÔN HỌC MỞ */}
      <div style={{ border: '1px solid #38bdf8', borderRadius: 8, background: '#fff', overflow: 'hidden', marginBottom: 24, boxShadow: '0 2px 4px rgba(14, 165, 233, 0.1)' }}>
        <div style={{ padding: '12px 16px', color: '#0369a1', fontWeight: 600, fontSize: '0.9rem' }}>
          Danh sách môn học mở cho đăng ký
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{...thStyle, width: 50, textAlign: 'center'}}>Chọn</th>
                <th style={{...thStyle}}>Mã MH</th>
                <th style={{...thStyle}}>Tên môn học</th>
                <th style={{...thStyle, textAlign: 'center'}}>Nhóm</th>
                <th style={{...thStyle, textAlign: 'center'}}>Tổ</th>
                <th style={{...thStyle, textAlign: 'center'}}>Số TC</th>
                <th style={{...thStyle}}>Lớp</th>
                <th style={{...thStyle, textAlign: 'center'}}>Số lượng</th>
                <th style={{...thStyle, textAlign: 'center'}}>Còn lại</th>
                <th style={{...thStyle}}>Thời khóa biểu</th>
              </tr>

              <tr style={{ background: '#fff' }}>
                <td style={tdStyle}></td>
                <td style={{ padding: '0 10px' }}><input value={regFilterMaLop} onChange={(e) => setRegFilterMaLop(e.target.value)} placeholder="..." style={{ width: '100%', border: 'none', borderBottom: '1px solid #bae6fd', fontSize: '0.8rem', outline: 'none' }} /></td>
                <td style={{ padding: '0 10px' }}><input value={regFilterTenMon} onChange={(e) => setRegFilterTenMon(e.target.value)} placeholder="..." style={{ width: '100%', border: 'none', borderBottom: '1px solid #bae6fd', fontSize: '0.8rem', outline: 'none' }} /></td>
                <td style={{ padding: '0 10px' }}><input value={regFilterNhom} onChange={(e) => setRegFilterNhom(e.target.value)} placeholder="..." style={{ width: '100%', border: 'none', borderBottom: '1px solid #bae6fd', fontSize: '0.8rem', outline: 'none', textAlign: 'center' }} /></td>
                <td style={{ padding: '0 10px' }}><input value={regFilterTo} onChange={(e) => setRegFilterTo(e.target.value)} placeholder="..." style={{ width: '100%', border: 'none', borderBottom: '1px solid #bae6fd', fontSize: '0.8rem', outline: 'none', textAlign: 'center' }} /></td>
                <td style={{ padding: '0 10px' }}><input value={regFilterSoTC} onChange={(e) => setRegFilterSoTC(e.target.value)} placeholder="..." style={{ width: '100%', border: 'none', borderBottom: '1px solid #bae6fd', fontSize: '0.8rem', outline: 'none', textAlign: 'center' }} /></td>
                <td style={{ padding: '0 10px' }}><input value={regFilterLop} onChange={(e) => setRegFilterLop(e.target.value)} placeholder="..." style={{ width: '100%', border: 'none', borderBottom: '1px solid #bae6fd', fontSize: '0.8rem', outline: 'none' }} /></td>
                <td style={{ padding: '0 10px' }}><input value={regFilterSoLuong} onChange={(e) => setRegFilterSoLuong(e.target.value)} placeholder="..." style={{ width: '100%', border: 'none', borderBottom: '1px solid #bae6fd', fontSize: '0.8rem', outline: 'none', textAlign: 'center' }} /></td>
                <td style={{ padding: '0 10px' }}><input value={regFilterConLai} onChange={(e) => setRegFilterConLai(e.target.value)} placeholder="..." style={{ width: '100%', border: 'none', borderBottom: '1px solid #bae6fd', fontSize: '0.8rem', outline: 'none', textAlign: 'center' }} /></td>
                <td style={tdStyle}></td>
              </tr>
            </thead>
            <tbody>
              {filteredAvailable.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>Không có lớp nào phù hợp</td></tr>
              ) : (
                filteredAvailable.map((c) => {
                  const remaining = (c.max_students || 0) - (c.current_students || 0);
                  const alreadyEnrolled = enrolledIds.has(c.class_id);
                  return (
                    <tr key={c.class_id} style={{ background: alreadyEnrolled ? '#f0fdf4' : '#fff' }}>
                      <td style={{...tdStyle, textAlign: 'center'}}>
                         {alreadyEnrolled ? (
                           <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓</span>
                         ) : (
                           <button
                             onClick={() => handleRegister(c)}
                             disabled={remaining <= 0}
                             style={{ background: remaining <= 0 ? '#cbd5e1' : '#0ea5e9', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: '0.75rem', cursor: remaining <= 0 ? 'not-allowed' : 'pointer' }}
                           >
                             Chọn
                           </button>
                         )}
                      </td>
                      <td style={{...tdStyle, color: '#0369a1'}}>{c.subject_id}</td>
                      <td style={tdStyle}>{c.subject_name}</td>
                      <td style={{...tdStyle, textAlign: 'center'}}>{formatGroup(c.group_number)}</td>
                      <td style={{...tdStyle, textAlign: 'center'}}>{c.sub_group_number || ''}</td>
                      <td style={{...tdStyle, textAlign: 'center'}}>{c.credits}</td>
                      <td style={tdStyle}>{getTargetClassesLabel(c) || '*'}</td>
                      <td style={{...tdStyle, textAlign: 'center'}}>{c.max_students}</td>
                      <td style={{...tdStyle, textAlign: 'center', color: remaining <= 0 ? '#ef4444' : '#0ea5e9', fontWeight: 600 }}>{remaining}</td>
                      <td style={{...tdStyle, fontSize: '0.7rem', color: '#94a3b8'}}>
                        {/* Fake TKB placeholder matching the image style */}
                        Thứ ..., tiết ...
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BẢNG 2: MÔN HỌC ĐÃ ĐĂNG KÝ */}
      <div style={{ border: '1px solid #38bdf8', borderRadius: 8, background: '#fff', overflow: 'hidden', boxShadow: '0 2px 4px rgba(14, 165, 233, 0.1)' }}>
        <div style={{ padding: '12px 16px', color: '#0369a1', fontWeight: 600, fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            Danh sách môn học đã đăng ký: <span style={{ color: '#ef4444', fontWeight: 700 }}>{uniqueSubjects.length} môn, {totalCredits} tín chỉ</span>
          </span>
          <button onClick={exportCsv} style={{ background: 'none', border: '1px solid #0ea5e9', color: '#0ea5e9', borderRadius: 4, padding: '4px 12px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            📄 Xuất phiếu đăng ký
          </button>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{...thStyle, width: 50, textAlign: 'center'}}>Xóa</th>
                <th style={{...thStyle}}>Mã MH</th>
                <th style={{...thStyle}}>Tên môn học</th>
                <th style={{...thStyle, textAlign: 'center'}}>Nhóm tổ</th>
                <th style={{...thStyle, textAlign: 'center'}}>Số TC</th>
                <th style={{...thStyle}}>Lớp</th>
                <th style={{...thStyle}}>Ngày đăng ký</th>
                <th style={{...thStyle}}>Trạng thái</th>
                <th style={{...thStyle, textAlign: 'center'}}>Thời khóa biểu</th>
              </tr>
            </thead>
            <tbody>
              {groupedEnrolledClasses.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>Bạn chưa đăng ký môn học nào.</td></tr>
              ) : (
                groupedEnrolledClasses.map((c) => (
                  <tr key={c.subject_id}>
                    <td style={{...tdStyle, textAlign: 'center'}}>
                      {(c.class_status || '').toLowerCase() === 'active' && (
                        <button onClick={() => handleUnregister(c)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
                      )}
                    </td>
                    <td style={{...tdStyle, color: '#0369a1'}}>{c.subject_id}</td>
                    <td style={tdStyle}>{c.subject_name}</td>
                    <td style={{...tdStyle, textAlign: 'center'}}>
                      {/* Hiển thị Nhóm và Tổ gộp chung */}
                      {formatGroup(c.group_number)}{c.sub_group_number ? ` - ${formatGroup(c.sub_group_number)}` : ''}
                    </td>
                    <td style={{...tdStyle, textAlign: 'center'}}>{c.credits}</td>
                    <td style={tdStyle}>{getTargetClassesLabel(c) || '*'}</td>
                    <td style={tdStyle}>{c.enrollment_date ? new Date(c.enrollment_date).toLocaleString('vi-VN') : '-'}</td>
                    <td style={tdStyle}>{c.class_status || c.status}</td>
                    <td style={{...tdStyle, textAlign: 'center'}}>
                      <button onClick={() => openSchedule(c.class_id, c.subject_name)} style={{ background: 'none', border: 'none', color: '#0ea5e9', cursor: 'pointer', fontSize: '1.2rem' }}>
                        <span className="lucide-list">☰</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}