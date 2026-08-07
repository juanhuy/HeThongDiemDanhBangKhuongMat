import React, { useState } from 'react';
import { Edit, Trash2, Users, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const styles = {
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", fontSize: "0.95rem" },
  th: { padding: "12px 15px", textAlign: "left", borderBottom: "2px solid #e2e8f0", color: "#475569", fontWeight: "600", whiteSpace: "nowrap", position: "relative", background: "#f8fafc" },
  td: { padding: "12px 15px", borderBottom: "1px solid #e2e8f0", verticalAlign: "middle" }
};

const DataTable = ({ classes, loading, selectedIds, setSelectedIds, onStatusChange, onDelete, onEdit }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Đang tải dữ liệu...</div>;
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(classes.map(c => c.class_id));
    else setSelectedIds([]);
  };

  const handleSelectOne = (classId) => {
    setSelectedIds(prev => prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]);
  };

  // PHÂN TRANG
  const totalPages = Math.ceil((classes?.length || 0) / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = classes?.slice(indexOfFirstItem, indexOfLastItem) || [];

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    let pages = [];
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    for (let i = startPage; i <= endPage; i++) pages.push(i);

    const btnStyle = { display: "flex", alignItems: "center", justifyContent: "center", minWidth: "32px", height: "32px", padding: "0 8px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", color: "#475569", fontWeight: "500", transition: "all 0.2s", fontSize: "0.85rem" };
    const activeBtnStyle = { ...btnStyle, background: "#106fa6", color: "#fff", borderColor: "#106fa6" };
    const disabledBtnStyle = { ...btnStyle, opacity: 0.5, cursor: "not-allowed", background: "#f8fafc" };

    return (
      <div style={{ padding: "12px 20px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", borderBottomLeftRadius: "12px", borderBottomRightRadius: "12px" }}>
        <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
          Hiển thị <span style={{fontWeight: 600, color: "#334155"}}>{indexOfFirstItem + 1}</span> - <span style={{fontWeight: 600, color: "#334155"}}>{Math.min(indexOfLastItem, classes.length)}</span> trong tổng <span style={{fontWeight: 600, color: "#334155"}}>{classes.length}</span> lớp
        </div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(1)} style={currentPage === 1 ? disabledBtnStyle : btnStyle} title="Trang đầu"><ChevronsLeft size={16}/></button>
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} style={currentPage === 1 ? disabledBtnStyle : btnStyle} title="Trang trước"><ChevronLeft size={16}/></button>
          {startPage > 1 && (<><button onClick={() => setCurrentPage(1)} style={btnStyle}>1</button>{startPage > 2 && <span style={{ color: "#94a3b8", padding: "0 4px" }}>...</span>}</>)}
          {pages.map(page => (<button key={page} onClick={() => setCurrentPage(page)} style={currentPage === page ? activeBtnStyle : btnStyle}>{page}</button>))}
          {endPage < totalPages && (<>{endPage < totalPages - 1 && <span style={{ color: "#94a3b8", padding: "0 4px" }}>...</span>}<button onClick={() => setCurrentPage(totalPages)} style={btnStyle}>{totalPages}</button></>)}
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} style={currentPage === totalPages ? disabledBtnStyle : btnStyle} title="Trang sau"><ChevronRight size={16}/></button>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)} style={currentPage === totalPages ? disabledBtnStyle : btnStyle} title="Trang cuối"><ChevronsRight size={16}/></button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={{...styles.th, width: "40px", textAlign: "center"}}>
              <input type="checkbox" onChange={handleSelectAll} checked={classes.length > 0 && selectedIds.length === classes.length} style={{cursor: "pointer"}} />
            </th>
            <th style={{...styles.th, width: "60px", textAlign: "center"}}>STT</th>
            <th style={styles.th}>Môn học</th>
            <th style={{...styles.th, textAlign: "center"}}>N-T</th>
            <th style={styles.th}>Lớp biên chế</th>
            <th style={styles.th}>Giảng viên</th>
            <th style={styles.th}>Phòng</th>
            <th style={styles.th}>Lịch học</th>
            <th style={{...styles.th, textAlign: "center", width: "120px"}}>Trạng thái</th>
            <th style={{...styles.th, textAlign: "center", width: "80px"}}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {(!classes || classes.length === 0) ? (
            <tr><td colSpan="10" style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Không tìm thấy lớp học phù hợp.</td></tr>
          ) : (
            currentItems.map((cls, index) => {
              const isSelected = selectedIds.includes(cls.class_id);
              return (
                <tr 
                  key={cls.class_id} 
                  style={{ background: isSelected ? "#eff6ff" : "#fff", transition: "background 0.2s" }} 
                  onMouseOver={e => e.currentTarget.style.background = isSelected ? "#eff6ff" : "#f8fafc"} 
                  onMouseOut={e => e.currentTarget.style.background = isSelected ? "#eff6ff" : "#fff"}
                >
                  <td style={{...styles.td, textAlign: "center"}}>
                    <input type="checkbox" checked={isSelected} onChange={() => handleSelectOne(cls.class_id)} style={{cursor: "pointer"}} />
                  </td>
                  <td style={{...styles.td, textAlign: "center", fontWeight: "600", color: "#64748b"}}>
                    {indexOfFirstItem + index + 1}
                  </td>
                  <td style={styles.td}>
                    <div style={{ fontWeight: 700, color: '#0369a1' }}>{cls.subject_id}</div>
                    <div style={{ color: '#334155', fontSize: '0.85rem', marginTop: '2px' }}>{cls.subject_name}</div>
                    <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '2px' }}>TC: <b style={{color: '#475569'}}>{cls.credits}</b></div>
                  </td>
                  <td style={{...styles.td, textAlign: "center", fontWeight: "900", color: "#f59e0b"}}>
                    {cls.display_group}
                  </td>
                  <td style={styles.td}>
                    {cls.target_classes_display?.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {cls.target_classes_display.map((tc, idx) => (
                          <span key={idx} style={{ padding: "2px 8px", background: "#f1f5f9", color: "#334155", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "600", width: "max-content" }}>{tc}</span>
                        ))}
                      </div>
                    ) : <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: "0.85rem" }}>Chưa xếp</span>}
                  </td>
                  
                  {/* GIẢNG VIÊN */}
                  <td style={styles.td}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {cls.theory_class && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", paddingBottom: "4px", borderBottom: "1px dashed #cbd5e1" }}>
                          <span style={{ fontWeight: "800", color: "#1d4ed8", background: "#dbeafe", padding: "2px 6px", borderRadius: "4px", fontSize: "0.7rem" }}>LT</span>
                          <span style={{ color: "#1e293b", fontWeight: "500", fontSize: "0.85rem" }} title={cls.theory_class.lecturer_name}>{cls.theory_class.lecturer_name || <span style={{color: "#94a3b8", fontStyle: "italic"}}>Chưa xếp GV</span>}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontWeight: "800", padding: "2px 6px", borderRadius: "4px", fontSize: "0.7rem", color: cls.theory_class ? "#7e22ce" : "#1d4ed8", background: cls.theory_class ? "#f3e8ff" : "#dbeafe" }}>
                          {cls.class_type === 'Practice' ? 'TH' : 'LT'}
                        </span>
                        <span style={{ color: "#1e293b", fontWeight: "500", fontSize: "0.85rem" }} title={cls.lecturer_name}>{cls.lecturer_name || <span style={{color: "#94a3b8", fontStyle: "italic"}}>Chưa xếp GV</span>}</span>
                      </div>
                    </div>
                  </td>

                  {/* PHÒNG */}
                  <td style={styles.td}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {cls.theory_class && <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#1d4ed8", paddingBottom: "4px", borderBottom: "1px dashed #cbd5e1" }}>A2-101</div>}
                      <div style={{ fontSize: "0.85rem", fontWeight: "700", color: cls.theory_class ? "#7e22ce" : "#1d4ed8" }}>PM-205</div>
                    </div>
                  </td>

                  {/* LỊCH HỌC */}
                  <td style={styles.td}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", color: "#334155", fontSize: "0.85rem" }}>
                      {cls.theory_class && (
                        <div style={{ paddingBottom: "4px", borderBottom: "1px dashed #cbd5e1" }}>
                          <b>T2</b> (07:00-09:30) <br /><span style={{ fontSize: "0.75rem", color: "#64748b" }}>15/08 - 30/11</span>
                        </div>
                      )}
                      <div>
                        <b>T4</b> (13:00-15:30) <br /><span style={{ fontSize: "0.75rem", color: "#64748b" }}>15/08 - 30/11</span>
                      </div>
                    </div>
                  </td>

                  {/* TRẠNG THÁI */}
                  <td style={{...styles.td, textAlign: "center"}}>
                    <select
                      value={cls.status || 'Active'}
                      onChange={(e) => onStatusChange(cls.class_id, e.target.value)}
                      style={{
                        fontSize: "0.8rem", fontWeight: "600", padding: "6px 8px", borderRadius: "8px", border: "1px solid", outline: "none", cursor: "pointer", width: "100%", textAlign: "center",
                        background: cls.status === 'Active' ? '#dcfce7' : cls.status === 'Planning' ? '#fef3c7' : '#f1f5f9',
                        color: cls.status === 'Active' ? '#166534' : cls.status === 'Planning' ? '#92400e' : '#475569',
                        borderColor: cls.status === 'Active' ? '#bbf7d0' : cls.status === 'Planning' ? '#fde68a' : '#cbd5e1'
                      }}
                    >
                      <option value="Active">Đang mở</option>
                      <option value="Planning">Kế hoạch</option>
                      <option value="Closed">Đã đóng</option>
                    </select>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", background: "#f8fafc", borderRadius: "6px", padding: "4px", marginTop: "8px" }}>
                      <Users size={14} color="#64748b" />
                      <span style={{ fontSize: "0.8rem", fontWeight: cls.current_students >= cls.max_students ? "700" : "600", color: cls.current_students >= cls.max_students ? "#dc2626" : "#334155" }}>
                        {cls.current_students || 0} / {cls.max_students}
                      </span>
                    </div>
                  </td>

                  {/* THAO TÁC */}
                  <td style={{...styles.td, textAlign: "center"}}>
                    <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                      <button onClick={() => onEdit(cls)} style={{ padding: '6px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#106fa6' }} title="Sửa" onMouseOver={e=>e.currentTarget.style.background="#f1f5f9"} onMouseOut={e=>e.currentTarget.style.background="#fff"}>
                         <Edit size={16} />
                      </button>
                      <button onClick={() => onDelete(cls.class_id, cls.current_students)} style={{ padding: '6px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: cls.current_students > 0 ? 'not-allowed' : 'pointer', color: cls.current_students > 0 ? '#94a3b8' : '#ef4444' }} title="Xóa" onMouseOver={e=>e.currentTarget.style.background=cls.current_students > 0 ? "#fff" : "#fef2f2"} onMouseOut={e=>e.currentTarget.style.background="#fff"}>
                         <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      {renderPagination()}
    </div>
  );
};

export default DataTable;