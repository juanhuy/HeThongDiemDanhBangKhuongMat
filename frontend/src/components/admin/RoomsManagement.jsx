import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Plus, Trash2, Edit, X, BookOpen, Upload, Activity, Video, CheckCircle, AlertTriangle, Eye, PieChart as PieChartIcon, BarChart2 } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const styles = {
  btn: { padding: "8px 16px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem", color: "#fff", transition: "all 0.2s" },
  input: { padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.95rem", width: "100%", boxSizing: "border-box" },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", fontSize: "0.95rem" },
  th: { padding: "12px 15px", textAlign: "left", borderBottom: "2px solid #e2e8f0", color: "#475569", fontWeight: "600", whiteSpace: "nowrap" },
  td: { padding: "12px 15px", borderBottom: "1px solid #e2e8f0", verticalAlign: "middle" },
  label: { display: "block", marginBottom: "6px", color: "#334155", fontWeight: "600", fontSize: "0.9rem" },
  badge: { padding: "4px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" },
  statCard: { background: "#fff", padding: "15px 20px", borderRadius: "12px", border: "1px solid #e2e8f0", flex: 1, minWidth: "200px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  statValue: { fontSize: "1.8rem", fontWeight: "700", color: "#0f172a", margin: "8px 0 2px 0" },
  statTitle: { color: "#64748b", fontSize: "0.9rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" },
  chartBox: { background: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column" }
};

// Bảng màu cho biểu đồ
const COLORS = {
  online: '#10b981', // Xanh lá
  offline: '#94a3b8', // Xám
  defective: '#f43f5e', // Đỏ hồng
  theory: '#3b82f6', // Xanh dương
  lab: '#8b5cf6' // Tím
};

const RoomsManagement = ({ showToast }) => {
  const [classroomsList, setClassroomsList] = useState([]);
  const [classroomSearch, setClassroomSearch] = useState('');
  const [isClassroomModalOpen, setIsClassroomModalOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState(null);
  
  const [classroomForm, setClassroomForm] = useState({
    campus: 'CS Tăng Nhơn Phú',
    building: 'A',
    room_number: '',
    capacity: 50,
    room_type: 'Theory',
    camera_rtsp_url: '',
    camera_status: 'Online',
    notes: '',
    status: 'Active'
  });

  const fileInputRef = useRef(null);

  // --- DỮ LIỆU THỐNG KÊ (KPIs) ---
  const stats = useMemo(() => {
    return {
      total: classroomsList.length,
      active: classroomsList.filter(r => r.status === 'Active').length,
      cameraOnline: classroomsList.filter(r => r.camera_status === 'Online').length,
      occupied: classroomsList.filter(r => r.is_occupied).length,
    };
  }, [classroomsList]);

  // --- DỮ LIỆU BIỂU ĐỒ (CHARTS) ---
  const chartData = useMemo(() => {
    // 1. Dữ liệu biểu đồ Camera (Donut Chart)
    const cameraCounts = { Online: 0, Offline: 0, Defective: 0 };
    // 2. Dữ liệu phân bố phòng theo Tòa nhà & Loại (Bar Chart)
    const buildingMap = {};

    classroomsList.forEach(r => {
      // Đếm camera
      if (r.camera_status) cameraCounts[r.camera_status] = (cameraCounts[r.camera_status] || 0) + 1;
      
      // Phân nhóm tòa nhà
      const bName = r.building ? `Tòa ${r.building}` : 'Khác';
      if (!buildingMap[bName]) buildingMap[bName] = { name: bName, theory: 0, lab: 0 };
      
      if (r.room_type === 'Theory') buildingMap[bName].theory += 1;
      else buildingMap[bName].lab += 1;
    });

    return {
      camera: [
        { name: 'Online', value: cameraCounts.Online, color: COLORS.online },
        { name: 'Mất kết nối', value: cameraCounts.Offline, color: COLORS.offline },
        { name: 'Bị hỏng', value: cameraCounts.Defective, color: COLORS.defective }
      ].filter(d => d.value > 0),
      building: Object.values(buildingMap).sort((a, b) => a.name.localeCompare(b.name))
    };
  }, [classroomsList]);

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      showToast?.('Đang import dữ liệu...', 'info');
      const res = await fetch('http://localhost:8000/api/admin/classrooms/import', { method: 'POST', body: formData });
      const result = await res.json();
      if (res.ok) {
        showToast?.(`Import thành công ${result.success_count} dòng. Lỗi ${result.error_count} dòng.`);
        fetchClassrooms();
      } else {
        showToast?.(result.detail || 'Lỗi khi import', 'danger');
      }
    } catch (err) {
      showToast?.('Lỗi kết nối API', 'danger');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => { fetchClassrooms(); }, []);

  const fetchClassrooms = async (search = classroomSearch) => {
    try {
      const url = `http://localhost:8000/api/admin/classrooms/?skip=0&limit=100${search ? `&search=${encodeURIComponent(search)}` : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        setClassroomsList(result.items ? result.items : result || []);
      }
    } catch (err) {
      showToast?.('Lỗi tải danh sách phòng học.', 'danger');
    }
  };

  const openClassroomModal = (room = null) => {
    if (room) {
      setEditingRoomId(room.room_id);
      setClassroomForm({ ...room, status: room.status || 'Active', camera_status: room.camera_status || 'Online' });
    } else {
      setEditingRoomId(null);
      setClassroomForm({ campus: 'CS Tăng Nhơn Phú', building: 'A', room_number: '', capacity: 50, room_type: 'Theory', camera_rtsp_url: '', camera_status: 'Online', notes: '', status: 'Active' });
    }
    setIsClassroomModalOpen(true);
  };

  const handleSaveClassroom = async (e) => {
    e.preventDefault();
    try {
      const isEdit = !!editingRoomId;
      const url = isEdit ? `http://localhost:8000/api/admin/classrooms/${editingRoomId}` : `http://localhost:8000/api/admin/classrooms/`;
      const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(classroomForm) });
      if (res.ok) {
        showToast?.(isEdit ? 'Cập nhật phòng học thành công!' : 'Thêm phòng học thành công!');
        setIsClassroomModalOpen(false);
        fetchClassrooms(classroomSearch);
      } else {
        const err = await res.json();
        showToast?.(err.detail || 'Lỗi lưu phòng học', 'danger');
      }
    } catch (err) { showToast?.('Lỗi kết nối API', 'danger'); }
  };

  const handleDeleteClassroom = async (id) => {
    if (!window.confirm(`Bạn có chắc muốn xóa phòng ${id}?`)) return;
    try {
      const res = await fetch(`http://localhost:8000/api/admin/classrooms/${id}`, { method: 'DELETE' });
      if (res.ok) { showToast?.('Đã xóa thành công!'); fetchClassrooms(classroomSearch); } 
      else { const err = await res.json(); showToast?.(err.detail, 'danger'); }
    } catch (err) { showToast?.('Lỗi kết nối API', 'danger'); }
  };

  const filtered = classroomsList.filter(r =>
    (r.room_id || '').toLowerCase().includes(classroomSearch.toLowerCase()) ||
    (r.room_name || '').toLowerCase().includes(classroomSearch.toLowerCase()) ||
    (r.building || '').toLowerCase().includes(classroomSearch.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {/* 1. HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff", padding: "15px 20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <BookOpen size={26} color="#7c3aed" />
          <h2 style={{ fontSize: "1.3rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>Quản lý & Thống kê Phòng học</h2>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImport} style={{ display: 'none' }} />
          <button style={{ ...styles.btn, background: "#10b981", display: "flex", alignItems: "center", gap: "6px" }} onClick={() => fileInputRef.current?.click()}>
            <Upload size={18} /> Import CSV
          </button>
          <button style={{ ...styles.btn, background: "#7c3aed", display: "flex", alignItems: "center", gap: "6px" }} onClick={() => openClassroomModal()}>
            <Plus size={18} /> Thêm phòng
          </button>
        </div>
      </div>

      {/* 2. THẺ KPI (TOP CARDS) */}
      <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
        <div style={styles.statCard}>
          <div style={styles.statTitle}><BookOpen size={18} color="#3b82f6"/> Tổng số phòng</div>
          <div style={styles.statValue}>{stats.total}</div>
          <div style={{color: "#64748b", fontSize: "0.85rem"}}>Toàn bộ cơ sở</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statTitle}><CheckCircle size={18} color="#10b981"/> Phòng khả dụng (Active)</div>
          <div style={styles.statValue}>{stats.active} <span style={{fontSize:"1rem", color:"#94a3b8", fontWeight:"normal"}}>/ {stats.total}</span></div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statTitle}><Video size={18} color="#8b5cf6"/> Camera Online</div>
          <div style={styles.statValue}>{stats.cameraOnline} <span style={{fontSize:"1rem", color:"#94a3b8", fontWeight:"normal"}}>/ {stats.total}</span></div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statTitle}><Activity size={18} color="#f59e0b"/> Đang sử dụng (Occupied)</div>
          <div style={styles.statValue}>{stats.occupied} <span style={{fontSize:"1rem", color:"#94a3b8", fontWeight:"normal"}}>phòng</span></div>
        </div>
      </div>

      {/* 3. BIỂU ĐỒ TRỰC QUAN (CHARTS DASHBOARD) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px" }}>
        
        {/* Biểu đồ Tròn: Tình trạng Camera */}
        <div style={styles.chartBox}>
          <h4 style={{ margin: "0 0 15px 0", color: "#334155", display: "flex", alignItems: "center", gap: "6px", fontSize: "1.05rem" }}>
            <PieChartIcon size={18} color="#64748b"/> Tình trạng Camera AI
          </h4>
          <div style={{ width: "100%", height: "220px" }}>
            {chartData.camera.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData.camera} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                    {chartData.camera.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} phòng`, 'Số lượng']} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}/>
                  <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{height: "100%", display: "flex", alignItems: "center", justifyContext: "center", color: "#94a3b8"}}>Chưa có dữ liệu</div>
            )}
          </div>
        </div>

        {/* Biểu đồ Cột: Phân bổ phòng theo Tòa nhà */}
        <div style={styles.chartBox}>
          <h4 style={{ margin: "0 0 15px 0", color: "#334155", display: "flex", alignItems: "center", gap: "6px", fontSize: "1.05rem" }}>
            <BarChart2 size={18} color="#64748b"/> Phân bổ Cơ sở vật chất
          </h4>
          <div style={{ width: "100%", height: "220px" }}>
            {chartData.building.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.building} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 13}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 13}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: "10px" }} />
                  <Bar dataKey="theory" name="Phòng Lý thuyết" stackId="a" fill={COLORS.theory} radius={[0, 0, 4, 4]} barSize={40} />
                  <Bar dataKey="lab" name="Phòng Thực hành" stackId="a" fill={COLORS.lab} radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{height: "100%", display: "flex", alignItems: "center", justifyContext: "center", color: "#94a3b8"}}>Chưa có dữ liệu</div>
            )}
          </div>
        </div>
      </div>

      {/* 4. DANH SÁCH BẢNG (DATA TABLE) */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ padding: "15px 20px", borderBottom: "1px solid #e2e8f0", background:"#f8fafc" }}>
          <div style={{position: "relative", maxWidth: "400px"}}>
            <Search size={18} color="#94a3b8" style={{position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)"}}/>
            <input type="text" placeholder="Tìm kiếm phòng học, tòa nhà..." style={{ ...styles.input, paddingLeft: "36px" }}
              value={classroomSearch} onChange={(e) => { setClassroomSearch(e.target.value); fetchClassrooms(e.target.value); }} />
          </div>
        </div>
        
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Phòng học</th>
                <th style={styles.th}>Vị trí</th>
                <th style={styles.th}>Phân loại</th>
                <th style={styles.th}>Sức chứa</th>
                <th style={styles.th}>Trạng thái (Phòng & Camera)</th>
                <th style={styles.th}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>Không có dữ liệu phù hợp.</td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.room_id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#f8fafc"} onMouseOut={e => e.currentTarget.style.background = "#fff"}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: "700", color: "#0f172a" }}>{r.room_name || r.room_id}</div>
                      <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Mã: {r.room_id}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: "600", color: "#334155" }}>Tòa {r.building || '—'}</div>
                      <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{r.campus || '—'}</div>
                    </td>
                    <td style={styles.td}>
                      <span style={{ background: r.room_type === 'Lab' || r.room_type === 'Computer_Lab' ? '#ede9fe' : '#e0f2fe', color: r.room_type === 'Lab' || r.room_type === 'Computer_Lab' ? '#5b21b6' : '#0369a1', padding: "4px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600" }}>
                        {r.room_type === 'Theory' ? 'Lý thuyết' : 'Thực hành'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: "600", color: "#334155" }}>{r.capacity} <span style={{fontSize: "0.8rem", color: "#94a3b8", fontWeight: "normal"}}>chỗ</span></div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-start" }}>
                        {r.status === 'Active' ? 
                          <span style={{...styles.badge, background: '#dcfce7', color: '#166534'}}><CheckCircle size={12}/> Sẵn sàng</span> : 
                          <span style={{...styles.badge, background: '#fef08a', color: '#854d0e'}}><AlertTriangle size={12}/> Bảo trì</span>}
                        {r.camera_status === 'Online' ? 
                          <span style={{...styles.badge, background: '#f0fdf4', color: '#16a34a', border: "1px solid #bbf7d0"}}><Video size={12}/> Cam Online</span> : 
                          <span style={{...styles.badge, background: '#fef2f2', color: '#dc2626', border: "1px solid #fecaca"}}><Video size={12}/> Cam {r.camera_status === 'Defective' ? 'Lỗi' : 'Offline'}</span>}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={() => openClassroomModal(r)} style={{ padding: "6px 12px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "8px", cursor: "pointer", color: "#334155", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px", fontWeight: "600" }}>
                          <Eye size={14}/> Chi tiết
                        </button>
                        <button onClick={() => handleDeleteClassroom(r.room_id)} style={{ padding: "6px 10px", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: "8px", cursor: "pointer", color: "#991b1b", display: "flex", alignItems: "center" }}><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL CHI TIẾT & CẬP NHẬT */}
      {isClassroomModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }}>
          <div style={{ background: "#fff", borderRadius: "16px", width: "600px", maxWidth: "95%", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
            
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.25rem" }}>{editingRoomId ? 'Chi tiết & Cập nhật Phòng học' : 'Thêm Phòng học mới'}</h3>
                {editingRoomId && <p style={{margin: "4px 0 0 0", color: "#64748b", fontSize: "0.85rem"}}>Mã hệ thống: {editingRoomId}</p>}
              </div>
              <button onClick={() => setIsClassroomModalOpen(false)} style={{ background: "#e2e8f0", border: "none", cursor: "pointer", color: "#475569", padding: "6px", borderRadius: "50%", display: "flex" }}><X size={20} /></button>
            </div>

            <div style={{ padding: "24px", overflowY: "auto" }}>
              <form onSubmit={handleSaveClassroom} style={{ display: "grid", gap: "20px" }}>
                
                <div>
                  <h4 style={{ margin: "0 0 12px 0", color: "#334155", display: "flex", alignItems: "center", gap: "6px", borderBottom: "2px solid #f1f5f9", paddingBottom: "8px" }}><BookOpen size={16}/> Thông tin cơ bản</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                    <div>
                      <label style={styles.label}>Cơ sở *</label>
                      <select required style={styles.input} value={classroomForm.campus} onChange={e => setClassroomForm({...classroomForm, campus: e.target.value})}>
                        <option value="CS Tăng Nhơn Phú">CS Tăng Nhơn Phú</option>
                        <option value="CS Quận 1">CS Quận 1</option>
                      </select>
                    </div>
                    <div>
                      <label style={styles.label}>Trạng thái hoạt động</label>
                      <select style={styles.input} value={classroomForm.status} onChange={e => setClassroomForm({...classroomForm, status: e.target.value})}>
                        <option value="Active">Đang hoạt động (Sẵn sàng)</option>
                        <option value="Maintenance">Bảo trì (Tạm khóa)</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                    <div>
                      <label style={styles.label}>Tòa nhà *</label>
                      <select required style={styles.input} value={classroomForm.building} onChange={e => setClassroomForm({...classroomForm, building: e.target.value})}>
                        <option value="A">Tòa nhà A</option>
                        <option value="B">Tòa nhà B</option>
                        <option value="Trung tâm">Trung tâm</option>
                      </select>
                    </div>
                    <div>
                      <label style={styles.label}>Số phòng *</label>
                      <input required style={styles.input} placeholder="VD: 101" value={classroomForm.room_number} onChange={e => setClassroomForm({...classroomForm, room_number: e.target.value})} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                    <div>
                      <label style={styles.label}>Sức chứa (Người)</label>
                      <input type="number" style={styles.input} value={classroomForm.capacity} onChange={e => setClassroomForm({...classroomForm, capacity: parseInt(e.target.value) || 0})} />
                    </div>
                    <div>
                      <label style={styles.label}>Phân loại phòng</label>
                      <select style={styles.input} value={classroomForm.room_type} onChange={e => setClassroomForm({...classroomForm, room_type: e.target.value})}>
                        <option value="Theory">Lý thuyết</option>
                        <option value="Computer_Lab">Thực hành Máy tính</option>
                        <option value="Specialized_Lab">Thực hành Chuyên ngành</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 style={{ margin: "0 0 12px 0", color: "#334155", display: "flex", alignItems: "center", gap: "6px", borderBottom: "2px solid #f1f5f9", paddingBottom: "8px" }}><Video size={16}/> Thông tin Thiết bị & Camera</h4>
                  <div style={{ marginBottom: "15px" }}>
                    <label style={styles.label}>Trạng thái kết nối Camera</label>
                    <select style={styles.input} value={classroomForm.camera_status} onChange={e => setClassroomForm({...classroomForm, camera_status: e.target.value})}>
                      <option value="Online">🟢 Online (Hoạt động tốt)</option>
                      <option value="Offline">⚫ Offline (Mất kết nối)</option>
                      <option value="Defective">🟠 Bị hỏng (Cần sửa chữa)</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: "15px" }}>
                    <label style={styles.label}>RTSP URL (Luồng video AI)</label>
                    <input style={styles.input} placeholder="rtsp://admin:pass@192.168.1.xxx..." value={classroomForm.camera_rtsp_url} onChange={e => setClassroomForm({...classroomForm, camera_rtsp_url: e.target.value})} />
                  </div>
                  <div>
                    <label style={styles.label}>Ghi chú thêm</label>
                    <textarea style={{...styles.input, minHeight: "80px", resize: "vertical"}} placeholder="Ghi chú về tình trạng thiết bị..." value={classroomForm.notes} onChange={e => setClassroomForm({...classroomForm, notes: e.target.value})}></textarea>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "10px", paddingTop: "15px", borderTop: "1px solid #e2e8f0" }}>
                  <button type="button" style={{ ...styles.btn, background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1" }} onClick={() => setIsClassroomModalOpen(false)}>Đóng</button>
                  <button type="submit" style={{ ...styles.btn, background: "#7c3aed", display: "flex", alignItems: "center", gap: "6px" }}><CheckCircle size={16}/> {editingRoomId ? 'Lưu thay đổi' : 'Tạo phòng học'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomsManagement;