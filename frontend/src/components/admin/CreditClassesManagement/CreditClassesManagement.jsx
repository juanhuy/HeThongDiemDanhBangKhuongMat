import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Settings, BookOpen, Users, CheckCircle, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { listCreditClasses, listSemesters, listAdministrativeClasses, listMajors, listLecturers } from '../../../api/creditClasses';

import FilterSection from './FilterSection';
import DataTable from './DataTable';
import EditClassModal from './EditClassModal';
import CreateClassModal from './CreateClassModal'; // Component mới
import AutoGenerateClassModal from './AutoGenerateClassModal';

const CreditClassesManagement = ({ showToast }) => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]); 

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false); // State mở form tạo mới
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
      if (semesters.length > 0) setFilters(f => ({ ...f, semester_id: semesters[0].semester_id }));
    }).catch(err => console.error(err));
  }, []);

  const fetchClasses = async () => {
    if (!filters.semester_id) return; 
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

  const handleEditClick = (classData) => {
    setEditData(classData);
    setIsEditOpen(true);
  };

  // --- LOGIC THỐNG KÊ DASHBOARD ---
  const stats = useMemo(() => {
    const total = classes.length;
    const active = classes.filter(c => c.status === 'Active').length;
    const planning = classes.filter(c => c.status === 'Planning').length;
    
    const chartData = [
      { name: 'Đang mở', value: active, color: '#10B981' },
      { name: 'Kế hoạch', value: planning, color: '#F59E0B' },
      { name: 'Đã đóng', value: total - active - planning, color: '#64748B' }
    ];
    return { total, active, planning, chartData };
  }, [classes]);

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            Dashboard Quản lý Lớp Tín Chỉ
          </h1>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsAutoGenerateOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm"
            >
            <Settings className="w-4 h-4" /> <span>Tạo tự động</span>
          </button>
          <button 
            onClick={() => setIsCreateOpen(true)} 
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> <span>Tạo lớp tín chỉ</span>
          </button>
        </div>
      </div>

      {/* DASHBOARD CHARTS & STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Thẻ số liệu */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><BookOpen size={24} /></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Tổng số lớp</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.total}</h3>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg"><CheckCircle size={24} /></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Đang hoạt động</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.active}</h3>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-lg"><Clock size={24} /></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Kế hoạch</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.planning}</h3>
          </div>
        </div>
        
        {/* Biểu đồ tròn trạng thái */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-center h-24">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={stats.chartData} innerRadius={25} outerRadius={40} paddingAngle={5} dataKey="value">
                {stats.chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* BỘ LỌC VÀ BẢNG */}
      <FilterSection filters={filters} onFilterChange={handleFilterChange} metaData={metaData} />
      <DataTable 
        classes={classes} 
        loading={loading} 
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        onEdit={handleEditClick}
      />

      {/* MODAL TẠO LỚP & SỬA LỚP */}
      {isCreateOpen && (
        <CreateClassModal 
          onClose={() => setIsCreateOpen(false)}
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
          lecturers={metaData.lecturers}
          showToast={showToast}
        />

      {isAutoGenerateOpen && (
        <AutoGenerateClassModal 
          onClose={() => setIsAutoGenerateOpen(false)}
          onSuccess={fetchClasses} // Load lại danh sách sau khi lưu thành công
          metaData={metaData}
          showToast={showToast}
        />



      )}
    </div>
  );
};

export default CreditClassesManagement;