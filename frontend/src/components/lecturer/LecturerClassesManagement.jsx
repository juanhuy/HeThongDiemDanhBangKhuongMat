import React, { useEffect, useState } from 'react';
import { creditClassesApi, schedulesApi } from '../../api';
import { API_BASE, authFetch } from '../../api/client';

const dayLabels = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

const getVietnameseDay = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return dayLabels[date.getDay()];
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
};

export default function LecturerClassesManagement({ user, showToast }) {
  const [classes, setClasses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState('students');
  const [students, setStudents] = useState([]);
  const [attendanceReport, setAttendanceReport] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const lecturerId = user?.lecturer_id || user?.username;

  useEffect(() => {
    if (!lecturerId) return;

    const loadSemesters = async () => {
      try {
        const res = await creditClassesApi.listSemesters();
        const items = Array.isArray(res?.data) ? res.data : [];
        setSemesters(items);
        if (!selectedSemester && items.length > 0) {
          setSelectedSemester(items[0].semester_id);
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadSemesters();
  }, [lecturerId]);

  useEffect(() => {
    if (!lecturerId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [classesRes, schedulesRes] = await Promise.all([
          creditClassesApi.listCreditClasses(
            lecturerId ? { lecturer_id: lecturerId, semester_id: selectedSemester || undefined } : {}
          ),
          schedulesApi.listSchedules(lecturerId ? { lecturer_id: lecturerId } : {}),
        ]);

        const classList = Array.isArray(classesRes?.data) ? classesRes.data : classesRes?.classes || [];
        const scheduleList = Array.isArray(schedulesRes?.schedules) ? schedulesRes.schedules : [];

        const scheduleMap = new Map();
        scheduleList.forEach((item) => {
          if (!scheduleMap.has(item.class_id)) {
            scheduleMap.set(item.class_id, []);
          }
          scheduleMap.get(item.class_id).push(item);
        });

        const merged = classList.map((item) => ({
          ...item,
          schedules: scheduleMap.get(item.class_id) || [],
        }));

        setClasses(merged);
      } catch (err) {
        showToast?.(err.message || 'Lỗi tải danh sách lớp', 'danger');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [lecturerId, selectedSemester]);

  useEffect(() => {
    if (!selectedClass?.classData?.class_id) return;
    setActiveDetailTab('students');
  }, [selectedClass?.classData?.class_id]);

  useEffect(() => {
    if (!selectedClass?.classData?.class_id) return;

    const loadDetailData = async () => {
      setDetailLoading(true);
      try {
        if (activeDetailTab === 'students') {
          const res = await authFetch(`${API_BASE}/api/credit-classes/${encodeURIComponent(selectedClass.classData.class_id)}/students`);
          const data = await res.json();
          setStudents(Array.isArray(data?.data) ? data.data : []);
        }

        if (activeDetailTab === 'stats') {
          const res = await authFetch(`${API_BASE}/api/credit-classes/${encodeURIComponent(selectedClass.classData.class_id)}/attendance/report`);
          const data = await res.json();
          setAttendanceReport(Array.isArray(data?.report) ? data.report : []);
        }
      } catch (err) {
        showToast?.(err.message || 'Lỗi tải dữ liệu chi tiết lớp', 'danger');
      } finally {
        setDetailLoading(false);
      }
    };

    loadDetailData();
  }, [selectedClass?.classData?.class_id, activeDetailTab]);

  const selectedSemesterLabel = semesters.find((item) => item.semester_id === selectedSemester)?.semester || 'Tất cả';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#106fa6' }}>Quản lý lớp giảng dạy</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Danh sách các lớp tín chỉ do bạn phụ trách.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label htmlFor="semester-filter" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
            Học kỳ:
          </label>
          <select
            id="semester-filter"
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 10px', minWidth: 180, background: '#fff' }}
          >
            <option value="">Tất cả học kỳ</option>
            {semesters.map((item) => (
              <option key={item.semester_id} value={item.semester_id}>
                {item.semester} · {item.academic_year}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, overflow: 'hidden' }}>
        {!selectedClass ? (
          <>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2edf5', color: '#106fa6', fontWeight: 600 }}>
              Đang xem: {selectedSemesterLabel}
            </div>

            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Mã lớp', 'Môn học', 'Nhóm', 'Phòng', 'Thứ', 'Ca', 'Số SV', 'Trạng thái', 'Thao tác'].map((header) => (
                        <th key={header} style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {classes.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
                          Không có lớp tín chỉ nào phù hợp.
                        </td>
                      </tr>
                    ) : (
                      classes.map((item) => {
                        const firstSchedule = item.schedules?.[0];
                        const room = firstSchedule?.room_id || '—';
                        const day = firstSchedule ? `${getVietnameseDay(firstSchedule.session_date || firstSchedule.start_time)} ${formatDate(firstSchedule.session_date || firstSchedule.start_time)}` : '—';
                        const shift = firstSchedule?.shift || '—';

                        return (
                          <tr key={item.class_id} style={{ borderBottom: '1px solid #e2edf5' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0369a1' }}>{item.class_id}</td>
                            <td style={{ padding: '10px 12px' }}>{item.subject_name || item.subject_id || '—'}</td>
                            <td style={{ padding: '10px 12px' }}>{item.class_group || item.group_number || '—'}</td>
                            <td style={{ padding: '10px 12px' }}>{room}</td>
                            <td style={{ padding: '10px 12px' }}>{day}</td>
                            <td style={{ padding: '10px 12px' }}>{shift}</td>
                            <td style={{ padding: '10px 12px' }}>{`${item.current_students ?? 0}/${item.max_students ?? 0}`}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  background: item.status === 'Active' ? '#dcfce7' : '#f1f5f9',
                                  color: item.status === 'Active' ? '#16a34a' : '#64748b',
                                }}
                              >
                                {item.status || '—'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <button
                                onClick={() => setSelectedClass({ classData: item, schedules: item.schedules || [] })}
                                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #bae6fd', background: '#e0f2fe', color: '#0369a1', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
                              >
                                Chi tiết
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 8, flexWrap: 'wrap' }}>
              <div>
                <button
                  onClick={() => setSelectedClass(null)}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', fontWeight: 600 }}
                >
                  ← Quay lại quản lý lớp
                </button>
              </div>
              <h3 style={{ margin: 0, color: '#106fa6' }}>Chi tiết lớp {selectedClass.classData.class_id}</h3>
            </div>

            <div style={{ display: 'grid', gap: 10, fontSize: '0.9rem', color: '#334155', marginBottom: 14 }}>
              <div><strong>Môn học:</strong> {selectedClass.classData.subject_name || selectedClass.classData.subject_id || '—'}</div>
              <div><strong>Nhóm:</strong> {selectedClass.classData.class_group || selectedClass.classData.group_number || '—'}</div>
              <div><strong>Học kỳ:</strong> {selectedClass.classData.semester_id || '—'}</div>
              <div><strong>Trạng thái:</strong> {selectedClass.classData.status || '—'}</div>
              <div><strong>Số sinh viên:</strong> {`${selectedClass.classData.current_students ?? 0}/${selectedClass.classData.max_students ?? 0}`}</div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {[
                { key: 'students', label: 'Danh sách sinh viên' },
                { key: 'stats', label: 'Thống kê chuyên cần' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveDetailTab(tab.key)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: activeDetailTab === tab.key ? '1px solid #106fa6' : '1px solid #cbd5e1',
                    background: activeDetailTab === tab.key ? '#e0f2fe' : '#fff',
                    color: activeDetailTab === tab.key ? '#0c4a6e' : '#475569',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {detailLoading ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</div>
            ) : activeDetailTab === 'students' ? (
              <div>
                {students.length === 0 ? (
                  <div style={{ color: '#94a3b8' }}>Chưa có sinh viên trong lớp.</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={{ padding: '8px 10px', textAlign: 'left', color: '#475569' }}>MSSV</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', color: '#475569' }}>Họ tên</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', color: '#475569' }}>Lớp hành chính</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student) => (
                          <tr key={student.student_id} style={{ borderBottom: '1px solid #e2edf5' }}>
                            <td style={{ padding: '8px 10px' }}>{student.student_id}</td>
                            <td style={{ padding: '8px 10px' }}>{student.full_name || '—'}</td>
                            <td style={{ padding: '8px 10px' }}>{student.administrative_class || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {attendanceReport.length === 0 ? (
                  <div style={{ color: '#94a3b8' }}>Chưa có dữ liệu thống kê chuyên cần.</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={{ padding: '8px 10px', textAlign: 'left', color: '#475569' }}>MSSV</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', color: '#475569' }}>Họ tên</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', color: '#475569' }}>Muộn</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', color: '#475569' }}>Vắng</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', color: '#475569' }}>Có phép</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', color: '#475569' }}>Điểm</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', color: '#475569' }}>Tỉ lệ vắng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceReport.map((item) => (
                          <tr key={item.mssv} style={{ borderBottom: '1px solid #e2edf5' }}>
                            <td style={{ padding: '8px 10px' }}>{item.mssv}</td>
                            <td style={{ padding: '8px 10px' }}>{item.ho_ten || '—'}</td>
                            <td style={{ padding: '8px 10px' }}>{item.di_muon ?? 0}</td>
                            <td style={{ padding: '8px 10px' }}>{item.vang_kp ?? 0}</td>
                            <td style={{ padding: '8px 10px' }}>{item.co_phep ?? 0}</td>
                            <td style={{ padding: '8px 10px' }}>{item.score ?? 0}</td>
                            <td style={{ padding: '8px 10px' }}>{item.ty_le_vang ?? 0}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
