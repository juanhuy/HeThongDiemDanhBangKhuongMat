import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Settings, BookOpen, Users, CheckCircle, Clock, PieChart as PieChartIcon, XCircle, BarChart2 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { 
  listCreditClasses, 
  deleteCreditClass, 
  updateCreditClassStatus, 
  updateBulkCreditClassStatus,
  listSemesters, 
  listAdministrativeClasses, 
  listMajors, 
  listLecturers 
} from '../../../api/creditClasses';

import FilterSection from './FilterSection';
import DataTable from './DataTable';
import EditClassModal from './EditClassModal';
import CreateClassModal from './CreateClassModal'; 
import AutoGenerateClassModal from './AutoGenerateClassModal';

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

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false); 
  const [isAutoGenerateOpen, setIsAutoGenerateOpen] = useState(false);
  
  const [metaData, setMetaData] = useState({ semesters: [], adminClasses: [], majors: [], lecturers: [] });
  const [filters, setFilters] = useState({
    semester_id: '', major_id: '', administrative_class_id: '', subject_id: '', status: ''
  });

  useEffect(() => {
    Promise.all([listSemesters(), listAdministrativeClasses(), listMajors(), listLecturers()]).then(([semRes, adminRes, majRes, lectRes]) => {
      const semesters = semRes?.data || [];
      setMetaData({
        semesters: semesters,
        adminClasses: adminRes?.data || [],
        majors: majRes?.data || [],
        lecturers: lectRes?.data?.map(l => ({ value: l.lecturer_id, label: l.full_name })) || []
      });
    }).catch(err => console.error(err));
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const cleanFilters = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''));
      const response = await listCreditClasses(cleanFilters);
      
      const rawClasses = Array.isArray(response?.data) ? response.data : [];
      
      // Map theory_class cho các lớp thực hành để hiển thị song song 2 lịch
      const enrichedClasses = rawClasses.map(cls => {
        if (cls.parent_class_id) {
           cls.theory_class = rawClasses.find(c => c.class_id === cls.parent_class_id);
        }
        return cls;
      });

      setClasses(enrichedClasses);
      setSelectedIds([]);
    } catch (error) {
      setClasses([]); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClasses(); }, [filters]);

  const handleFilterChange = (name, value) => setFilters(prev => ({ ...prev, [name]: value }));

  const handleStatusChange = async (classId, newStatus) => {
    try {
      await updateCreditClassStatus(classId, newStatus);
      showToast?.('Cập nhật trạng thái thành công', 'success');
      fetchClasses();
    } catch (err) {
      showToast?.('Lỗi cập nhật trạng thái', 'error');
    }
  };

  const handleBulkStatusUpdate = async (newStatus) => {
    if (selectedIds.length === 0) return showToast?.('Vui lòng chọn ít nhất 1 lớp', 'error');
    try {
      await updateBulkCreditClassStatus(selectedIds, newStatus);
      showToast?.(`Đã cập nhật ${selectedIds.length} lớp thành ${newStatus}`, 'success');
      fetchClasses();
    } catch (err) {
      showToast?.('Lỗi cập nhật hàng loạt', 'error');
    }
  };

  const handleDelete = async (classId, currentStudents) => {
    if (currentStudents > 0) return showToast?.(`Lớp đang có ${currentStudents} SV, không thể xóa!`, 'error');
    try {
      await deleteCreditClass(classId);
      showToast?.('Xóa thành công!', 'success');
      fetchClasses(); 
    } catch (error) { showToast?.(error.response?.data?.detail || 'Lỗi khi xóa lớp.', 'error'); }
  };

  const handleEditClick = (classData) => {
    setEditData(classData);
    setIsEditOpen(true);
  };

  const stats = useMemo(() => {
    const total = classes.length;
    const active = classes.filter(c => c.status === 'Active').length;
    const planning = classes.filter(c => c.status === 'Planning').length;
    const closed = classes.filter(c => c.status === 'Closed' || c.status === 'Cancelled').length;
    
    const chartData = [
      { name: 'Đang mở', value: active, color: '#10b981' },
      { name: 'Kế hoạch', value: planning, color: '#f59e0b' },
      { name: 'Đã hủy/đóng', value: closed, color: '#ef4444' }
    ];

    // Calculate Admin Class and Major stats
    const adminClassData = {};
    const majorData = {};

    classes.forEach(c => {
      const classesList = c.target_classes || [];
      if (classesList.length > 0) {
        classesList.forEach(className => {
          adminClassData[className] = (adminClassData[className] || 0) + 1;
          
          // Map to major using metaData.adminClasses
          // Some APIs might return class_name, some return class_id, check both
          const adminClassObj = metaData.adminClasses?.find(a => 
            a.class_name === className || a.class_id === className || a.name === className
          );
          
          if (adminClassObj && adminClassObj.major_id) {
            const majorObj = metaData.majors?.find(m => m.major_id === adminClassObj.major_id);
            const majorName = majorObj?.major_name || majorObj?.name || `Ngành ${adminClassObj.major_id}`;
            majorData[majorName] = (majorData[majorName] || 0) + 1;
          } else {
            majorData['Chưa phân loại'] = (majorData['Chưa phân loại'] || 0) + 1;
          }
        });
      } else {
         majorData['Chưa phân loại'] = (majorData['Chưa phân loại'] || 0) + 1;
      }
    });

    const adminClassChartData = Object.entries(adminClassData)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10

    const majorChartData = Object.entries(majorData)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    let assignedLecturer = 0;
    let unassignedLecturer = 0;
    let assignedSchedule = 0;
    let unassignedSchedule = 0;

    classes.forEach(c => {
      // Phân công giảng viên
      if (c.lecturer_id || c.lecturer_name) assignedLecturer++;
      else unassignedLecturer++;

      // Phân công lịch học & phòng
      if (c.schedules && c.schedules.length > 0) assignedSchedule++;
      else unassignedSchedule++;
    });

    const lecturerChartData = [
      { name: 'Đã phân công', value: assignedLecturer, color: '#10b981' },
      { name: 'Chưa phân công', value: unassignedLecturer, color: '#ef4444' }
    ];

    const scheduleChartData = [
      { name: 'Đã xếp phòng/lịch', value: assignedSchedule, color: '#3b82f6' },
      { name: 'Chưa xếp', value: unassignedSchedule, color: '#f59e0b' }
    ];

    return { total, active, planning, closed, chartData, adminClassChartData, majorChartData, lecturerChartData, scheduleChartData };
  }, [classes, metaData]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "20px" }}>
      {/* 1. HEADER & ACTIONS */}
      <div style={{ display: "flex", justifyItems: "space-between", justifyContent: "space-between", alignItems: "center", background: "#ffffff", padding: "15px 20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <BookOpen size={26} color="#106fa6" />
          <h2 style={{ fontSize: "1.3rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>Quản lý Lớp Tín Chỉ</h2>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {selectedIds.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "8px", overflow: "hidden" }}>
              <span style={{ padding: "8px 12px", fontSize: "0.85rem", fontWeight: "600", color: "#475569", background: "#f8fafc", borderRight: "1px solid #cbd5e1" }}>
                Đã chọn {selectedIds.length}
              </span>
              <select 
                style={{ fontSize: "0.85rem", padding: "8px 12px", border: "none", outline: "none", cursor: "pointer", background: "transparent" }}
                onChange={(e) => { if(e.target.value) handleBulkStatusUpdate(e.target.value); e.target.value = ""; }}
              >
                <option value="">-- Đổi trạng thái --</option>
                <option value="Active">Mở đăng ký</option>
                <option value="Planning">Kế hoạch</option>
                <option value="Closed">Đóng</option>
              </select>
            </div>
          )}
          <button 
            style={{ ...styles.btn, background: "#f59e0b", display: "flex", alignItems: "center", gap: "6px" }}
            onClick={() => setIsAutoGenerateOpen(true)}
          >
            <Settings size={18} /> Tạo tự động
          </button>
          <button 
            style={{ ...styles.btn, background: "#106fa6", display: "flex", alignItems: "center", gap: "6px" }}
            onClick={() => setIsCreateOpen(true)} 
          >
            <Plus size={18} /> Thêm thủ công
          </button>
        </div>
      </div>

      {/* 2. THẺ KPI (TOP CARDS) */}
      <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
        <div style={styles.statCard}>
          <div style={styles.statTitle}><BookOpen size={18} color="#3b82f6"/> Số lớp đã tạo</div>
          <div style={styles.statValue}>{stats.total}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statTitle}><CheckCircle size={18} color="#10b981"/> Đang mở đăng ký</div>
          <div style={styles.statValue}>{stats.active} <span style={{fontSize:"1rem", color:"#94a3b8", fontWeight:"normal"}}>/ {stats.total}</span></div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statTitle}><Clock size={18} color="#f59e0b"/> Số lớp dự kiến</div>
          <div style={styles.statValue}>{stats.planning}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statTitle}><XCircle size={18} color="#ef4444"/> Số lớp đã hủy/đóng</div>
          <div style={styles.statValue}>{stats.closed}</div>
        </div>
      </div>

      {/* 3. CHARTS DASHBOARD */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        
        {/* Thống kê theo lớp biên chế (Top 10) */}
        <div style={styles.chartBox}>
          <h4 style={{ margin: "0 0 15px 0", color: "#334155", display: "flex", alignItems: "center", gap: "6px", fontSize: "1.05rem" }}>
            <BarChart2 size={18} color="#64748b"/> Lớp mở theo Lớp biên chế (Top 10)
          </h4>
          <div style={{ width: "100%", height: "220px" }}>
            {stats.adminClassChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.adminClassChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{fontSize: 11, fill: '#64748b'}} tickLine={false} axisLine={{stroke: '#e2e8f0'}} />
                  <YAxis tick={{fontSize: 11, fill: '#64748b'}} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Số lớp" />
                </BarChart>
              </ResponsiveContainer>
            ) : (<div style={{height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8"}}>Chưa có dữ liệu</div>)}
          </div>
        </div>

        {/* Thống kê theo Ngành */}
        <div style={styles.chartBox}>
          <h4 style={{ margin: "0 0 15px 0", color: "#334155", display: "flex", alignItems: "center", gap: "6px", fontSize: "1.05rem" }}>
            <PieChartIcon size={18} color="#64748b"/> Lớp mở theo Ngành
          </h4>
          <div style={{ width: "100%", height: "220px" }}>
            {stats.majorChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.majorChartData} cx="50%" cy="50%" outerRadius={80} dataKey="value" labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                    return percent > 0.05 ? (<text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11}>{`${(percent * 100).toFixed(0)}%`}</text>) : null;
                  }}>
                    {stats.majorChartData.map((entry, index) => {
                       const COLORS = ['#106fa6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'];
                       return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    })}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} lớp`, 'Số lượng']} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}/>
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (<div style={{height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8"}}>Chưa có dữ liệu</div>)}
          </div>
        </div>

        {/* Tình trạng phân công giảng viên */}
        <div style={styles.chartBox}>
          <h4 style={{ margin: "0 0 15px 0", color: "#334155", display: "flex", alignItems: "center", gap: "6px", fontSize: "1.05rem" }}>
            <Users size={18} color="#64748b"/> Tình trạng phân công Giảng viên
          </h4>
          <div style={{ width: "100%", height: "220px" }}>
            {stats.total > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.lecturerChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {stats.lecturerChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} lớp`, 'Số lượng']} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}/>
                  <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                </PieChart>
              </ResponsiveContainer>
            ) : (<div style={{height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8"}}>Chưa có dữ liệu</div>)}
          </div>
        </div>

        {/* Tình trạng phân công Lịch học / Phòng học */}
        <div style={styles.chartBox}>
          <h4 style={{ margin: "0 0 15px 0", color: "#334155", display: "flex", alignItems: "center", gap: "6px", fontSize: "1.05rem" }}>
            <Clock size={18} color="#64748b"/> Tình trạng phân bổ Lịch & Phòng
          </h4>
          <div style={{ width: "100%", height: "220px" }}>
            {stats.total > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.scheduleChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {stats.scheduleChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} lớp`, 'Số lượng']} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}/>
                  <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                </PieChart>
              </ResponsiveContainer>
            ) : (<div style={{height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8"}}>Chưa có dữ liệu</div>)}
          </div>
        </div>

      </div>

        {/* 4. DANH SÁCH BẢNG & BỘ LỌC */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <FilterSection filters={filters} onFilterChange={handleFilterChange} metaData={metaData} />
          
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", position: "relative" }}>
            <DataTable 
              classes={classes.filter(cls => !classes.some(c => c.parent_class_id === cls.class_id))} 
              loading={loading} 
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete} 
              onEdit={handleEditClick}
            />
          </div>
        </div>

      {/* CÁC MODALS */}
      {isCreateOpen && (
        <CreateClassModal 
          onClose={() => setIsCreateOpen(false)}
          onSuccess={fetchClasses}
          metaData={metaData}
          showToast={showToast}
        />
      )}

      {isAutoGenerateOpen && (
        <AutoGenerateClassModal 
          onClose={() => setIsAutoGenerateOpen(false)}
          onSuccess={fetchClasses}
          metaData={metaData}
          showToast={showToast}
        />
      )}

      {isEditOpen && editData && (
        <EditClassModal 
          editData={editData}
          onClose={() => setIsEditOpen(false)}
          onSuccess={fetchClasses}
          showToast={showToast}
        />
      )}
    </div>
  );
};

export default CreditClassesManagement;