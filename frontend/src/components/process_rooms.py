import re
import os

source_file = r'd:\test\HeThongDiemDanhBangKhuongMat\frontend\src\components\AIAttendance.jsx'
target_file = r'd:\test\HeThongDiemDanhBangKhuongMat\frontend\src\components\RoomsManagement.jsx'

with open(source_file, 'r', encoding='utf-8') as f:
    content = f.read()

jsx = """import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Edit, X, BookOpen } from 'lucide-react';

const styles = {
  btn: { padding: "8px 16px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem", color: "#fff", transition: "all 0.2s" },
  input: { padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.95rem", width: "100%", boxSizing: "border-box" },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", fontSize: "0.95rem" },
  th: { padding: "12px 15px", textAlign: "left", borderBottom: "2px solid #e2e8f0", color: "#475569", fontWeight: "600", whiteSpace: "nowrap" },
  td: { padding: "12px 15px", borderBottom: "1px solid #e2e8f0", verticalAlign: "middle" },
  label: { display: "block", marginBottom: "6px", color: "#334155", fontWeight: "600", fontSize: "0.9rem" },
  badge: { padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600" }
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

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async (search = classroomSearch) => {
    try {
      const url = `http://localhost:8000/api/admin/classrooms/?skip=0&limit=100${search ? `&search=${encodeURIComponent(search)}` : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        const data = result.items ? result.items : result;
        setClassroomsList(data || []);
      }
    } catch (err) {
      console.error('Lỗi tải phòng học:', err);
      showToast('Lỗi tải danh sách phòng học.', 'danger');
    }
  };

  const openClassroomModal = (room = null) => {
    if (room) {
      setEditingRoomId(room.room_id);
      setClassroomForm({
        campus: room.campus || 'CS Tăng Nhơn Phú',
        building: room.building || 'A',
        room_number: room.room_number || '',
        capacity: room.capacity || 50,
        room_type: room.room_type || 'Theory',
        camera_rtsp_url: room.camera_rtsp_url || '',
        camera_status: room.camera_status || 'Online',
        notes: room.notes || '',
        status: room.status || 'Active'
      });
    } else {
      setEditingRoomId(null);
      setClassroomForm({
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
    }
    setIsClassroomModalOpen(true);
  };

  const handleSaveClassroom = async (e) => {
    e.preventDefault();
    try {
      const isEdit = !!editingRoomId;
      const url = isEdit ? `http://localhost:8000/api/admin/classrooms/${editingRoomId}` : `http://localhost:8000/api/admin/classrooms/`;
      const method = isEdit ? 'PUT' : 'POST';
      
      const body = { ...classroomForm };

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        showToast(isEdit ? 'Cập nhật phòng học thành công!' : 'Thêm phòng học thành công!');
        setIsClassroomModalOpen(false);
        fetchClassrooms(classroomSearch);
      } else {
        const err = await res.json();
        showToast(err.detail || 'Lỗi lưu phòng học', 'danger');
      }
    } catch (err) {
      showToast('Lỗi kết nối API', 'danger');
    }
  };

  const handleDeleteClassroom = async (id) => {
    if (!window.confirm(`Bạn có chắc muốn xóa phòng ${id}?`)) return;
    try {
      const res = await fetch(`http://localhost:8000/api/admin/classrooms/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Đã xóa phòng học thành công!');
        fetchClassrooms(classroomSearch);
      } else {
        const err = await res.json();
        showToast(err.detail || 'Lỗi xóa phòng học', 'danger');
      }
    } catch (err) {
      showToast('Lỗi kết nối API', 'danger');
    }
  };

  const filtered = classroomsList.filter(r =>
    (r.room_id || '').toLowerCase().includes(classroomSearch.toLowerCase()) ||
    (r.room_name || '').toLowerCase().includes(classroomSearch.toLowerCase()) ||
    (r.building || '').toLowerCase().includes(classroomSearch.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff", padding: "15px", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <BookOpen size={24} color="#7c3aed" />
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>Quản lý Phòng học</h2>
        </div>
        <button style={{ ...styles.btn, background: "#7c3aed", display: "flex", alignItems: "center", gap: "5px" }} onClick={() => openClassroomModal()}>
          <BookOpen size={16} /> Thêm phòng học
        </button>
      </div>

      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", display: "flex", gap: "10px" }}>
          <input type="text" placeholder="Tìm theo mã phòng, tên phòng, tòa nhà..." style={{ ...styles.input, flex: 1 }}
            value={classroomSearch} onChange={(e) => { setClassroomSearch(e.target.value); fetchClassrooms(e.target.value); }} />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
            <thead style={{ background: "#f8fafc" }}>
              <tr>
                <th style={styles.th}>Mã phòng</th>
                <th style={styles.th}>Cơ sở</th>
                <th style={styles.th}>Tòa nhà</th>
                <th style={styles.th}>Tên phòng</th>
                <th style={styles.th}>Sức chứa</th>
                <th style={styles.th}>Loại phòng</th>
                <th style={styles.th}>Camera</th>
                <th style={styles.th}>Trạng thái</th>
                <th style={styles.th}>Lớp đang xếp lịch</th>
                <th style={styles.th}>Đang sử dụng</th>
                <th style={styles.th}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="11" style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>Không tìm thấy phòng học.</td></tr>
              ) : (
                filtered.map((r, idx) => (
                  <tr key={r.room_id} style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                    <td style={{ ...styles.td, fontWeight: "600", color: "#0f172a" }}>{r.room_id}</td>
                    <td style={styles.td}>{r.campus || '—'}</td>
                    <td style={styles.td}>{r.building || '—'}</td>
                    <td style={{ ...styles.td, fontWeight: "600" }}>{r.room_name}</td>
                    <td style={styles.td}>{r.capacity}</td>
                    <td style={styles.td}>
                      <span style={{ background: r.room_type === 'Lab' ? '#ede9fe' : '#e0f2fe', color: r.room_type === 'Lab' ? '#5b21b6' : '#0369a1', padding: "2px 8px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: "600" }}>
                        {r.room_type}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ color: r.camera_status === 'Online' ? '#16a34a' : (r.camera_status === 'Defective' ? '#ea580c' : '#dc2626'), fontWeight: "600" }}>
                        {r.camera_status === 'Online' ? '● Online' : (r.camera_status === 'Defective' ? '● Lỗi' : '● Offline')}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ background: r.status === 'Active' ? '#dcfce7' : '#fef08a', color: r.status === 'Active' ? '#166534' : '#854d0e', padding: "2px 8px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: "600" }}>
                        {r.status === 'Active' ? 'Sẵn sàng' : 'Bảo trì'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {r.scheduled_classes && r.scheduled_classes.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {r.scheduled_classes.map(c => (
                            <span key={c} style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>{c}</span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Không có</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {r.is_occupied ? (
                        <span style={{ color: '#dc2626', fontWeight: '600' }}>Có lớp học</span>
                      ) : (
                        <span style={{ color: '#16a34a', fontWeight: '600' }}>Trống</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: "flex", gap: "5px" }}>
                        <button onClick={() => openClassroomModal(r)} style={{ padding: "4px 8px", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "6px", cursor: "pointer", color: "#92400e", fontSize: "0.75rem" }}>Sửa</button>
                        <button onClick={() => handleDeleteClassroom(r.room_id)} style={{ padding: "4px 8px", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: "6px", cursor: "pointer", color: "#991b1b", fontSize: "0.75rem" }}>Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isClassroomModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: "12px", width: "500px", maxWidth: "95%", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", overflow: "hidden" }}>
            <div style={{ padding: "20px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.25rem" }}>{editingRoomId ? 'Sửa thông tin' : 'Thêm'} Phòng học</h3>
              <button onClick={() => setIsClassroomModalOpen(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b" }}><X size={20} /></button>
            </div>
            <div style={{ padding: "20px" }}>
              <form onSubmit={handleSaveClassroom} style={{ display: "grid", gap: "15px" }}>
                <div>
                  <label style={styles.label}>Cơ sở *</label>
                  <select required style={styles.input} value={classroomForm.campus} onChange={e => setClassroomForm({...classroomForm, campus: e.target.value})}>
                    <option value="CS Tăng Nhơn Phú">CS Tăng Nhơn Phú</option>
                    <option value="CS Quận 1">CS Quận 1</option>
                  </select>
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
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

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={styles.label}>Sức chứa</label>
                    <input type="number" style={styles.input} value={classroomForm.capacity} onChange={e => setClassroomForm({...classroomForm, capacity: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label style={styles.label}>Loại phòng</label>
                    <select style={styles.input} value={classroomForm.room_type} onChange={e => setClassroomForm({...classroomForm, room_type: e.target.value})}>
                      <option value="Theory">Lý thuyết</option>
                      <option value="Computer_Lab">Thực hành Máy tính</option>
                      <option value="Specialized_Lab">Thực hành Chuyên ngành</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={styles.label}>Trạng thái</label>
                  <select style={styles.input} value={classroomForm.status} onChange={e => setClassroomForm({...classroomForm, status: e.target.value})}>
                    <option value="Active">Đang hoạt động</option>
                    <option value="Maintenance">Bảo trì</option>
                  </select>
                </div>
                
                <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "10px", marginTop: "5px" }}>
                  <label style={styles.label}>Trạng thái Camera</label>
                  <select style={styles.input} value={classroomForm.camera_status} onChange={e => setClassroomForm({...classroomForm, camera_status: e.target.value})}>
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                    <option value="Defective">Bị hỏng</option>
                  </select>
                </div>
                
                <div>
                  <label style={styles.label}>RTSP URL (Luồng Camera)</label>
                  <input style={styles.input} placeholder="rtsp://..." value={classroomForm.camera_rtsp_url} onChange={e => setClassroomForm({...classroomForm, camera_rtsp_url: e.target.value})} />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                  <button type="button" style={{ ...styles.btn, background: "#94a3b8" }} onClick={() => setIsClassroomModalOpen(false)}>Hủy</button>
                  <button type="submit" style={{ ...styles.btn, background: "#7c3aed" }}>Lưu phòng học</button>
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
"""

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(jsx)

# We should use re to sub the state out.
states_to_remove = [
    r"const \[classroomsList, setClassroomsList\] = useState\(\[\]\);\n\s*",
    r"const \[classroomSearch, setClassroomSearch\] = useState\(''\);\n\s*",
    r"const \[isClassroomModalOpen, setIsClassroomModalOpen\] = useState\(false\);\n\s*",
    r"const \[editingRoomId, setEditingRoomId\] = useState\(null\);\n\s*",
    r"const \[classroomForm, setClassroomForm\] = useState\(\{.*?\}\);\n\s*"
]

for pattern in states_to_remove:
    content = re.sub(pattern, "", content, flags=re.DOTALL)

# Functions to remove
functions_to_remove = [
    r"const fetchClassrooms = async \(.*?\) => \{(.*?)\};\n\s*",
    r"const openClassroomModal = \(.*?\) => \{(.*?)\};\n\s*",
    r"const handleSaveClassroom = async \(e\) => \{(.*?)\};\n\s*",
    r"const handleDeleteClassroom = async \(id\) => \{(.*?)\};\n\s*",
    r"const renderRoomsManagementTab = \(\) => \{(.*?\n  \};)\n\s*"
]

for pattern in functions_to_remove:
    content = re.sub(pattern, "", content, flags=re.DOTALL)

# Remove fetchClassrooms from activeTab
content = re.sub(r"\} else if \(activeTab === 'rooms_management'\) \{\n\s*fetchClassrooms\(\);", "} else if (activeTab === 'rooms_management') {\n      // fetch handled inside RoomsManagement component", content)

# Replace {activeTab === 'rooms_management' && renderRoomsManagementTab()}
content = re.sub(r"\{activeTab === 'rooms_management' && renderRoomsManagementTab\(\)\}", "{activeTab === 'rooms_management' && <RoomsManagement showToast={showToast} />}", content)

# Also need to import RoomsManagement at the top
if "import RoomsManagement" not in content:
    content = content.replace("import LecturersManagement from './LecturersManagement';", "import LecturersManagement from './LecturersManagement';\nimport RoomsManagement from './RoomsManagement';")

with open(source_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done extracting RoomsManagement")
