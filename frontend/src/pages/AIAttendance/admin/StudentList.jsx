import React from 'react';
import { useStudents } from '../hooks/admin/useStudents';

const StudentList = ({ API_BASE, showToast, user }) => {
  const { students, loading, error, refresh, deleteStudent } = useStudents(API_BASE);
  const [studentId, setStudentId] = React.useState('');
  const [administrativeClass, setAdministrativeClass] = React.useState('');
  const [major, setMajor] = React.useState('');
  const [cohort, setCohort] = React.useState('');
  
  const handleDelete = async (studentId) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa sinh viên ${studentId}?`)) {
      try {
        await deleteStudent(studentId);
        if (showToast){
            showToast('Xóa sinh viên thành công!', 'success');
            refresh();
        }
      } catch (err) {
        if (showToast) showToast('Xóa sinh viên thất bại!', 'error');
      }
    }
  };
  const handleSubmit = (e) => {
    e.preventDefault();  
    const filteredStudents = students.filter((student) => {
    const matchesStudentId = studentId ? student.student_id.toLowerCase().includes(studentId.toLowerCase()) : true;
    const matchesAdministrativeClass = administrativeClass ? student.administrative_class?.toLowerCase().includes(administrativeClass.toLowerCase()) : true;
    const matchesMajor = major ? student.major?.toLowerCase().includes(major.toLowerCase()) : true;
    const matchesCohort = cohort ? student.cohort?.toLowerCase().includes(cohort.toLowerCase()) : true;   
    return matchesStudentId && matchesAdministrativeClass && matchesMajor && matchesCohort;
    });
    if (filteredStudents.length > 0) {
      setStudents(filteredStudents);
    } else {
      if (showToast) showToast('Không tìm thấy sinh viên nào!', 'info');
    }
  }

  return (
    <section className="panel-card">
      <div className="researcher-info">
        <form className="search-form" onSubmit={handleSubmit}>
            <div className="search-input-group">
            <label htmlFor="search_student_id">Mã sinh viên</label>
            <div className="search-box">
                <input
                type="text"
                value={studentId}
                id="search_student_id"
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="VD: N33, S2026002..."
                />
            </div>
            </div>
            <div className="search-input-group">
            <label htmlFor="search_administrative_class">Lớp hành chính</label>
            <div className="search-box">
                <input
                type="text"
                id="search_administrative_class"
                value={administrativeClass}
                onChange={(e) => setAdministrativeClass(e.target.value)}
                placeholder="VD: DH22TH01..."
                />
            </div>
            </div>
            <div className="search-input-group">
            <label htmlFor="search_major">Chuyên ngành</label>
            <div className="search-box">
                <input
                type="text"
                id="search_major"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                placeholder="VD: CNTT, KTPM..."
                />
            </div>
            </div>
            <div className="search-input-group">
            <label htmlFor="search_cohort">Khóa học</label>
            <div className="search-box">
                <input
                type="text"
                id="search_cohort"
                value={cohort}
                onChange={(e) => setCohort(e.target.value)}
                placeholder="VD: K16, 2022..."
                />
            </div>
            </div>
            <div className="search-button-group">
            <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Đang tìm...' : 'Tìm kiếm'}
            </button>
            </div>
        </form>
      </div>
      <div className="panel-header">
        <h3>Danh sách sinh viên</h3>
        <button type="button" className="btn btn-primary" onClick={refresh}>
          Tải lại
        </button>
      </div>

      {loading ? <p>Đang tải...</p> : null}
      {error ? <p>{error}</p> : null}

      <div className="table-wrapper" style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>MSSV</th>
              <th>Họ và tên</th>
              <th>Lớp HC</th>
              <th>Chuyên ngành</th>
              <th>Khóa</th>
              <th>Email</th>
              <th>Số điện thoại</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center' }}>
                  Chưa có sinh viên nào trong danh sách
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student?.student_id || student?.profile_id}>
                  <td><strong>{student?.student_id || '—'}</strong></td>
                  
                  <td>{student?.full_name || '—'}</td>
                  
                  <td>{student?.administrative_class || '—'}</td>
                  
                  <td>{student?.major || '—'}</td>
                  
                  <td>{student?.cohort || '—'}</td>
                  
                  <td>{student?.email || '—'}</td>
                  
                  <td>{student?.phone_number || '—'}</td>
                  
                  <td>
                    <span className={`status-badge ${student?.academic_status ? 'active' : ''}`}>
                      {student?.academic_status || 'Chưa cập nhật'}
                    </span>
                  </td>
                  
                  <td>
                    <button
                      type="button"
                      className="btn btn-reject"
                      onClick={() => handleDelete(student?.student_id)}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default StudentList;