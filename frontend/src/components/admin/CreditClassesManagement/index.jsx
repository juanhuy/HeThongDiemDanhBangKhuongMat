import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Settings, BookOpen, Users, CheckCircle, Clock, PieChart as PieChartIcon, XCircle, BarChart2 } from 'lucide-react';
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
    
    const chartData = [
      { name: 'Đang mở', value: active, color: '#10b981' }, { name: 'Kế hoạch', value: planning, color: '#f59e0b' }, { name: 'Đã hủy/đóng', value: closed, color: '#ef4444' }
    ];

    const adminClassData = {}; const majorData = {};
    let assignedLecturer = 0; let unassignedLecturer = 0; let assignedSchedule = 0; let unassignedSchedule = 0;

    classes.forEach(c => {
      (c.target_classes || []).forEach(className => {
        adminClassData[className] = (adminClassData[className] || 0) + 1;
        const adminClassObj = metaData.adminClasses?.find(a => a.class_name === className || a.class_id === className);
        if (adminClassObj && adminClassObj.major_id) {
          const majorObj = metaData.majors?.find(m => m.major_id === adminClassObj.major_id);
          majorData[majorObj?.major_name || majorObj?.name || 'Unknown'] = (majorData[majorObj?.major_name || majorObj?.name || 'Unknown'] || 0) + 1;
        } else majorData['Chưa phân loại'] = (majorData['Chưa phân loại'] || 0) + 1;
      });
      if (c.lecturer_id || c.lecturer_name) assignedLecturer++; else unassignedLecturer++;
      if (c.schedules && c.schedules.length > 0) assignedSchedule++; else unassignedSchedule++;
    });

    return { 
      total, active, planning, closed, chartData,
      adminClassChartData: Object.entries(adminClassData).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10),
      majorChartData: Object.entries(majorData).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      lecturerChartData: [{ name: 'Đã phân công', value: assignedLecturer, color: '#10b981' }, { name: 'Chưa phân công', value: unassignedLecturer, color: '#ef4444' }],
      scheduleChartData: [{ name: 'Đã xếp phòng', value: assignedSchedule, color: '#3b82f6' }, { name: 'Chưa xếp', value: unassignedSchedule, color: '#f59e0b' }]
    };
  }, [classes, metaData]);

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div style={styles.statCard}><div style={styles.statTitle}><BookOpen size={18} color="#3b82f6"/> Số lớp đã tạo</div><div style={styles.statValue}>{stats.total}</div></div>
            <div style={styles.statCard}><div style={styles.statTitle}><CheckCircle size={18} color="#10b981"/> Đang mở đăng ký</div><div style={styles.statValue}>{stats.active} <span style={{fontSize:"1rem", color:"#94a3b8", fontWeight:"normal"}}>/ {stats.total}</span></div></div>
            <div style={styles.statCard}><div style={styles.statTitle}><Clock size={18} color="#f59e0b"/> Số lớp dự kiến</div><div style={styles.statValue}>{stats.planning}</div></div>
            <div style={styles.statCard}><div style={styles.statTitle}><XCircle size={18} color="#ef4444"/> Số lớp đã hủy/đóng</div><div style={styles.statValue}>{stats.closed}</div></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
            <div style={styles.chartBox}>
              <h4 style={{ margin: "0 0 15px 0", color: "#334155", display: "flex", alignItems: "center", gap: "6px", fontSize: "1.05rem" }}><BarChart2 size={18} color="#64748b"/> Lớp mở theo Lớp biên chế (Top 10)</h4>
              <div style={{ width: "100%", height: "220px" }}>
                {stats.adminClassChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%"><BarChart data={stats.adminClassChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" tick={{fontSize: 11, fill: '#64748b'}} tickLine={false} axisLine={{stroke: '#e2e8f0'}} /><YAxis tick={{fontSize: 11, fill: '#64748b'}} tickLine={false} axisLine={false} allowDecimals={false} /><Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }} /><Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Số lớp" /></BarChart></ResponsiveContainer>
                ) : (<div className="h-full flex items-center justify-center text-slate-400">Chưa có dữ liệu</div>)}
              </div>
            </div>
            <div style={styles.chartBox}>
              <h4 style={{ margin: "0 0 15px 0", color: "#334155", display: "flex", alignItems: "center", gap: "6px", fontSize: "1.05rem" }}><PieChartIcon size={18} color="#64748b"/> Tình trạng phân công Giảng viên</h4>
              <div style={{ width: "100%", height: "220px" }}>
                <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stats.lecturerChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">{stats.lecturerChartData.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip /><Legend verticalAlign="bottom" height={36} iconType="circle"/></PieChart></ResponsiveContainer>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <FilterSection filters={filters} onFilterChange={handleFilterChange} metaData={metaData} />
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", position: "relative" }}>
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