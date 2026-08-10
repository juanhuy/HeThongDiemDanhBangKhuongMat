import React, { useState, useEffect } from 'react';
import { schedulesApi, creditClassesApi, roomsApi } from '../../api';
import FilterSection from './CreditClassesManagement/FilterSection';
import Pagination from '../common/Pagination';

const SHIFT_TIMES = {
  1: { label: 'Ca 1 (06h50 - 12h00)', start: '06:50', end: '12:00' },
  2: { label: 'Ca 2 (09h30 - 12h00)', start: '09:30', end: '12:00' },
  3: { label: 'Ca 3 (12h45 - 15h15)', start: '12:45', end: '15:15' },
  4: { label: 'Ca 4 (15h25 - 17h55)', start: '15:25', end: '17:55' },
  5: { label: 'Ca 5 (18h05 - 20h35, học kỳ dự thính)', start: '18:05', end: '20:35' },
};

export default function ScheduleAdmin({ showToast }) {
  const [schedules, setSchedules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ subject_id: '', semester_id: '', room_id: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const [form, setForm] = useState({
    semester_id: '',
    ma_lop_tc: '',
    ngay_hoc: new Date().toISOString().substring(0, 10),
    phong_hoc: '',
    ca_hoc: 1,
  });

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [schRes, clsRes, roomRes, semRes] = await Promise.all([
        schedulesApi.listSchedules(),
        creditClassesApi.listCreditClasses(),
        roomsApi.listRooms(),
        creditClassesApi.listSemesters(),
      ]);
      setSchedules(schRes.schedules || []);
      setClasses(clsRes.data || clsRes.classes || []);
      const roomList = roomRes.items || roomRes.data || roomRes || [];
      setRooms(Array.isArray(roomList) ? roomList : []);
      setSemesters(Array.isArray(semRes?.data) ? semRes.data : (Array.isArray(semRes) ? semRes : []));
    } catch (err) {
      showToast?.(err.message || 'Lỗi tải lịch học', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.semester_id) {
      showToast?.('Vui lòng chọn học kỳ trước khi thêm buổi học', 'danger');
      return;
    }
    if (!form.ma_lop_tc || !form.phong_hoc) {
      showToast?.('Chọn lớp và phòng học', 'danger');
      return;
    }
    const selectedSemester = semesters.find((sem) => sem.semester_id === form.semester_id);
    const selectedClass = classes.find((item) => item.class_id === form.ma_lop_tc);
    if (selectedClass && selectedClass.semester_id && selectedClass.semester_id !== form.semester_id) {
      showToast?.('Lớp tín chỉ không thuộc học kỳ đã chọn', 'danger');
      return;
    }
    if (selectedSemester?.start_date && selectedSemester?.end_date) {
      const sessionDate = new Date(form.ngay_hoc);
      const semesterStart = new Date(selectedSemester.start_date);
      const semesterEnd = new Date(selectedSemester.end_date);
      if (Number.isNaN(sessionDate.getTime()) || sessionDate < semesterStart || sessionDate > semesterEnd) {
        showToast?.(`Ngày học phải nằm trong khoảng học kỳ ${selectedSemester.start_date} → ${selectedSemester.end_date}`, 'danger');
        return;
      }
    }
    try {
      await schedulesApi.addSchedule({
        ma_lop_tc: form.ma_lop_tc,
        ngay_hoc: form.ngay_hoc,
        phong_hoc: form.phong_hoc,
        gio_bat_dau: SHIFT_TIMES[form.ca_hoc].start,
        ca_hoc: form.ca_hoc,
      });
      showToast?.('Thêm lịch học thành công');
      fetchAll();
    } catch (err) {
      showToast?.(err.message || 'Thêm lịch thất bại', 'danger');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa buổi học này?')) return;
    try {
      await schedulesApi.deleteSchedule(id);
      showToast?.('Đã xóa buổi học');
      fetchAll();
    } catch (err) {
      showToast?.(err.message || 'Xóa thất bại', 'danger');
    }
  };

  const scheduleRows = schedules.map((schedule) => {
    const creditClass = classes.find((item) => item.class_id === schedule.class_id);
    return { ...schedule, semester_id: creditClass?.semester_id, subject_id: creditClass?.subject_id };
  });

  const filteredSchedules = scheduleRows.filter((schedule) => (
    (!filters.subject_id || schedule.subject_id === filters.subject_id) &&
    (!filters.semester_id || schedule.semester_id === filters.semester_id) &&
    (!filters.room_id || schedule.room_id === filters.room_id)
  ));

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, schedules]);

  const paginatedSchedules = filteredSchedules.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const scheduleMetaData = {
    semesters,
    subjects: Array.from(new Map(classes.filter((item) => item.subject_id).map((item) => [item.subject_id, item])).values()),
  };

  const inputStyle = {
    padding: '8px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: '0.9rem',
    width: '100%',
    boxSizing: 'border-box',
  };

  const formatScheduleTime = (value) => {
    if (!value) return '—';
    const text = String(value);
    if (/^\d{2}:\d{2}$/.test(text)) return text;
    const timeMatch = text.match(/(?:T|\s)(\d{2}:\d{2})/);
    return timeMatch?.[1] || text.substring(0, 5);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Form thêm */}
      <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, padding: 18 }}>
         <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#106fa6', margin: 0 }}>Thêm lịch học</h2>
        <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Học kỳ *</label>
            <select required value={form.semester_id} onChange={(e) => setForm({ ...form, semester_id: e.target.value, ma_lop_tc: '' })} style={inputStyle}>
              <option value="">-- Chọn học kỳ --</option>
              {semesters.map((sem) => (
                <option key={sem.semester_id} value={sem.semester_id}>
                  {sem.semester ? `Học kỳ ${sem.semester}` : sem.semester_id} {sem.academic_year ? `(${sem.academic_year})` : ''}
                </option>
              ))}
            </select>
            {form.semester_id && semesters.find((sem) => sem.semester_id === form.semester_id)?.start_date && semesters.find((sem) => sem.semester_id === form.semester_id)?.end_date && (
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                Khoảng: {semesters.find((sem) => sem.semester_id === form.semester_id).start_date} → {semesters.find((sem) => sem.semester_id === form.semester_id).end_date}
              </div>
            )}
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Lớp tín chỉ *</label>
            <select required value={form.ma_lop_tc} onChange={(e) => setForm({ ...form, ma_lop_tc: e.target.value })} style={inputStyle}>
              <option value="">-- Chọn lớp --</option>
              {classes
                .filter((c) => !form.semester_id || c.semester_id === form.semester_id)
                .map((c) => (
                  <option key={c.class_id} value={c.class_id}>{c.class_id}</option>
                ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Ngày học *</label>
            <input type="date" required value={form.ngay_hoc} onChange={(e) => setForm({ ...form, ngay_hoc: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Phòng *</label>
            <select required value={form.phong_hoc} onChange={(e) => setForm({ ...form, phong_hoc: e.target.value })} style={inputStyle}>
              <option value="">-- Chọn phòng --</option>
              {rooms.map((r) => (
                <option key={r.room_id} value={r.room_id}>{r.room_id} {r.room_name ? `– ${r.room_name}` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Ca</label>
            <select value={form.ca_hoc} onChange={(e) => setForm({ ...form, ca_hoc: parseInt(e.target.value) })} style={inputStyle}>
              {Object.entries(SHIFT_TIMES).map(([value, shift]) => (
                <option key={value} value={value}>{shift.label}</option>
              ))}
            </select>
          </div>
          <button type="submit" style={{ padding: '9px 16px', background: '#106fa6', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', height: 40 }}>
            Thêm buổi
          </button>
        </form>
      </div>

      {/* Danh sách */}
      <div style={{ background: '#fff', border: '1px solid #d0e0eb', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: 12 }}>
          <FilterSection
            variant="schedule"
            filters={filters}
            onFilterChange={(name, value) => setFilters((previous) => ({ ...previous, [name]: value }))}
            onResetFilters={() => setFilters({ subject_id: '', semester_id: '', room_id: '' })}
            metaData={scheduleMetaData}
            rooms={rooms}
          />
        </div>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2edf5', fontWeight: 600, color: '#106fa6' }}>
          Danh sách buổi học ({filteredSchedules.length})
        </div>
        {loading ? (
          <div style={{ padding: 28, textAlign: 'center', color: '#64748b' }}>Đang tải...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Lớp', 'Môn', 'Ngày', 'Giờ', 'Phòng', 'Ca', 'Xóa'].map((h) => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSchedules.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Chưa có lịch</td></tr>
                ) : (
                  paginatedSchedules.map((s) => (
                    <tr key={s.session_id} style={{ borderBottom: '1px solid #e2edf5' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0369a1' }}>{s.class_id}</td>
                      <td style={{ padding: '10px 12px' }}>{s.subject_name || '—'}</td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{s.session_date || String(s.start_time || '').substring(0, 10)}</td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        {formatScheduleTime(s.start_time)}
                        {s.end_time ? ` – ${formatScheduleTime(s.end_time)}` : ''}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{s.room_id || s.room || '—'}</td>
                      <td style={{ padding: '10px 12px' }}>{s.shift || '—'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <button onClick={() => handleDelete(s.session_id)} style={{ padding: '4px 8px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 6, color: '#991b1b', cursor: 'pointer', fontSize: '0.75rem' }}>
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {/* Pagination */}
        {!loading && filteredSchedules.length > PAGE_SIZE && (
          <Pagination
            total={filteredSchedules.length}
            pageSize={PAGE_SIZE}
            currentPage={currentPage}
            onChange={(p) => setCurrentPage(p)}
          />
        )}
      </div>
    </div>
  );
}