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

  const handleRegister = async (classId) => {
    if (!mssv) return;
    try {
      await creditClassesApi.enrollStudent(classId, mssv);
      showToast?.(`Đăng ký học phần ${classId} thành công!`);
      await fetchData();
    } catch (err) {
      showToast?.(err.message || 'Đăng ký thất bại', 'danger');
    }
  };

  const handleUnregister = async (classId) => {
    if (!mssv) return;
    if (!window.confirm(`Hủy đăng ký lớp ${classId}?`)) return;
    try {
      await creditClassesApi.unenrollStudent(classId, mssv);
      showToast?.(`Đã hủy đăng ký lớp ${classId}`);
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

  const totalCredits = studentClasses.reduce((sum, c) => sum + (Number(c.credits) || 0), 0);
  const enrolledIds = new Set(studentClasses.map((c) => c.class_id));

  const filteredAvailable = availableClasses.filter((c) => {
    const remaining = (c.max_students || 0) - (c.current_students || 0);
    return (
      (!regFilterMaLop || c.class_id?.toLowerCase().includes(regFilterMaLop.toLowerCase()) || c.subject_id?.toLowerCase().includes(regFilterMaLop.toLowerCase())) &&
      (!regFilterTenMon || c.subject_name?.toLowerCase().includes(regFilterTenMon.toLowerCase())) &&
      (!regFilterNhom || String(c.class_group || '').toLowerCase().includes(regFilterNhom.toLowerCase())) &&
      (!regFilterSoTC || String(c.credits || '').includes(regFilterSoTC)) &&
      (!regFilterLop || (c.administrative_class_id || (c.target_classes || []).join(',')).toLowerCase().includes(regFilterLop.toLowerCase())) &&
      (!regFilterSoLuong || String(c.max_students || '').includes(regFilterSoLuong)) &&
      (!regFilterConLai || String(remaining).includes(regFilterConLai))
    );
  });

  const modalSessions = scheduleModal.open
    ? schedules.filter((s) => s.class_id === scheduleModal.classId)
    : [];

  const exportCsv = () => {
    const rows = [['Mã MH', 'Tên môn học', 'Nhóm', 'Số TC', 'Lớp', 'Ngày đăng ký', 'Trạng thái']];
    studentClasses.forEach((c) =>
      rows.push([
        c.subject_id || c.class_id,
        c.subject_name || 'N/A',
        c.class_group || '-',
        c.credits != null ? c.credits : '-',
        c.administrative_class_id || (c.target_classes || []).join(',') || '*',
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

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      {/* Schedule modal */}
      {scheduleModal.open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setScheduleModal({ open: false, classId: null, className: '' })}
        >
          <div
            style={{ background: '#fff', borderRadius: 12, width: 560, maxWidth: '95vw', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ background: 'linear-gradient(135deg,#0ea5e9,#0284c7)', borderRadius: '12px 12px 0 0', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>📅 Thời khóa biểu — {scheduleModal.className}</span>
              <button onClick={() => setScheduleModal({ open: false, classId: null, className: '' })} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: 14 }}>
              {modalSessions.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>Chưa có lịch học nào được phân công.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#f0f9ff' }}>
                      {['Buổi', 'Ngày', 'Giờ', 'Phòng', 'Tiết'].map((h, i) => (
                        <th key={i} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 600, color: '#0369a1', borderBottom: '1px solid #bae6fd' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {modalSessions.map((s, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f0f9ff' }}>
                        <td style={{ padding: '7px 10px', color: '#475569' }}>Buổi {i + 1}</td>
                        <td style={{ padding: '7px 10px', color: '#1e293b', whiteSpace: 'nowrap' }}>{s.session_date || (s.start_time ? String(s.start_time).substring(0, 10) : '-')}</td>
                        <td style={{ padding: '7px 10px', color: '#475569', whiteSpace: 'nowrap' }}>
                          {s.start_time ? String(s.start_time).substring(11, 16) : '-'} – {s.end_time ? String(s.end_time).substring(11, 16) : '-'}
                        </td>
                        <td style={{ padding: '7px 10px', color: '#0369a1', fontWeight: 600 }}>{s.room_id || s.room || '-'}</td>
                        <td style={{ padding: '7px 10px', color: '#475569' }}>{s.shift || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', borderRadius: '10px 10px 0 0', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '1.1rem' }}>🎓</span>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>ĐĂNG KÝ MÔN HỌC</span>
      </div>

      {/* Available classes */}
      <div style={{ border: '2px solid #0ea5e9', borderTop: 'none', borderRadius: '0 0 10px 10px', marginBottom: 18, background: '#fff', overflow: 'hidden' }}>
        <div style={{ padding: '8px 14px 4px', fontSize: '0.8rem', color: '#0369a1', fontWeight: 600 }}>
          Danh sách môn học mở cho đăng ký
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: '#f0f9ff' }}>
                {['Mã MH', 'Tên môn học', 'Nhóm', 'Số TC', 'Lớp biên chế', 'Số lượng', 'Còn lại', 'Thao tác'].map((h, i) => (
                  <th key={i} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#0369a1', borderBottom: '1px solid #bae6fd', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
              <tr style={{ background: '#fafeff' }}>
                <td style={{ padding: '3px 6px' }}>
                  <input value={regFilterMaLop} onChange={(e) => setRegFilterMaLop(e.target.value)} placeholder="..." style={{ width: 70, border: 'none', borderBottom: '1px solid #bae6fd', fontSize: '0.75rem', outline: 'none', background: 'transparent' }} />
                </td>
                <td style={{ padding: '3px 6px' }}>
                  <input value={regFilterTenMon} onChange={(e) => setRegFilterTenMon(e.target.value)} placeholder="..." style={{ width: '100%', border: 'none', borderBottom: '1px solid #bae6fd', fontSize: '0.75rem', outline: 'none', background: 'transparent' }} />
                </td>
                <td style={{ padding: '3px 6px' }}>
                  <input value={regFilterNhom} onChange={(e) => setRegFilterNhom(e.target.value)} placeholder="..." style={{ width: 50, border: 'none', borderBottom: '1px solid #bae6fd', fontSize: '0.75rem', outline: 'none', background: 'transparent' }} />
                </td>
                <td style={{ padding: '3px 6px' }}>
                  <input value={regFilterSoTC} onChange={(e) => setRegFilterSoTC(e.target.value)} placeholder="..." style={{ width: 40, border: 'none', borderBottom: '1px solid #bae6fd', fontSize: '0.75rem', outline: 'none', background: 'transparent' }} />
                </td>
                <td style={{ padding: '3px 6px' }}>
                  <input value={regFilterLop} onChange={(e) => setRegFilterLop(e.target.value)} placeholder="..." style={{ width: 70, border: 'none', borderBottom: '1px solid #bae6fd', fontSize: '0.75rem', outline: 'none', background: 'transparent' }} />
                </td>
                <td style={{ padding: '3px 6px' }}>
                  <input value={regFilterSoLuong} onChange={(e) => setRegFilterSoLuong(e.target.value)} placeholder="..." style={{ width: 55, border: 'none', borderBottom: '1px solid #bae6fd', fontSize: '0.75rem', outline: 'none', background: 'transparent' }} />
                </td>
                <td style={{ padding: '3px 6px' }}>
                  <input value={regFilterConLai} onChange={(e) => setRegFilterConLai(e.target.value)} placeholder="..." style={{ width: 50, border: 'none', borderBottom: '1px solid #bae6fd', fontSize: '0.75rem', outline: 'none', background: 'transparent' }} />
                </td>
                <td />
              </tr>
            </thead>
            <tbody>
              {filteredAvailable.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 18, color: '#94a3b8', fontStyle: 'italic' }}>Không tìm thấy dữ liệu</td>
                </tr>
              ) : (
                filteredAvailable.map((c, i) => {
                  const remaining = (c.max_students || 0) - (c.current_students || 0);
                  const alreadyEnrolled = enrolledIds.has(c.class_id);
                  const targetLabel = c.administrative_class_id || (Array.isArray(c.target_classes) ? c.target_classes.join(', ') : '*');
                  return (
                    <tr
                      key={c.class_id || i}
                      style={{ borderBottom: '1px solid #f0f9ff', background: alreadyEnrolled ? '#f0fdf4' : '' }}
                    >
                      <td style={{ padding: '7px 10px', color: '#0369a1', fontWeight: 600, whiteSpace: 'nowrap' }}>{c.subject_id || c.class_id}</td>
                      <td style={{ padding: '7px 10px', color: '#1e293b' }}>{c.subject_name || 'N/A'}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', color: '#475569' }}>{c.class_group || '-'}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 600, color: '#0369a1' }}>{c.credits != null ? c.credits : '-'}</td>
                      <td style={{ padding: '7px 10px', color: '#475569' }}>{targetLabel}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', color: '#475569' }}>{c.max_students ?? '-'}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', color: remaining <= 5 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>{remaining >= 0 ? remaining : '-'}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                        {alreadyEnrolled ? (
                          <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>✓ Đã đăng ký</span>
                        ) : (
                          <button
                            onClick={() => handleRegister(c.class_id)}
                            disabled={remaining <= 0}
                            style={{
                              background: remaining <= 0 ? '#94a3b8' : 'linear-gradient(135deg,#0ea5e9,#0284c7)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 5,
                              padding: '4px 12px',
                              fontSize: '0.74rem',
                              cursor: remaining <= 0 ? 'not-allowed' : 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            Đăng ký
                          </button>
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

      {/* Enrolled classes */}
      <div style={{ border: '2px solid #0ea5e9', borderRadius: 10, background: '#fff', overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #e0f0fa', fontSize: '0.82rem', color: '#0369a1', fontWeight: 600 }}>
          Danh sách môn học đã đăng ký:&nbsp;
          <span style={{ color: '#0284c7', fontWeight: 700 }}>{studentClasses.length} môn, {totalCredits} tín chỉ</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: '#f0f9ff' }}>
                {['Xóa', 'Mã MH', 'Tên môn học', 'Nhóm', 'Số TC', 'Lớp', 'Ngày đăng ký', 'Trạng thái', 'TKB'].map((h, i) => (
                  <th key={i} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#0369a1', borderBottom: '1px solid #bae6fd', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {studentClasses.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 18, color: '#94a3b8', fontStyle: 'italic' }}>Bạn chưa đăng ký môn học nào.</td>
                </tr>
              ) : (
                studentClasses.map((c, i) => (
                  <tr key={c.class_id || i} style={{ borderBottom: '1px solid #f0f9ff' }}>
                    <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                      {(c.class_status || '').toLowerCase() === 'active' && (
                        <button
                          onClick={() => handleUnregister(c.class_id)}
                          title="Hủy đăng ký"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1rem' }}
                        >
                          ✕
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '7px 10px', color: '#0369a1', fontWeight: 600 }}>{c.subject_id || c.class_id}</td>
                    <td style={{ padding: '7px 10px', color: '#1e293b' }}>{c.subject_name || 'N/A'}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'center', color: '#475569' }}>{c.class_group || '-'}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 600, color: '#0369a1' }}>{c.credits != null ? c.credits : '-'}</td>
                    <td style={{ padding: '7px 10px', color: '#475569' }}>{c.administrative_class_id || (c.target_classes || []).join(',') || '*'}</td>
                    <td style={{ padding: '7px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {c.enrollment_date ? new Date(c.enrollment_date).toLocaleString('vi-VN') : '-'}
                    </td>
                    <td style={{ padding: '7px 10px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 10,
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          background: (c.class_status || '').toLowerCase() === 'active' ? '#dcfce7' : '#fee2e2',
                          color: (c.class_status || '').toLowerCase() === 'active' ? '#16a34a' : '#dc2626',
                        }}
                      >
                        {c.class_status || c.status || 'Enrolled'}
                      </span>
                    </td>
                    <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                      <button
                        title="Xem thời khóa biểu"
                        onClick={() => openSchedule(c.class_id, c.subject_name || c.class_id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0ea5e9', fontSize: '1rem' }}
                      >
                        ☰
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 14px', borderTop: '1px solid #e0f0fa', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={exportCsv}
            style={{ background: 'linear-gradient(135deg,#0ea5e9,#0284c7)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
          >
            📄 Xuất phiếu đăng ký
          </button>
        </div>
      </div>
    </div>
  );
}