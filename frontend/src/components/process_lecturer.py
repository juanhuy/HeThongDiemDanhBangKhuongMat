import re
import os

source_file = r'd:\test\HeThongDiemDanhBangKhuongMat\frontend\src\components\AIAttendance.jsx'
target_file = r'd:\test\HeThongDiemDanhBangKhuongMat\frontend\src\components\LecturersManagement.jsx'

with open(source_file, 'r', encoding='utf-8') as f:
    content = f.read()

# I will just write a React component from scratch and use the code from AIAttendance
# but modifying it for dropdowns and correct faculty_name display

jsx = """import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Edit, X, Users, UserPlus } from 'lucide-react';
import axios from 'axios';

const styles = {
  btn: { padding: "8px 16px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem", color: "#fff", transition: "all 0.2s" },
  input: { padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.95rem", width: "100%", boxSizing: "border-box" },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", fontSize: "0.95rem" },
  th: { padding: "12px 15px", textAlign: "left", borderBottom: "2px solid #e2e8f0", color: "#475569", fontWeight: "600", whiteSpace: "nowrap" },
  td: { padding: "12px 15px", borderBottom: "1px solid #e2e8f0", verticalAlign: "middle" },
  label: { display: "block", marginBottom: "6px", color: "#334155", fontWeight: "600", fontSize: "0.9rem" },
  badge: { padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600" }
};

const LecturersManagement = ({ facultiesList, setError, setSuccess }) => {
  const [allLecturersList, setAllLecturersList] = useState([]);
  const [lecturerSearch, setLecturerSearch] = useState('');
  const [isLecturerModalOpen, setIsLecturerModalOpen] = useState(false);
  const [isLecturerDetailModalOpen, setIsLecturerDetailModalOpen] = useState(false);
  const [editingLecturerId, setEditingLecturerId] = useState(null);
  const [selectedLecturerDetail, setSelectedLecturerDetail] = useState(null);
  
  const [lecturerForm, setLecturerForm] = useState({
    lecturer_id: '',
    full_name: '',
    email: '',
    phone_number: '',
    date_of_birth: '',
    gender: '',
    citizen_id: '',
    ethnicity: '',
    religion: '',
    nationality: 'Việt Nam',
    address: '',
    place_of_birth: '',
    faculty_id: '',
    academic_title: '',
    position: 'Giảng viên',
    employment_type: '',
    teaching_status: 'Active'
  });

  useEffect(() => {
    fetchAllLecturers();
  }, []);

  const fetchAllLecturers = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/admin/lecturers/');
      if (response.data) {
        const data = response.data.items ? response.data.items : response.data;
        setAllLecturersList(data || []);
      }
    } catch (err) {
      console.error('Lỗi tải giảng viên:', err);
      setError('Lỗi khi tải danh sách giảng viên.');
    }
  };

  const generateLecturerId = (list = allLecturersList) => {
    const currentYear = new Date().getFullYear();
    const prefix = `GV${currentYear}`;
    const numbers = list
      .map((item) => item?.lecturer_id || '')
      .filter((value) => value.startsWith(prefix))
      .map((value) => parseInt(value.replace(prefix, ''), 10))
      .filter((num) => !isNaN(num));

    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNumber = maxNumber + 1;
    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  };

  const openLecturerModal = (lecturer = null) => {
    if (lecturer) {
      setEditingLecturerId(lecturer.lecturer_id);
      setLecturerForm({
        lecturer_id: lecturer.lecturer_id,
        full_name: lecturer.full_name || '',
        email: lecturer.email || '',
        phone_number: lecturer.phone_number || '',
        date_of_birth: lecturer.date_of_birth || '',
        gender: lecturer.gender || '',
        citizen_id: lecturer.citizen_id || '',
        ethnicity: lecturer.ethnicity || '',
        religion: lecturer.religion || '',
        nationality: lecturer.nationality || 'Việt Nam',
        address: lecturer.address || '',
        place_of_birth: lecturer.place_of_birth || '',
        faculty_id: lecturer.faculty_id || '',
        academic_title: lecturer.academic_title || '',
        position: lecturer.position || 'Giảng viên',
        employment_type: lecturer.employment_type || '',
        teaching_status: lecturer.teaching_status || 'Active'
      });
    } else {
      setEditingLecturerId(null);
      setLecturerForm({
        lecturer_id: generateLecturerId(),
        full_name: '',
        email: '',
        phone_number: '',
        date_of_birth: '',
        gender: '',
        citizen_id: '',
        ethnicity: '',
        religion: '',
        nationality: 'Việt Nam',
        address: '',
        place_of_birth: '',
        faculty_id: '',
        academic_title: '',
        position: 'Giảng viên',
        employment_type: '',
        teaching_status: 'Active'
      });
    }
    setIsLecturerModalOpen(true);
  };

  const handleSaveLecturer = async (e) => {
    e.preventDefault();
    try {
      if (editingLecturerId) {
        await axios.put(`http://localhost:8000/api/admin/lecturers/${editingLecturerId}`, lecturerForm);
        setSuccess('Đã cập nhật giảng viên!');
      } else {
        await axios.post('http://localhost:8000/api/admin/lecturers/', lecturerForm);
        setSuccess('Đã thêm giảng viên!');
      }
      setIsLecturerModalOpen(false);
      fetchAllLecturers();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Có lỗi xảy ra');
    }
  };

  const handleDeleteLecturer = async (id) => {
    if (!window.confirm(`Bạn có chắc muốn xóa giảng viên ${id}?`)) return;
    try {
      await axios.delete(`http://localhost:8000/api/admin/lecturers/${id}`);
      setSuccess('Đã xóa giảng viên!');
      fetchAllLecturers();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Lỗi khi xóa');
    }
  };

  const filtered = allLecturersList.filter(l =>
    (l.lecturer_id || '').toLowerCase().includes(lecturerSearch.toLowerCase()) ||
    (l.full_name || '').toLowerCase().includes(lecturerSearch.toLowerCase()) ||
    (l.faculty?.faculty_name || l.faculty_id || '').toLowerCase().includes(lecturerSearch.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff", padding: "15px", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Users size={24} color="#0f766e" />
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>Quản lý Giảng viên</h2>
        </div>
        <button style={{ ...styles.btn, background: "#0f766e", display: "flex", alignItems: "center", gap: "5px" }} onClick={() => openLecturerModal()}>
          <UserPlus size={16} /> Thêm giảng viên
        </button>
      </div>

      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ padding: "15px", borderBottom: "1px solid #e2e8f0", display: "flex", gap: "10px" }}>
          <input type="text" placeholder="Tìm kiếm theo mã GV, họ tên, khoa..." style={{ ...styles.input, flex: 1 }}
            value={lecturerSearch} onChange={(e) => setLecturerSearch(e.target.value)} />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead style={{ background: "#f8fafc" }}>
              <tr>
                <th style={styles.th}>Mã GV</th>
                <th style={styles.th}>Họ và Tên</th>
                <th style={styles.th}>Khoa / Bộ môn</th>
                <th style={styles.th}>SĐT / Email</th>
                <th style={styles.th}>Trạng thái</th>
                <th style={styles.th}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>Không có dữ liệu</td></tr>
              ) : (
                filtered.map(l => (
                  <tr key={l.lecturer_id} style={{ transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#f1f5f9"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ ...styles.td, fontWeight: "600", color: "#0f766e" }}>{l.lecturer_id}</td>
                    <td style={{ ...styles.td, color: "#1e293b", fontWeight: "500" }}>{l.full_name}</td>
                    {/* Hien thi ten khoa thay vi ma khoa */}
                    <td style={{ ...styles.td, color: "#64748b" }}>{l.faculty ? l.faculty.faculty_name : (l.faculty_id || 'N/A')}</td>
                    <td style={{ ...styles.td, color: "#64748b" }}>
                      <div>{l.phone_number || 'N/A'}</div>
                      <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{l.email || 'N/A'}</div>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, background: l.teaching_status === 'Active' ? "#dcfce7" : "#f1f5f9", color: l.teaching_status === 'Active' ? "#166534" : "#64748b" }}>
                        {l.teaching_status === 'Active' ? 'Đang dạy' : 'Ngừng dạy'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: "flex", gap: "5px" }}>
                        <button onClick={() => { setSelectedLecturerDetail(l); setIsLecturerDetailModalOpen(true); }} style={{ padding: "4px 8px", background: "#e0f2fe", border: "1px solid #bae6fd", borderRadius: "6px", cursor: "pointer", color: "#0369a1", fontSize: "0.75rem" }}>Xem</button>
                        <button onClick={() => openLecturerModal(l)} style={{ padding: "4px 8px", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "6px", cursor: "pointer", color: "#92400e", fontSize: "0.75rem" }}>Sửa</button>
                        <button onClick={() => handleDeleteLecturer(l.lecturer_id)} style={{ padding: "4px 8px", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: "6px", cursor: "pointer", color: "#991b1b", fontSize: "0.75rem" }}>Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isLecturerDetailModalOpen && selectedLecturerDetail && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: "12px", width: "620px", maxWidth: "95%", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", overflow: "hidden" }}>
            <div style={{ padding: "20px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.1rem" }}>Chi tiết giảng viên</h3>
              <button onClick={() => setIsLecturerDetailModalOpen(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b" }}><X size={20} /></button>
            </div>
            <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ gridColumn: "span 2", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px" }}>
                <div style={{ fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>Thông tin tài khoản</div>
                <div><strong>Tên đăng nhập:</strong> {(selectedLecturerDetail.lecturer_id || '').toLowerCase()}</div>
                <div><strong>Vai trò:</strong> giang_vien</div>
                <div><strong>Mật khẩu mặc định:</strong> 123456</div>
              </div>
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px" }}>
                <div style={{ fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>Hồ sơ nhân thân</div>
                <div><strong>Mã GV:</strong> {selectedLecturerDetail.lecturer_id}</div>
                <div><strong>Họ tên:</strong> {selectedLecturerDetail.full_name || '—'}</div>
                <div><strong>Ngày sinh:</strong> {selectedLecturerDetail.date_of_birth || '—'}</div>
                <div><strong>Giới tính:</strong> {selectedLecturerDetail.gender || '—'}</div>
                <div><strong>CCCD:</strong> {selectedLecturerDetail.citizen_id || '—'}</div>
                <div><strong>Dân tộc:</strong> {selectedLecturerDetail.ethnicity || '—'}</div>
                <div><strong>Tôn giáo:</strong> {selectedLecturerDetail.religion || '—'}</div>
                <div><strong>Quốc tịch:</strong> {selectedLecturerDetail.nationality || '—'}</div>
                <div><strong>Nơi sinh:</strong> {selectedLecturerDetail.place_of_birth || '—'}</div>
                <div><strong>Địa chỉ:</strong> {selectedLecturerDetail.address || '—'}</div>
                <div><strong>Email:</strong> {selectedLecturerDetail.email || '—'}</div>
                <div><strong>Số điện thoại:</strong> {selectedLecturerDetail.phone_number || '—'}</div>
              </div>
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px" }}>
                <div style={{ fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>Thông tin công tác</div>
                <div><strong>Khoa/Bộ môn:</strong> {selectedLecturerDetail.faculty ? selectedLecturerDetail.faculty.faculty_name : (selectedLecturerDetail.faculty_id || '—')}</div>
                <div><strong>Học hàm/Học vị:</strong> {selectedLecturerDetail.academic_title || '—'}</div>
                <div><strong>Chức vụ:</strong> {selectedLecturerDetail.position || '—'}</div>
                <div><strong>Loại hợp đồng:</strong> {selectedLecturerDetail.employment_type || '—'}</div>
                <div><strong>Trạng thái:</strong> {selectedLecturerDetail.teaching_status || '—'}</div>
                <div><strong>Ngày tuyển dụng:</strong> {selectedLecturerDetail.hire_date || '—'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLecturerModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: "12px", width: "600px", maxWidth: "95%", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "20px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.25rem" }}>{editingLecturerId ? 'Sửa thông tin' : 'Thêm'} Giảng viên</h3>
              <button onClick={() => setIsLecturerModalOpen(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b" }}><X size={20} /></button>
            </div>
            <div style={{ padding: "20px", overflowY: "auto" }}>
              <form onSubmit={handleSaveLecturer} style={{ display: "grid", gap: "15px" }}>
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px" }}>
                  <div style={{ fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>Thông tin tài khoản</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={styles.label}>Mã giảng viên</label>
                      <input readOnly style={styles.input} placeholder="VD: GV2026001" value={lecturerForm.lecturer_id} onChange={e => setLecturerForm({...lecturerForm, lecturer_id: e.target.value.toUpperCase()})} />
                    </div>
                    <div>
                      <label style={styles.label}>Vai trò</label>
                      <input readOnly style={styles.input} value="Giảng viên" />
                    </div>
                  </div>
                  <div style={{ marginTop: "8px", color: "#475569", fontSize: "0.85rem" }}>
                    Hệ thống sẽ tự tạo tài khoản đăng nhập với tên đăng nhập là mã giảng viên và mật khẩu mặc định là <strong>123456</strong>.
                  </div>
                </div>

                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px" }}>
                  <div style={{ fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>Hồ sơ nhân thân</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={styles.label}>Họ và Tên *</label>
                      <input required style={styles.input} placeholder="Nguyễn Văn A" value={lecturerForm.full_name} onChange={e => setLecturerForm({...lecturerForm, full_name: e.target.value})} />
                    </div>
                    <div>
                      <label style={styles.label}>Ngày sinh</label>
                      <input type="date" style={styles.input} value={lecturerForm.date_of_birth} onChange={e => setLecturerForm({...lecturerForm, date_of_birth: e.target.value})} />
                    </div>
                    <div>
                      <label style={styles.label}>Giới tính</label>
                      <select style={styles.input} value={lecturerForm.gender} onChange={e => setLecturerForm({...lecturerForm, gender: e.target.value})}>
                        <option value="">-- Chọn --</option>
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                    <div>
                      <label style={styles.label}>CCCD</label>
                      <input style={styles.input} placeholder="012345678901" value={lecturerForm.citizen_id} onChange={e => setLecturerForm({...lecturerForm, citizen_id: e.target.value})} />
                    </div>
                    <div>
                      <label style={styles.label}>Dân tộc</label>
                      <input style={styles.input} placeholder="Kinh" value={lecturerForm.ethnicity} onChange={e => setLecturerForm({...lecturerForm, ethnicity: e.target.value})} />
                    </div>
                    <div>
                      <label style={styles.label}>Tôn giáo</label>
                      <input style={styles.input} placeholder="Không" value={lecturerForm.religion} onChange={e => setLecturerForm({...lecturerForm, religion: e.target.value})} />
                    </div>
                    <div>
                      <label style={styles.label}>Quốc tịch</label>
                      <input style={styles.input} placeholder="Việt Nam" value={lecturerForm.nationality} onChange={e => setLecturerForm({...lecturerForm, nationality: e.target.value})} />
                    </div>
                    <div>
                      <label style={styles.label}>Nơi sinh</label>
                      <input style={styles.input} placeholder="Hà Nội" value={lecturerForm.place_of_birth} onChange={e => setLecturerForm({...lecturerForm, place_of_birth: e.target.value})} />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={styles.label}>Địa chỉ</label>
                      <input style={styles.input} placeholder="Số nhà, đường, phường/xã, quận/huyện" value={lecturerForm.address} onChange={e => setLecturerForm({...lecturerForm, address: e.target.value})} />
                    </div>
                    <div>
                      <label style={styles.label}>Email</label>
                      <input style={styles.input} type="email" placeholder="gv@ptit.edu.vn" value={lecturerForm.email} onChange={e => setLecturerForm({...lecturerForm, email: e.target.value})} />
                    </div>
                    <div>
                      <label style={styles.label}>Số điện thoại</label>
                      <input style={styles.input} placeholder="0901234567" value={lecturerForm.phone_number} onChange={e => setLecturerForm({...lecturerForm, phone_number: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px" }}>
                  <div style={{ fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>Thông tin công tác</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={styles.label}>Khoa/Bộ môn quản lý *</label>
                      <select required style={styles.input} value={lecturerForm.faculty_id} onChange={e => setLecturerForm({...lecturerForm, faculty_id: e.target.value})}>
                        <option value="">-- Chọn Khoa --</option>
                        {facultiesList.map(f => (
                          <option key={f.faculty_id} value={f.faculty_id}>
                            {f.faculty_id} - {f.faculty_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={styles.label}>Học hàm/Học vị</label>
                      <select style={styles.input} value={lecturerForm.academic_title} onChange={e => setLecturerForm({...lecturerForm, academic_title: e.target.value})}>
                        <option value="">-- Chọn --</option>
                        <option value="ThS">ThS (Thạc sĩ)</option>
                        <option value="TS">TS (Tiến sĩ)</option>
                        <option value="PGS.TS">PGS.TS</option>
                        <option value="GS.TS">GS.TS</option>
                        <option value="KS">KS (Kỹ sư)</option>
                        <option value="CN">CN (Cử nhân)</option>
                      </select>
                    </div>
                    <div>
                      <label style={styles.label}>Chức vụ</label>
                      <select style={styles.input} value={lecturerForm.position} onChange={e => setLecturerForm({...lecturerForm, position: e.target.value})}>
                        <option value="">-- Chọn --</option>
                        <option value="Giảng viên">Giảng viên</option>
                        <option value="Giảng viên chính">Giảng viên chính</option>
                        <option value="Trưởng bộ môn">Trưởng bộ môn</option>
                        <option value="Phó trưởng bộ môn">Phó trưởng bộ môn</option>
                        <option value="Trưởng khoa">Trưởng khoa</option>
                        <option value="Phó khoa">Phó khoa</option>
                      </select>
                    </div>
                    <div>
                      <label style={styles.label}>Loại hợp đồng</label>
                      <select style={styles.input} value={lecturerForm.employment_type} onChange={e => setLecturerForm({...lecturerForm, employment_type: e.target.value})}>
                        <option value="">-- Chọn --</option>
                        <option value="Cơ hữu">Cơ hữu</option>
                        <option value="Thỉnh giảng">Thỉnh giảng</option>
                        <option value="Hợp đồng">Hợp đồng</option>
                      </select>
                    </div>
                    <div>
                      <label style={styles.label}>Trạng thái</label>
                      <select style={styles.input} value={lecturerForm.teaching_status} onChange={e => setLecturerForm({...lecturerForm, teaching_status: e.target.value})}>
                        <option value="Active">Đang dạy</option>
                        <option value="Inactive">Ngừng dạy</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "15px", marginTop: "5px" }}>
                  <button type="button" style={{ ...styles.btn, background: "#94a3b8" }} onClick={() => setIsLecturerModalOpen(false)}>Hủy bỏ</button>
                  <button type="submit" style={{ ...styles.btn, background: "#0f766e" }}>Lưu giảng viên</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LecturersManagement;
"""

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(jsx)

# Now remove the lecturer code from AIAttendance
# We need to remove states, functions, and the rendering logic, and import LecturersManagement

# States to remove: allLecturersList, lecturerSearch, isLecturerModalOpen, isLecturerDetailModalOpen, editingLecturerId, selectedLecturerDetail, lecturerForm
states_to_remove = [
    r"const \[allLecturersList, setAllLecturersList\] = useState\(\[\]\);\n\s*",
    r"const \[lecturerSearch, setLecturerSearch\] = useState\(''\);\n\s*",
    r"const \[isLecturerModalOpen, setIsLecturerModalOpen\] = useState\(false\);\n\s*",
    r"const \[isLecturerDetailModalOpen, setIsLecturerDetailModalOpen\] = useState\(false\);\n\s*",
    r"const \[editingLecturerId, setEditingLecturerId\] = useState\(null\);\n\s*",
    r"const \[selectedLecturerDetail, setSelectedLecturerDetail\] = useState\(null\);\n\s*",
    r"const \[lecturerForm, setLecturerForm\] = useState\(\{(.*?)\}\);\n\s*"
]

# We should use re to sub the state out. Wait, lecturerForm spans multiple lines.
for pattern in states_to_remove:
    content = re.sub(pattern, "", content, flags=re.DOTALL)

# Functions to remove: fetchAllLecturers, generateLecturerId, openLecturerModal, handleSaveLecturer, handleDeleteLecturer, renderLecturersManagementTab
functions_to_remove = [
    r"const fetchAllLecturers = async \(\) => \{(.*?)\};\n\s*",
    r"const generateLecturerId = \(list.*?\) => \{(.*?)\};\n\s*",
    r"const openLecturerModal = \(lecturer.*?\) => \{(.*?)\};\n\s*",
    r"const handleSaveLecturer = async \(e\) => \{(.*?)\};\n\s*",
    r"const handleDeleteLecturer = async \(id\) => \{(.*?)\};\n\s*",
    r"const renderLecturersManagementTab = \(\) => \{(.*?\n  \};)\n\s*"
]

for pattern in functions_to_remove:
    content = re.sub(pattern, "", content, flags=re.DOTALL)

# Remove fetchAllLecturers from activeTab useEffect
content = re.sub(r"\} else if \(activeTab === 'lecturers_management'\) \{\n\s*fetchAllLecturers\(\);", "} else if (activeTab === 'lecturers_management') {\n      // fetch handled inside LecturersManagement component", content)

# Replace {activeTab === 'lecturers_management' && renderLecturersManagementTab()}
content = re.sub(r"\{activeTab === 'lecturers_management' && renderLecturersManagementTab\(\)\}", "{activeTab === 'lecturers_management' && <LecturersManagement facultiesList={facultiesList} setError={setError} setSuccess={setSuccess} />}", content)

# Also need to import LecturersManagement at the top
if "import LecturersManagement" not in content:
    content = content.replace("import StudentManagement from './StudentManagement';", "import StudentManagement from './StudentManagement';\nimport LecturersManagement from './LecturersManagement';")

with open(source_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done extracting LecturersManagement")
