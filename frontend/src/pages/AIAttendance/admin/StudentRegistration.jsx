import React, { useState } from 'react';
import { adminService } from '../services/adminService';
import '../styles/common.css';

const StudentRegistration = ({ API_BASE, showToast }) => {
  const [formData, setFormData] = useState({
    student_id: '',
    full_name: '',
    administrative_class: '',
    major: '',
    cohort: '',
    email: '',
    phone_number: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!formData.student_id.trim() || !formData.full_name.trim()) {
      if (showToast) showToast('Vui lòng nhập Mã sinh viên và Họ tên!', 'error');
      return;
    }

    // Đóng gói ĐỦ 11 TRƯỜNG theo yêu cầu Backend
    const payload = {
      student_id: formData.student_id.trim(),
      full_name: formData.full_name.trim(),
      administrative_class: formData.administrative_class.trim() || null,
      major: formData.major.trim() || null,
      cohort: formData.cohort.trim() || null,
      email: formData.email.trim() || null,
      phone_number: formData.phone_number.trim() || null,
      
      training_program: null,
      academic_status: 'Đang học',
      account_id: null,
      profile_id: null,
    };

    try {
      const res = await adminService.createStudent(API_BASE, payload);
      if (res.ok || res.status === 200 || res.status === 201) {
        if (showToast) showToast('Đăng ký sinh viên thành công!', 'success');
        setFormData({
          student_id: '',
          full_name: '',
          administrative_class: '',
          major: '',
          cohort: '',
          email: '',
          phone_number: '',
        });
      } else {
        if (showToast) showToast('Đăng ký sinh viên thất bại!', 'error');
      }
    } catch (err) {
      if (showToast) showToast('Lỗi kết nối máy chủ!', 'error');
    }
  };

  return (
    <section className="panel-card">
      <div className="panel-header">
        <h3>Đăng ký sinh viên mới</h3>
      </div>
      <form className="form-grid" onSubmit={handleRegister}>
        <label>
          Mã sinh viên (*)
          <input
            type="text"
            name="student_id"
            value={formData.student_id}
            onChange={handleInputChange}
            placeholder="VD: N33"
            required
          />
        </label>

        <label>
          Họ và tên (*)
          <input
            type="text"
            name="full_name"
            value={formData.full_name}
            onChange={handleInputChange}
            placeholder="VD: Nguyễn Văn An"
            required
          />
        </label>

        <label>
          Lớp hành chính
          <input
            type="text"
            name="administrative_class"
            value={formData.administrative_class}
            onChange={handleInputChange}
          />
        </label>

        <label>
          Chuyên ngành
          <input
            type="text"
            name="major"
            value={formData.major}
            onChange={handleInputChange}
          />
        </label>

        <label>
          Khóa học
          <input
            type="text"
            name="cohort"
            value={formData.cohort}
            onChange={handleInputChange}
            placeholder="VD: K18"
          />
        </label>

        <label>
          Email
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
          />
        </label>

        <label>
          Số điện thoại
          <input
            type="text"
            name="phone_number"
            value={formData.phone_number}
            onChange={handleInputChange}
          />
        </label>
      </form>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" onClick={handleRegister}>
          Đăng ký
        </button>
      </div>
    </section>
  );
};

export default StudentRegistration;