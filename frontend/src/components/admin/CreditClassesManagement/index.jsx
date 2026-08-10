import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Settings, BookOpen, Users, CheckCircle, Clock, PieChart as PieChartIcon, XCircle, BarChart2, Gauge } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { 
  listCreditClasses, deleteCreditClass, updateCreditClassStatus, updateBulkCreditClassStatus,
  listSemesters, listAdministrativeClasses, listMajors, listLecturers 
} from '../../../api/creditClasses';

import FilterSection from './FilterSection';
import DataTable from './DataTable';
import EditClassModal from './EditClassModal';
import CreateClassModal from './CreateClassModal'; 
import AutoGenerateClassModal from './AutoGenerateClassModal';
import AutoScheduleTab from './AutoScheduleTab'; 
import LecturerAssignmentTab from './LecturerAssignmentTab'; 

const styles = {
  btn: { padding: "8px 16px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem", color: "#fff", transition: "all 0.2s" },
  statCard: { background: "#fff", padding: "15px 20px", borderRadius: "12px", border: "1px solid #e2e8f0", flex: 1, minWidth: "200px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  statValue: { fontSize: "1.8rem", fontWeight: "700", color: "#0f172a", margin: "8px 0 2px 0" },
  statTitle: { color: "#64748b", fontSize: "0.9rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" },
  chartBox: { background: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", position: "relative" }
};

const CreditClassesManagement = ({ showToast }) => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]); 
  const [activeTab, setActiveTab] = useState('LIST'); 

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false); 
  const [isAutoGenerateOpen, setIsAutoGenerateOpen] = useState(false);
  
  const [metaData, setMetaData] = useState({ semesters: [], adminClasses: [], majors: [], lecturers: [], faculties: [] });
  const [filters, setFilters] = useState({ semester_id: '', major_id: '', administrative_class_id: '', subject_id: '', status: '' });

  useEffect(() => {
    Promise.all([listSemesters(), listAdministrativeClasses(), listMajors(), listLecturers()]).then(([semRes, adminRes, majRes, lectRes]) => {
      const mockFaculties = [{ value: 'CNTT', label: 'Khoa Công nghệ Thông tin' }, { value: 'ATTT', label: 'Khoa An toàn Thông tin' }, { value: 'VT', label: 'Khoa Viễn thông' }];
      setMetaData({
        semesters: semRes?.data || [], adminClasses: adminRes?.data || [],
        majors: majRes?.data || [], lecturers: lectRes?.data?.map(l => ({ value: l.lecturer_id, label: l.full_name, department: l.department || 'CNTT' })) || [],
        faculties: mockFaculties
      });
    }).catch(err => console.error(err));
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const cleanFilters = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''));
      const response = await listCreditClasses(cleanFilters);
      const rawClasses = Array.isArray(response?.data) ? response.data : [];
      const enrichedClasses = rawClasses.map(cls => {
        if (cls.parent_class_id) cls.theory_class = rawClasses.find(c => c.class_id === cls.parent_class_id);
        return cls;
      });
      setClasses(enrichedClasses); setSelectedIds([]);
    } catch (error) { setClasses([]); } finally { setLoading(false); }
  };

  useEffect(() => { fetchClasses(); }, [filters]);
  const handleFilterChange = (name, value) => setFilters(prev => ({ ...prev, [name]: value }));

  const handleStatusChange = async (classId, newStatus) => {
    try { await updateCreditClassStatus(classId, newStatus); showToast?.('Cập nhật thành công', 'success'); fetchClasses(); } 
    catch (err) { showToast?.('Lỗi cập nhật', 'error'); }
  };

  const handleBulkStatusUpdate = async (newStatus) => {
    if (selectedIds.length === 0) return showToast?.('Chọn ít nhất 1 lớp', 'error');
    try { await updateBulkCreditClassStatus(selectedIds, newStatus); showToast?.(`Cập nhật thành công ${selectedIds.length} lớp`, 'success'); fetchClasses(); } 
    catch (err) { showToast?.('Lỗi hệ thống', 'error'); }
  };

  const handleDelete = async (classId, currentStudents) => {
    if (currentStudents > 0) return showToast?.(`Lớp đang có SV, không thể xóa!`, 'error');
    try { await deleteCreditClass(classId); showToast?.('Xóa thành công!', 'success'); fetchClasses(); } 
    catch (error) { showToast?.('Lỗi xóa lớp.', 'error'); }
  };

  const handleEditClick = (classData) => { setEditData(classData); setIsEditOpen(true); };

  const stats = useMemo(() => {
    const total = classes.length;
    const active = classes.filter(c => c.status === 'Active').length;
    const planning = classes.filter(c => c.status === 'Planning').length;
    const closed = classes.filter(c => c.status === 'Closed' || c.status === 'Cancelled').length;
    const fullClasses = classes.filter(c => Number(c.max_students || 0) > 0 && Number(c.current_students || 0) >= Number(c.max_students || 0)).length;
    const availableClasses = classes.filter(c => Number(c.max_students || 0) > 0 && Number(c.current_students || 0) < Number(c.max_students || 0)).length;
    const assignedLecturer = classes.filter(c => c.lecturer_id || c.lecturer_name).length;
    const unassignedLecturer = total - assignedLecturer;
    const scheduledClasses = classes.filter(c => Array.isArray(c.schedules) && c.schedules.length > 0).length;
    const unscheduledClasses = total - scheduledClasses;
    const theoryOnly = classes.filter(c => Number(c.practical_credits || 0) === 0 && Number(c.theory_credits || 0) > 0).length;
    const practiceOnly = classes.filter(c => Number(c.theory_credits || 0) === 0 && Number(c.practical_credits || 0) > 0).length;
    const mixedClasses = total - theoryOnly - practiceOnly;
    const currentSemesterClasses = filters.semester_id ? classes.filter(c => c.semester_id === filters.semester_id).length : 0;
    const fillableClasses = classes.filter(c => Number(c.max_students || 0) > 0);
    const averageFillRate = fillableClasses.length
      ? Math.round(
          (fillableClasses.reduce(
            (sum, c) => sum + Math.min(Number(c.current_students || 0) / Number(c.max_students || 1), 1),
            0
          ) /
            fillableClasses.length) *
            100
        )
      : 0;

    const subjectCountMap = {};
    const lecturerCountMap = {};
    classes.forEach((c) => {
      const subjectKey = c.subject_name || c.subject_id || 'Không rõ môn';
      subjectCountMap[subjectKey] = (subjectCountMap[subjectKey] || 0) + 1;
      const lecturerKey = c.lecturer_name || c.lecturer_id || 'Chưa phân công';
      lecturerCountMap[lecturerKey] = (lecturerCountMap[lecturerKey] || 0) + 1;
    });

    const subjectBreakdown = Object.entries(subjectCountMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const lecturerBreakdown = Object.entries(lecturerCountMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      total,
      active,
      planning,
      closed,
      fullClasses,
      availableClasses,
      assignedLecturer,
      unassignedLecturer,
      scheduledClasses,
      unscheduledClasses,
      theoryOnly,
      practiceOnly,
      mixedClasses,
      currentSemesterClasses,
      averageFillRate,
      subjectBreakdown,
      lecturerBreakdown,
    };
  }, [classes, filters.semester_id]);

  return (
    <div className="flex flex-col gap-4 md:gap-5 p-2 md:p-5">
      <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-2"><BookOpen size={26} color="#106fa6" /><h2 className="text-lg md:text-xl font-bold text-slate-900 m-0">Quản lý Lớp Tín Chỉ</h2></div>
          {activeTab === 'LIST' && (
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              {selectedIds.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "8px", overflow: "hidden" }}>
                  <span style={{ padding: "8px 12px", fontSize: "0.85rem", fontWeight: "600", color: "#475569", background: "#f8fafc", borderRight: "1px solid #cbd5e1" }}>Đã chọn {selectedIds.length}</span>
                  <select style={{ fontSize: "0.85rem", padding: "8px 12px", border: "none", outline: "none", cursor: "pointer", background: "transparent" }} onChange={(e) => { if(e.target.value) handleBulkStatusUpdate(e.target.value); e.target.value = ""; }}>
                    <option value="">-- Đổi trạng thái --</option><option value="Active">Mở đăng ký</option><option value="Planning">Kế hoạch</option><option value="Closed">Đóng</option>
                  </select>
                </div>
              )}
              <button style={{ ...styles.btn, background: "#f59e0b", display: "flex", alignItems: "center", gap: "6px" }} onClick={() => setIsAutoGenerateOpen(true)}><Settings size={18} /> Tạo tự động</button>
              <button style={{ ...styles.btn, background: "#106fa6", display: "flex", alignItems: "center", gap: "6px" }} onClick={() => setIsCreateOpen(true)}><Plus size={18} /> Thêm thủ công</button>
            </div>
          )}
        </div>
        <div className="flex gap-4 border-b border-slate-200 overflow-x-auto whitespace-nowrap">
          <button className={`pb-2 px-2 font-semibold transition-colors outline-none ${activeTab === 'LIST' ? 'text-[#106fa6] border-b-2 border-[#106fa6]' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('LIST')}>Danh sách Lớp & Thống kê</button>
          <button className={`pb-2 px-2 font-semibold transition-colors outline-none ${activeTab === 'ASSIGN_LECTURER' ? 'text-[#106fa6] border-b-2 border-[#106fa6]' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('ASSIGN_LECTURER')}>Phân công Giảng viên</button>
          <button className={`pb-2 px-2 font-semibold transition-colors outline-none ${activeTab === 'AUTO_SCHEDULE' ? 'text-[#106fa6] border-b-2 border-[#106fa6]' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setActiveTab('AUTO_SCHEDULE')}>Xếp Lịch & Phòng Tự Động</button>
        </div>
      </div>

      {activeTab === 'LIST' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div style={styles.statCard}>
              <div style={styles.statTitle}><BookOpen size={18} color="#3b82f6"/> Tổng số lớp</div>
              <div style={styles.statValue}>{stats.total}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statTitle}><CheckCircle size={18} color="#10b981"/> Trạng thái lớp</div>
              <div style={styles.statValue}>{stats.active} / {stats.planning} / {stats.closed}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 6 }}>Active / Planning / Closed</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statTitle}><Layers3 size={18} color="#063c1d"/> Số lớp đầy và còn chỗ</div>
              <div style={styles.statValue}>{stats.fullClasses} / {stats.availableClasses}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 6 }}>Đủ/đầy / Còn chỗ trống</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statTitle}><Users size={18} color="#0f5471"/> Giảng viên</div>
              <div style={styles.statValue}>{stats.assignedLecturer} / {stats.unassignedLecturer}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 6 }}>Đã có / Chưa có giảng viên</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div style={styles.statCard}>
              <div style={styles.statTitle}><CalendarClock size={18} color="#2563eb"/> Xếp lịch</div>
              <div style={styles.statValue}>{stats.scheduledClasses} / {stats.unscheduledClasses}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 6 }}>Đã xếp / Chưa xếp</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statTitle}><BookOpen size={18} color="#1d4ed8"/> Loại lớp</div>
              <div style={styles.statValue}>{stats.theoryOnly} / {stats.practiceOnly} / {stats.mixedClasses}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 6 }}>LT / TH / Tổ hợp</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statTitle}><CalendarClock size={18} color="#9333ea"/> Học kỳ hiện tại</div>
              <div style={styles.statValue}>{stats.currentSemesterClasses}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 6 }}>Lớp trong kỳ đang chọn</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statTitle}><Gauge size={18} color="#085d7a"/> Tỷ lệ lấp đầy TB</div>
              <div style={styles.statValue}>{stats.averageFillRate}%</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 6 }}>current/max trung bình</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div style={styles.chartBox}>
              <h4 style={{ margin: '0 0 12px 0', color: '#334155', fontSize: '1rem', fontWeight: 700 }}>Top 5 môn theo số lớp</h4>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {stats.subjectBreakdown.map((item) => (
                  <li key={item.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#334155' }}>{item.name}</span>
                    <span style={{ color: '#0f172a', fontWeight: 700 }}>{item.value}</span>
                  </li>
                ))}
                {stats.subjectBreakdown.length === 0 && <li style={{ color: '#64748b', padding: '12px 0' }}>Không có dữ liệu</li>}
              </ul>
            </div>
            <div style={styles.chartBox}>
              <h4 style={{ margin: '0 0 12px 0', color: '#334155', fontSize: '1rem', fontWeight: 700 }}>Top 5 giảng viên theo số lớp</h4>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {stats.lecturerBreakdown.map((item) => (
                  <li key={item.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#334155' }}>{item.name}</span>
                    <span style={{ color: '#0f172a', fontWeight: 700 }}>{item.value}</span>
                  </li>
                ))}
                {stats.lecturerBreakdown.length === 0 && <li style={{ color: '#64748b', padding: '12px 0' }}>Không có dữ liệu</li>}
              </ul>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <FilterSection filters={filters} onFilterChange={handleFilterChange} metaData={metaData} />
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', position: 'relative' }}>
              <DataTable classes={classes.filter(cls => !classes.some(c => c.parent_class_id === cls.class_id))} loading={loading} selectedIds={selectedIds} setSelectedIds={setSelectedIds} onStatusChange={handleStatusChange} onDelete={handleDelete} onEdit={handleEditClick} />
            </div>
          </div>
        </>
      )}

      {activeTab === 'ASSIGN_LECTURER' && <LecturerAssignmentTab classes={classes} lecturers={metaData.lecturers} showToast={showToast} onSuccess={fetchClasses} />}
      {activeTab === 'AUTO_SCHEDULE' && <AutoScheduleTab classes={classes} lecturers={metaData.lecturers} semesters={metaData.semesters} faculties={metaData.faculties} showToast={showToast} onSuccess={fetchClasses} />}
      {isCreateOpen && <CreateClassModal onClose={() => setIsCreateOpen(false)} onSuccess={fetchClasses} metaData={metaData} showToast={showToast} />}
      {isAutoGenerateOpen && <AutoGenerateClassModal onClose={() => setIsAutoGenerateOpen(false)} onSuccess={fetchClasses} metaData={metaData} showToast={showToast} />}
      {isEditOpen && editData && <EditClassModal editData={editData} onClose={() => setIsEditOpen(false)} onSuccess={fetchClasses} showToast={showToast} />}
    </div>
  );
};
export default CreditClassesManagement;