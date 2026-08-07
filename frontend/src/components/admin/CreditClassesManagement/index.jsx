import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Settings, BookOpen, Users, CheckCircle, Clock, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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
      setClasses(rawClasses);
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
    if (window.confirm(`Bạn có chắc muốn xóa lớp ${classId}?`)) {
      try {
        await deleteCreditClass(classId);
        showToast?.('Xóa thành công!', 'success');
        fetchClasses(); 
      } catch (error) { showToast?.('Lỗi khi xóa lớp.', 'error'); }
    }
  };

  const handleEditClick = (classData) => {
    setEditData(classData);
    setIsEditOpen(true);
  };

  const stats = useMemo(() => {
    const total = classes.length;
    const active = classes.filter(c => c.status === 'Active').length;
    const planning = classes.filter(c => c.status === 'Planning').length;
    
    const chartData = [
      { name: 'Đang mở', value: active, color: '#10b981' },
      { name: 'Kế hoạch', value: planning, color: '#f59e0b' },
      { name: 'Đã đóng', value: total - active - planning, color: '#ef4444' }
    ];
    return { total, active, planning, chartData };
  }, [classes]);

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
          <div style={styles.statTitle}><BookOpen size={18} color="#3b82f6"/> Tổng số lớp</div>
          <div style={styles.statValue}>{stats.total}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statTitle}><CheckCircle size={18} color="#10b981"/> Đang mở đăng ký</div>
          <div style={styles.statValue}>{stats.active} <span style={{fontSize:"1rem", color:"#94a3b8", fontWeight:"normal"}}>/ {stats.total}</span></div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statTitle}><Clock size={18} color="#f59e0b"/> Đang lên kế hoạch</div>
          <div style={styles.statValue}>{stats.planning}</div>
        </div>
      </div>

      {/* 3. CHARTS DASHBOARD (Tùy chọn) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px" }}>
        <div style={styles.chartBox}>
          <h4 style={{ margin: "0 0 15px 0", color: "#334155", display: "flex", alignItems: "center", gap: "6px", fontSize: "1.05rem" }}>
            <PieChartIcon size={18} color="#64748b"/> Tỷ lệ Trạng thái
          </h4>
          <div style={{ width: "100%", height: "260px" }}>
            {stats.total > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value">
                    {stats.chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} lớp`, 'Số lượng']} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}/>
                  <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                </PieChart>
              </ResponsiveContainer>
            ) : (<div style={{height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8"}}>Chưa có dữ liệu</div>)}
          </div>
        </div>

        {/* 4. DANH SÁCH BẢNG & BỘ LỌC */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <FilterSection filters={filters} onFilterChange={handleFilterChange} metaData={metaData} />
          
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", position: "relative" }}>
            <DataTable 
              classes={classes} 
              loading={loading} 
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete} 
              onEdit={handleEditClick}
            />
          </div>
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