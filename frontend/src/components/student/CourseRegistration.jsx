import React, { useState, useEffect } from 'react';
import { creditClassesApi, schedulesApi, apiFetch } from '../../api';

export default function CourseRegistration({ user, showToast }) {
  const [availableClasses, setAvailableClasses] = useState([]);
  const [studentClasses, setStudentClasses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dữ liệu tham chiếu
  const [studentInfo, setStudentInfo] = useState(null);
  const [adminClasses, setAdminClasses] = useState([]);
  const [majors, setMajors] = useState([]);
  const [faculties, setFaculties] = useState([]);

  // Filters
  const [filterMode, setFilterMode] = useState('for_my_class');
  const [regFilterMaLop, setRegFilterMaLop] = useState('');
  const [regFilterTenMon, setRegFilterTenMon] = useState('');
  const [regFilterNhom, setRegFilterNhom] = useState('');
  const [regFilterSoTC, setRegFilterSoTC] = useState('');
  const [regFilterLop, setRegFilterLop] = useState('');
  const [regFilterNganh, setRegFilterNganh] = useState('');
  const [regFilterKhoa, setRegFilterKhoa] = useState('');
  const [regFilterSoLuong, setRegFilterSoLuong] = useState('');
  const [regFilterConLai, setRegFilterConLai] = useState('');
  const [regFilterTo, setRegFilterTo] = useState('');

  const [scheduleModal, setScheduleModal] = useState({ open: false, clsInfo: null });
  const [regInfo, setRegInfo] = useState(null);

  const mssv = user?.mssv || user?.username?.toUpperCase();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [openRes, enrolledRes, studentRes, acRes, majRes, facRes, regRes] = await Promise.all([
        creditClassesApi.listOpenCreditClasses(),
        mssv ? creditClassesApi.getStudentCreditClasses(mssv) : Promise.resolve({ classes: [] }),
        mssv ? apiFetch(`/api/admin/students/${mssv}`).catch(() => null) : Promise.resolve(null),
        apiFetch('/api/administrative-classes').catch(() => []),
        apiFetch('/api/majors/').catch(() => []),
        apiFetch('/api/faculties/').catch(() => []),
        apiFetch('/api/registration/info').catch(() => null)
      ]);
      setAvailableClasses(openRes.data || openRes.classes || []);
      setStudentClasses(enrolledRes.data || enrolledRes.classes || []);
      setStudentInfo(studentRes);
      setRegInfo(regRes);

      const acList = acRes.data || acRes.items || acRes || [];
      setAdminClasses(Array.isArray(acList) ? acList : []);

      const majList = majRes.data || majRes.items || majRes || [];
      setMajors(Array.isArray(majList) ? majList : []);

      const facList = facRes.data || facRes.items || facRes || [];
      setFaculties(Array.isArray(facList) ? facList : []);
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

  const openSchedule = (clsInfo) => {
    setScheduleModal({ open: true, clsInfo });
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

  const formatSchedules = (cls, typeStr) => {
    if (!cls) return null;
    if (!cls.schedules || cls.schedules.length === 0) {
      return <div style={{ marginBottom: 4 }}><b>{typeStr}:</b> <span style={{ color: '#ef4444' }}>Chưa cập nhật</span></div>;
    }
    return cls.schedules.map((s, i) => (
      <div key={i} style={{ marginBottom: 4 }}>
        <b>{typeStr}:</b> Thứ {s.day_of_week}, tiết {s.start_shift}-{s.end_shift} (P.{s.room_id})
        {cls.start_date && cls.end_date && (
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>
            ({cls.start_date} - {cls.end_date})
          </div>
        )}
      </div>
    ));
  };

  const formatLecturers = (cls, typeStr) => {
    if (!cls) return null;
    return (
      <div style={{ marginBottom: 4 }}>
        <b>{typeStr}:</b> {cls.lecturer_name || <span style={{ color: '#ef4444' }}>Chưa phân công</span>}
      </div>
    );
  };
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

  const getTargetClassesArray = (c) => {
    if (c.administrative_class_id) return [c.administrative_class_id];
    if (Array.isArray(c.target_classes) && c.target_classes.length > 0) return c.target_classes;
    if (c.class_type === 'Practice') {
      const parentId = c.parent_class_id || c.class_id.replace(/_T\d+$/, '');
      const parent = availableClasses.find(x => x.class_id === parentId) || studentClasses.find(x => x.class_id === parentId);
      if (parent && Array.isArray(parent.target_classes) && parent.target_classes.length > 0) {
        return parent.target_classes;
      }
    }
    return [];
  };

  const filteredAvailable = selectableAvailableClasses.filter((c) => {
    const remaining = (c.max_students || 0) - (c.current_students || 0);
    const targetClassesArr = getTargetClassesArray(c);

    if (filterMode === 'for_my_class') {
      const myClass = studentInfo?.administrative_class || studentInfo?.lop_base;
      if (myClass && targetClassesArr.length > 0) {
        if (!targetClassesArr.includes(myClass)) return false;
      }
    }

    let creditClassMajors = [];
    let creditClassFaculties = [];
    targetClassesArr.forEach(cId => {
      const foundAc = adminClasses.find(a => (a.class_id || a.name) === cId);
      let mId = foundAc?.major_id;
      if (mId) {
        const matchedMajor = majors.find(m => m.major_id === mId);
        creditClassMajors.push(mId);
        if (matchedMajor?.major_name) creditClassMajors.push(matchedMajor.major_name);
        
        const fId = foundAc?.faculty_id || matchedMajor?.faculty_id;
        if (fId) {
          const matchedFac = faculties.find(f => f.faculty_id === fId);
          creditClassFaculties.push(fId);
          if (matchedFac?.faculty_name) creditClassFaculties.push(matchedFac.faculty_name);
        }
      }
    });
    const majorStr = creditClassMajors.join(' ').toLowerCase();
    const facStr = creditClassFaculties.join(' ').toLowerCase();

    return (
      (!regFilterMaLop || c.class_id?.toLowerCase().includes(regFilterMaLop.toLowerCase()) || c.subject_id?.toLowerCase().includes(regFilterMaLop.toLowerCase())) &&
      (!regFilterTenMon || c.subject_name?.toLowerCase().includes(regFilterTenMon.toLowerCase())) &&
      (!regFilterNhom || String(c.group_number || '').includes(regFilterNhom)) &&
      (!regFilterTo || String(c.sub_group_number || '').includes(regFilterTo)) &&
      (!regFilterSoTC || String(c.credits || '').includes(regFilterSoTC)) &&
      (!regFilterLop || getTargetClassesLabel(c).toLowerCase().includes(regFilterLop.toLowerCase())) &&
      (!regFilterNganh || majorStr.includes(regFilterNganh.toLowerCase())) &&
      (!regFilterKhoa || facStr.includes(regFilterKhoa.toLowerCase())) &&
      (!regFilterSoLuong || String(c.max_students || '').includes(regFilterSoLuong)) &&
      (!regFilterConLai || String(remaining).includes(regFilterConLai))
    );
  });

  // GỘP DANH SÁCH ĐÃ ĐĂNG KÝ (Gom LT và TH vào 1 dòng)
  const groupedEnrolledClasses = Object.values(
    studentClasses.reduce((acc, c) => {
      if (!acc[c.subject_id]) {
        acc[c.subject_id] = { 
          ...c, 
          theory_class: c.class_type !== 'Practice' ? c : null, 
          practice_class: c.class_type === 'Practice' ? c : null 
        };
      } else {
        if (c.class_type === 'Practice') {
          acc[c.subject_id].sub_group_number = c.sub_group_number;
          acc[c.subject_id].practice_class = c;
        } else if (c.class_type === 'Theory' || c.class_type === 'Combined') {
          acc[c.subject_id].group_number = c.group_number;
          acc[c.subject_id].theory_class = c;
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
      
      {/* Datalists for autocompletion */}
      <datalist id="majorList">
        {majors.map(m => <option key={m.major_id} value={m.major_name} />)}
      </datalist>
      <datalist id="adminClassList">
        {adminClasses.map(a => <option key={a.class_id} value={a.class_id}>{a.name}</option>)}
      </datalist>
      <datalist id="subjectList">
        {Array.from(new Set(availableClasses.map(c => c.subject_name))).filter(Boolean).map(sName => (
          <option key={sName} value={sName} />
        ))}
      </datalist>

      {/* Schedule Modal */}
      {scheduleModal.open && scheduleModal.clsInfo && (
         <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setScheduleModal({ open: false, clsInfo: null })}>
          <div style={{ background: '#fff', borderRadius: 12, width: 560, maxWidth: '95vw', maxHeight: '80vh', overflow: 'auto', padding: 20 }} onClick={e => e.stopPropagation()}>
             <h3 style={{ color: '#0369a1', marginTop: 0 }}>Chi tiết lớp: {scheduleModal.clsInfo.subject_name}</h3>
             
             <div style={{ padding: 12, borderBottom: '1px solid #e2e8f0', marginBottom: 12 }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#475569' }}>Lý thuyết</h4>
                {scheduleModal.clsInfo.theory_class ? (
                   <>
                     {formatLecturers(scheduleModal.clsInfo.theory_class, 'Giảng viên')}
                     {formatSchedules(scheduleModal.clsInfo.theory_class, 'Lịch')}
                   </>
                ) : (
                   <span style={{ color: '#94a3b8' }}>Không có</span>
                )}
             </div>

             {scheduleModal.clsInfo.practice_class && (
                 <div style={{ padding: 12 }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#475569' }}>Thực hành</h4>
                    {formatLecturers(scheduleModal.clsInfo.practice_class, 'Giảng viên')}
                    {formatSchedules(scheduleModal.clsInfo.practice_class, 'Lịch')}
                 </div>
             )}
             
             <div style={{ textAlign: 'right', marginTop: 20 }}>
               <button onClick={() => setScheduleModal({ open: false, clsInfo: null })} style={{ background: '#e2e8f0', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer' }}>Đóng</button>
             </div>
          </div>
         </div>
      )}

      {/* TỰA ĐỀ CHUẨN PTIT (dữ liệu thật từ hệ thống) */}
      <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '12px 20px', marginBottom: 20, color: '#0369a1', fontWeight: 600, fontSize: '0.9rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        ⚙️ ĐĂNG KÝ MÔN HỌC HỌC KỲ {regInfo?.semester ?? '?'} - NĂM HỌC {regInfo?.academic_year ?? '—'}
        {' '}· Mở {regInfo?.open_date ? regInfo.open_date : '—'} đến {regInfo?.close_date ? regInfo.close_date : '—'}
        {' '}
        <span style={{ color: regInfo?.is_open ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
          {regInfo?.is_open ? '● ĐANG MỞ' : '● ĐÃ ĐÓNG'}
        </span>
      </div>

      <div style={{ marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <select 
          value={filterMode} 
          onChange={(e) => setFilterMode(e.target.value)}
          style={{ width: '100%', maxWidth: 400, padding: '8px 12px', borderRadius: 4, border: '1px solid #cbd5e1', color: '#475569', outline: 'none', cursor: 'pointer' }}
        >
          <option value="for_my_class">Lớp tín chỉ mở cho lớp biên chế của tôi</option>
          <option value="for_major">Lớp tín chỉ mở cho ngành</option>
          <option value="for_class">Lớp tín chỉ mở cho lớp biên chế khác</option>
          <option value="all">Tất cả các lớp tín chỉ</option>
        </select>
        
        {filterMode === 'all' && (
          <div style={{ display: 'flex', gap: 12, flex: 1, flexWrap: 'wrap' }}>
            <input 
              value={regFilterTenMon} 
              onChange={(e) => setRegFilterTenMon(e.target.value)} 
              placeholder="Lọc môn học..." 
              list="subjectList"
              style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #cbd5e1', outline: 'none', minWidth: 150, fontSize: '0.9rem' }} 
            />
            <input 
              value={regFilterNganh} 
              onChange={(e) => setRegFilterNganh(e.target.value)} 
              placeholder="Lọc ngành..." 
              list="majorList"
              style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #cbd5e1', outline: 'none', minWidth: 150, fontSize: '0.9rem' }} 
            />
            <input 
              value={regFilterLop} 
              onChange={(e) => setRegFilterLop(e.target.value)} 
              placeholder="Lọc lớp biên chế..." 
              list="adminClassList"
              style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #cbd5e1', outline: 'none', minWidth: 150, fontSize: '0.9rem' }} 
            />
          </div>
        )}

        {filterMode === 'for_major' && (
          <div style={{ display: 'flex', gap: 12, flex: 1, flexWrap: 'wrap' }}>
            <input 
              value={regFilterNganh} 
              onChange={(e) => setRegFilterNganh(e.target.value)} 
              placeholder="Nhập tên hoặc mã ngành..." 
              list="majorList"
              style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #cbd5e1', outline: 'none', minWidth: 200, fontSize: '0.9rem' }} 
            />
          </div>
        )}

        {filterMode === 'for_class' && (
          <div style={{ display: 'flex', gap: 12, flex: 1, flexWrap: 'wrap' }}>
            <input 
              value={regFilterLop} 
              onChange={(e) => setRegFilterLop(e.target.value)} 
              placeholder="Nhập mã lớp biên chế..." 
              list="adminClassList"
              style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #cbd5e1', outline: 'none', minWidth: 200, fontSize: '0.9rem' }} 
            />
          </div>
        )}
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
                <th style={{...thStyle}}>Giảng viên</th>
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
                <td style={tdStyle}></td>
              </tr>
            </thead>
            <tbody>
              {filteredAvailable.length === 0 ? (
                <tr><td colSpan={12} style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>Không có lớp nào phù hợp</td></tr>
              ) : (
                filteredAvailable.map((c) => {
                  const remaining = (c.max_students || 0) - (c.current_students || 0);
                  const alreadyEnrolled = enrolledIds.has(c.class_id);
                  
                  const targetClassesArr = getTargetClassesArray(c);
                  let creditClassMajors = [];
                  let creditClassFaculties = [];
                  targetClassesArr.forEach(cId => {
                    const foundAc = adminClasses.find(a => (a.class_id || a.name) === cId);
                    let mId = foundAc?.major_id;
                    if (mId) {
                      const matchedMajor = majors.find(m => m.major_id === mId);
                      if (mId && !creditClassMajors.includes(mId)) creditClassMajors.push(mId);
                      const fId = foundAc?.faculty_id || matchedMajor?.faculty_id;
                      if (fId && !creditClassFaculties.includes(fId)) creditClassFaculties.push(fId);
                    }
                  });

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
                      <td style={{...tdStyle, fontSize: '0.75rem'}}>
                        {c.class_type === 'Practice' ? (
                          <>
                            {formatLecturers(availableClasses.find(x => x.class_id === c.parent_class_id), 'LT')}
                            {formatLecturers(c, 'TH')}
                          </>
                        ) : (
                          formatLecturers(c, 'LT')
                        )}
                      </td>
                      <td style={{...tdStyle, fontSize: '0.75rem', color: '#475569'}}>
                        {c.class_type === 'Practice' ? (
                          <>
                            {formatSchedules(availableClasses.find(x => x.class_id === c.parent_class_id), 'LT')}
                            {formatSchedules(c, 'TH')}
                          </>
                        ) : (
                          formatSchedules(c, 'LT')
                        )}
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
                <th style={{...thStyle, textAlign: 'center'}}>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {groupedEnrolledClasses.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>Bạn chưa đăng ký môn học nào.</td></tr>
              ) : (
                groupedEnrolledClasses.map((c) => (
                  <tr key={c.subject_id}>
                    <td style={{...tdStyle, textAlign: 'center'}}>
                      {(c.class_status || c.status || '').toLowerCase() === 'active' && (
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
                      <button onClick={() => openSchedule(c)} style={{ background: 'none', border: 'none', color: '#0ea5e9', cursor: 'pointer', fontSize: '1.2rem' }}>
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