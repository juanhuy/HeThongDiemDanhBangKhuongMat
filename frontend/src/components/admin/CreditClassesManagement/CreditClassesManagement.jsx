import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Plus, 
  Settings, 
  BookOpen, 
  CheckSquare, 
  Layers3, 
  Users,
  UploadCloud,
  CalendarClock,
  X,
  PieChart as PieChartIcon,
  BarChart2,
  Activity,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

import { 
  listCreditClasses, 
  getCreditClass,
  updateCreditClass,
  deleteCreditClass, 
  updateCreditClassStatus, 
  updateBulkCreditClassStatus,
  importCreditClasses,
  listSemesters, 
  listAdministrativeClasses, 
  listMajors
//  listLecturers
} from '../../../api/creditClasses';
//api/admin/lecturers/
import { listLecturers } from '../../../api/lecturers';
import { listSubjects } from '../../../api/subjects';
import { listRooms } from '../../../api/rooms';

import FilterSection from './FilterSection';
import TestTable from './test';
import EditClassModal from './EditClassModal';
import CreateWizardModal from '../CreditClassesManagement/CreateWizardModal';
import AutoScheduleTab from './AutoScheduleTab';
import styles from './Styles';
import Pagination from '../../common/Pagination';

const initialFilters = {
  semester_id: '',
  major_id: '',
  administrative_class_id: '',
  subject_id: '',
  status: ''
};

const CreditClassesManagement = ({ showToast }) => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const [isCreating, setIsCreating] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState(null);

  const fileInputRef = useRef(null);
  const allSelected = classes.length > 0 && selectedIds.length === classes.length;
  const hasSelectedClasses = selectedIds.length > 0;
  const selectedClasses = classes.filter((item) => selectedIds.includes(item.class_id));

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedIds(classes.map((item) => item.class_id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (classId) => {
    setSelectedIds((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId]
    );
  };

  const statusLabels = {
    Active: 'Đang mở',
    Planning: 'Kế hoạch',
    Closed: 'Đã đóng',
  };

  const columns = [
    {
      title: '',
      width: '50px',
      align: 'center',
      headerRender: () => (
        <input
          type="checkbox"
          checked={allSelected}
          onChange={handleSelectAll}
          aria-label="Chọn tất cả lớp"
          style={{ width: 16, height: 16, cursor: 'pointer' }}
        />
      ),
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.class_id)}
          onChange={() => handleSelectOne(row.class_id)}
          aria-label={`Chọn lớp ${row.class_id}`}
          style={{ width: 16, height: 16, cursor: 'pointer' }}
        />
      ),
    },
    {
      title: 'STT',
      width: '60px',
      align: 'center',
      render: (_row, index) => (currentPage - 1) * PAGE_SIZE + index + 1,
    },
    {
      title: 'Môn học',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0369a1' }}>
            {row.subject_name || row.subject_id || '—'}
          </div>
          <div style={{ marginTop: 4, color: '#475569', fontSize: '0.8rem' }}>
            {row.subject_id ? `Mã: ${row.subject_id}` : 'Không có mã'}
          </div>
          <div style={{ marginTop: 4, color: '#64748b', fontSize: '0.8rem' }}>
            Số tín chỉ: {row.credits ?? 0}
          </div>
        </div>
      ),
    },
    {
      title: 'Nhóm',
      align: 'center',
      render: (row) => row.display_group || '—',
    },
    {
      title: 'Biên chế',
      render: (row) =>
        row.target_classes_display?.length > 0
          ? row.target_classes_display.join(', ')
          : 'Chưa xếp',
    },
    {
      title: 'Giảng viên',
      render: (row) => row.lecturer_name || row.theory_class?.lecturer_name || 'Chưa xếp',
    },
    {
      title: 'Trạng thái',
      align: 'center',
      render: (row) => statusLabels[row.status] || row.status || '—',
    },
    {
      title: 'Hành động',
      align: 'center',
      render: (row) => (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => handleEditClick(row)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', color: '#334155', cursor: 'pointer' }}
          >
            Sửa
          </button>
          <button
            type="button"
            onClick={() => handleDelete(row.class_id, Number(row.current_students || 0))}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff1f2', color: '#b91c1c', cursor: 'pointer' }}
          >
            Xóa
          </button>
        </div>
      ),
    },
  ];
  
  const [metaData, setMetaData] = useState({ 
    semesters: [], 
    adminClasses: [], 
    majors: [], 
    lecturers: [] 
  });
  const [filters, setFilters] = useState(initialFilters);

  // Tải dữ liệu Metadata
  useEffect(() => {
    Promise.all([
      listSemesters(), 
      listAdministrativeClasses(), 
      listMajors(), 
      listLecturers(),
      listRooms()
    ]).then(([semRes, adminRes, majRes, lectRes, roomRes]) => {
      const semesters = Array.isArray(semRes) ? semRes : semRes?.data || [];
      const adminClasses = Array.isArray(adminRes) ? adminRes : adminRes?.data || [];
      const majors = Array.isArray(majRes) ? majRes : majRes?.data || [];
      const lecturersData = Array.isArray(lectRes) ? lectRes : lectRes?.data || [];
      const roomData = Array.isArray(roomRes?.data) ? roomRes.data : (Array.isArray(roomRes) ? roomRes : []);

      setMetaData({
        semesters,
        adminClasses,
        majors,
        lecturers: lecturersData.map(l => ({ value: l.lecturer_id || l.id, label: l.full_name || l.name || l.label || l.lecturer_id }))
      });
      setRooms(roomData);

      if (semesters.length > 0) {
        setFilters(f => ({ ...f, semester_id: semesters[0].semester_id }));
      }
    }).catch(err => console.error("Lỗi tải metadata:", err));
  }, []);

  // Fetch danh sách lớp tín chỉ
  const fetchClasses = useCallback(async () => {
    if (!filters.semester_id) return;
    setLoading(true);
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '' && v !== null)
      );
      const response = await listCreditClasses(cleanFilters);
      const rawClasses = Array.isArray(response?.data) ? response.data : [];
      
      const theoryClasses = rawClasses.filter(c => !c.parent_class_id);
      const practiceClasses = rawClasses.filter(c => c.parent_class_id);
      const displayClasses = [];

      theoryClasses.forEach(tc => {
        const children = practiceClasses.filter(pc => pc.parent_class_id === tc.class_id);
        const gNum = String(tc.group_number || tc.class_group || '1').padStart(2, '0');
        if (children.length > 0) {
          children.forEach((pc, idx) => {
            const sgNum = String(pc.sub_group_number || (idx + 1)).padStart(2, '0');
            displayClasses.push({
              ...pc, 
              theory_class: tc, 
              display_group: `${gNum}-${sgNum}`,
              target_classes_display: (pc.target_classes?.length > 0) ? pc.target_classes : tc.target_classes
            });
          });
        } else {
          displayClasses.push({ ...tc, display_group: gNum, target_classes_display: tc.target_classes });
        }
      });
      setClasses(displayClasses);
      setSelectedIds([]);
    } catch (error) {
      setClasses([]); 
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { 
    fetchClasses(); 
  }, [fetchClasses]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, classes]);

  const paginatedClasses = classes.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleFilterChange = (name, value) => setFilters(prev => ({ ...prev, [name]: value }));
  
  const handleResetFilters = () => {
    const defaultSemester = metaData.semesters[0]?.semester_id || '';
    setFilters({ ...initialFilters, semester_id: defaultSemester });
  };

  const summary = useMemo(() => {
    const total = classes.length;
    const active = classes.filter(c => c.status === 'Active').length;
    const planning = classes.filter(c => c.status === 'Planning').length;
    const full = classes.filter(c => Number(c.current_students || 0) >= Number(c.max_students || 0) && c.max_students).length;
    const assigned = classes.filter(c => c.lecturer_name || c.theory_class?.lecturer_name).length;
    const registeredStudents = classes.reduce((sum, c) => sum + Number(c.current_students || 0), 0);

    return { total, active, planning, full, assigned, registeredStudents };
  }, [classes]);

  const chartData = useMemo(() => {
    const statusCounts = {
      'Đang mở': 0,
      'Kế hoạch': 0,
      'Đã đóng': 0,
    };
    const subjectMap = {};

    classes.forEach((c) => {
      const statusLabel = statusLabels[c.status] || 'Đã đóng';
      statusCounts[statusLabel] += 1;

      const subjectKey = c.subject_name || c.subject_id || 'Không rõ';
      if (!subjectMap[subjectKey]) {
        subjectMap[subjectKey] = { name: subjectKey, count: 0 };
      }
      subjectMap[subjectKey].count += 1;
    });

    const statusList = Object.entries(statusCounts)
      .filter(([, value]) => value > 0)
      .map(([name, value], index) => ({
        name,
        value,
        color: index === 0 ? '#10b981' : index === 1 ? '#f59e0b' : '#64748b',
      }));

    const subjectsList = Object.values(subjectMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return { statusList, subjectsList };
  }, [classes, statusLabels]);

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

  const handleScheduleSelected = () => {
    if (!hasSelectedClasses) {
      showToast?.('Vui lòng chọn ít nhất 1 lớp để xếp lịch', 'error');
      return;
    }
    setIsScheduleOpen(true);
  };

  const handleDelete = async (classId, currentStudents) => {
    if (currentStudents > 0) return showToast?.(`Lớp đang có ${currentStudents} SV, không thể xóa!`, 'error');
    if (window.confirm(`Bạn có chắc muốn xóa lớp ${classId}?`)) {
      try {
        await deleteCreditClass(classId);
        showToast?.('Xóa thành công!', 'success');
        fetchClasses(); 
      } catch (error) { 
        showToast?.('Lỗi khi xóa lớp.', 'error'); 
      }
    }
  };

  const handleEditClick = async (classData) => {
    try {
      const response = await getCreditClass(classData.class_id);
      const detail = response?.data || response || classData;
      setEditData(detail);
    } catch (error) {
      console.error('Lỗi tải chi tiết lớp:', error);
      showToast?.('Không tải được dữ liệu lớp từ server. Vui lòng thử lại.', 'error');
      setEditData(classData);
    } finally {
      setIsEditOpen(true);
    }
  };

  const handleStartCreate = () => {
    console.log('open wizard');
    setIsWizardOpen(true);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsCreating(true);
      await importCreditClasses(formData);
      showToast?.('Upload file lớp tín chỉ thành công!', 'success');
      fetchClasses();
    } catch (error) {
      showToast?.(error.message || 'Upload lớp tín chỉ thất bại.', 'error');
    } finally {
      setIsCreating(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const modalSemesters = useMemo(
    () =>
      metaData.semesters.map((semester) => ({
        value: semester.semester_id,
        label: `Học kỳ ${semester.semester} (${semester.academic_year})`,
      })),
    [metaData.semesters]
  );

  const subjectOptions = useMemo(
    () =>
      subjects.map((subject) => ({
        value: subject.subject_id,
        label: `${subject.subject_id} - ${subject.subject_name || ''}`,
        code: subject.subject_id,
        theory_credits: Number(subject.theory_credits || 0),
        practical_credits: Number(subject.practical_credits || 0),
        credits: (Number(subject.theory_credits || 0) + Number(subject.practical_credits || 0)) || 0,
        department: subject.faculty_name || subject.department || '',
      })),
    [subjects]
  );

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await listSubjects();
        setSubjects(response?.data || response || []);
      } catch (err) {
        console.error('Lỗi tải môn học:', err);
      }
    };
    fetchSubjects();
  }, []);

  const defaultWizardSemesterId = filters.semester_id || modalSemesters[0]?.value || '';
  const semesters = modalSemesters;
  const lecturers = metaData.lecturers;
  const adminClasses = metaData.adminClasses;

  return (
  <div style={styles.page}>
    <div style={styles.container}>
      {/* Modal chỉnh sửa */}
      {isEditOpen && editData && (
        <CreateWizardModal
            initialData={editData}
            isEdit={true}
            onUpdate={async (updatedPayload) => {
                const classId = updatedPayload.class_id || updatedPayload.id || editData?.class_id || editData?.id;
                if (!classId) {
                  throw new Error('Không xác định được ID lớp để cập nhật');
                }
                await updateCreditClass(classId, updatedPayload);
            }}
            onClose={() => setIsEditOpen(false)}
            onSuccess={fetchClasses}
            semesters={semesters}
            subjects={subjectOptions}
            lecturers={lecturers}
            adminClasses={adminClasses}
            rooms={rooms}
            showToast={showToast}
        />
      )}

      {/* Header và thống kê */}
      <section style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          {/* Tiêu đề */}
          <div style={styles.titleWrapper}>
            <BookOpen style={styles.titleIcon} />

            <div>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#106fa6', margin: 0 }}>
                Quản lý Lớp Tín Chỉ
              </h2>

              <p style={styles.description}>
                Theo dõi, lọc, lập kế hoạch và điều phối các lớp học phần trong kỳ.
              </p>
            </div>
          </div>

          {/* Nhóm thao tác */}
          <div style={styles.actionGroup}>
            <div style={styles.selectedBox}>
              <span style={styles.selectedText}>
                {hasSelectedClasses ? `Đã chọn ${selectedIds.length}` : 'Chưa chọn lớp'}
              </span>

              <select
                value={bulkStatus}
                disabled={!hasSelectedClasses}
                onChange={async (event) => {
                  const value = event.target.value;

                  setBulkStatus(value);

                  if (value) {
                    await handleBulkStatusUpdate(value);
                    setBulkStatus('');
                  }
                }}
                style={{ ...styles.bulkSelect, opacity: hasSelectedClasses ? 1 : 0.6 }}
              >
                <option value="">-- Đổi trạng thái --</option>
                <option value="Active">Mở đăng ký</option>
                <option value="Planning">Kế hoạch</option>
                <option value="Closed">Đóng lớp</option>
              </select>
              <button
                type="button"
                onClick={handleScheduleSelected}
                disabled={!hasSelectedClasses}
                style={{
                  ...styles.secondaryButton,
                  height: 32,
                  padding: '0 10px',
                  borderColor: '#106fa6',
                  color: '#106fa6',
                  whiteSpace: 'nowrap',
                  opacity: hasSelectedClasses ? 1 : 0.6,
                  cursor: hasSelectedClasses ? 'pointer' : 'not-allowed'
                }}
                title="Xếp lịch cho lớp đã chọn"
              >
                <CalendarClock size={16} />
                Xếp lịch tự động
              </button>
            </div>

            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />

            <button
              type="button"
              style={styles.secondaryButton}
              onMouseEnter={(event) => {
                event.currentTarget.style.background = '#f8fafc';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = '#fff';
              }}
              onClick={() => fileInputRef.current?.click()}
              disabled={isCreating}
            >
              <UploadCloud size={18} color="#64748b" />
              {isCreating ? 'Đang upload...' : 'Tạo tự động'}
            </button>

            <button
              type="button"
              style={styles.primaryButton}
              onMouseEnter={(event) => {
                event.currentTarget.style.background = '#0d5d8a';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = '#106fa6';
              }}
              onClick={handleStartCreate}
            >
              <Plus size={18} />
              Tạo thủ công
            </button>
          </div>
        </div>
      </section>

      <section style={{ ...styles.card, padding: 0 }}>
        <div style={styles.summaryGrid}>
          <div style={{ ...styles.summaryCard, background: '#f8fbff', border: '1px solid #dbeafe' }}>
            <div style={styles.summaryContent}>
              <p style={styles.summaryLabel}>Tổng lớp tín chỉ</p>
              <p style={styles.summaryValue}>{summary.total}</p>
            </div>
            <div style={{ ...styles.summaryIcon, background: '#dbeafe' }}>
              <BookOpen size={22} color="#2563eb" />
            </div>
          </div>

          <div style={{ ...styles.summaryCard, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <div style={styles.summaryContent}>
              <p style={styles.summaryLabel}>Đang mở đăng ký</p>
              <p style={styles.summaryValue}>{summary.active}</p>
            </div>
            <div style={{ ...styles.summaryIcon, background: '#dcfce7' }}>
              <Activity size={22} color="#16a34a" />
            </div>
          </div>

          <div style={{ ...styles.summaryCard, background: '#fff7ed', border: '1px solid #fed7aa' }}>
            <div style={styles.summaryContent}>
              <p style={styles.summaryLabel}>Kế hoạch / chuẩn bị</p>
              <p style={styles.summaryValue}>{summary.planning}</p>
            </div>
            <div style={{ ...styles.summaryIcon, background: '#ffedd5' }}>
              <Layers size={22} color="#ea580c" />
            </div>
          </div>

          <div style={{ ...styles.summaryCard, background: '#fdf4ff', border: '1px solid #f5d0fe' }}>
            <div style={styles.summaryContent}>
              <p style={styles.summaryLabel}>Sinh viên đã đăng ký</p>
              <p style={styles.summaryValue}>{summary.registeredStudents}</p>
            </div>
            <div style={{ ...styles.summaryIcon, background: '#fae8ff' }}>
              <Users size={22} color="#a855f7" />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, padding: '0 16px 16px' }}>
          <div style={styles.chartBox}>
            <h4 style={{ margin: '0 0 12px 0', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1rem' }}>
              <PieChartIcon size={18} color="#64748b" /> Tỷ lệ trạng thái lớp
            </h4>
            <div style={{ width: '100%', height: 250 }}>
              {chartData.statusList.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData.statusList} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                      {chartData.statusList.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} lớp`, 'Số lượng']} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  Chưa có dữ liệu
                </div>
              )}
            </div>
          </div>

          <div style={styles.chartBox}>
            <h4 style={{ margin: '0 0 12px 0', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1rem' }}>
              <BarChart2 size={18} color="#64748b" /> Môn có nhiều lớp nhất
            </h4>
            <div style={{ width: '100%', height: 250 }}>
              {chartData.subjectsList.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.subjectsList} margin={{ top: 10, right: 10, left: -20, bottom: 45 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11 }} interval={0} angle={-25} textAnchor="end" />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} formatter={(value) => [`${value} lớp`, 'Số lượng']} />
                    <Bar dataKey="count" name="Số lớp" fill="#106fa6" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  Chưa có dữ liệu
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Bộ lọc */}
      <FilterSection
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        metaData={metaData}
      />

      {/* Bảng dữ liệu */}
      <TestTable
        columns={columns}
        data={paginatedClasses}
        loading={loading}
        rowKey="class_id"
      />

      {classes.length > PAGE_SIZE && (
        <Pagination total={classes.length} pageSize={PAGE_SIZE} currentPage={currentPage} onChange={(p) => setCurrentPage(p)} />
      )}

      {isScheduleOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          overflowY: 'auto',
          padding: 24,
          background: 'rgba(15, 23, 42, 0.45)'
        }}>
          <div style={{
            width: '100%',
            maxWidth: 1440,
            margin: '0 auto',
            background: '#fff',
            borderRadius: 12,
            padding: 16,
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem' }}>
                  Xếp lịch tự động cho {selectedClasses.length} lớp đã chọn
                </h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.8rem' }}>
                  Hệ thống sẽ đề xuất lịch và phòng, sau đó lưu ClassSession và ClassSchedule.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleOpen(false)}
                style={{ ...styles.secondaryButton, width: 36, padding: 0 }}
                aria-label="Đóng xếp lịch"
              >
                <X size={18} />
              </button>
            </div>
            <AutoScheduleTab
              classes={selectedClasses}
              lecturers={metaData.lecturers}
              semesters={metaData.semesters}
              faculties={[]}
              showToast={showToast}
              onSuccess={() => {
                setIsScheduleOpen(false);
                fetchClasses();
              }}
            />
          </div>
        </div>
      )}

      {/* Modal tạo thủ công */}
      {isWizardOpen && (
        <CreateWizardModal
          onClose={() => setIsWizardOpen(false)}
          onSuccess={fetchClasses}
          semesters={modalSemesters}
          subjects={subjectOptions}
          lecturers={metaData.lecturers}
          adminClasses={metaData.adminClasses}
          rooms={rooms}
          showToast={showToast}
          defaultSemesterId={defaultWizardSemesterId}
        />
      )}
    </div>
  </div>
);
};

export default CreditClassesManagement;