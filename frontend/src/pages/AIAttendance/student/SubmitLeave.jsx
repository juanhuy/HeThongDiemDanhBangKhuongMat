import React from 'react';
import PanelCard from '../components/PanelCard';
import PageHeader from '../components/PageHeader';
import { useLeaveRequest } from '../hooks/student/useLeaveRequest';

const SubmitLeave = ({ API_BASE, user }) => {
  const { loading, error, submitLeave } = useLeaveRequest(API_BASE, user);

  return (
    <PanelCard>
      <PageHeader title="Xin nghỉ phép" />

      {loading ? <p>Đang gửi...</p> : null}
      {error ? <p>{error}</p> : null}

      <form className="form-grid">
        <label>
          Mã buổi học
          <input type="text" name="ma_buoi_hoc" />
        </label>
        <label>
          Lý do
          <textarea name="ly_do" />
        </label>
        <label>
          Minh chứng
          <input type="text" name="minh_chung" />
        </label>
        <button type="button" className="btn btn-primary" onClick={() => submitLeave({ mssv: user?.mssv, ma_buoi_hoc: '', ly_do: '', minh_chung: '' })}>
          Gửi yêu cầu
        </button>
      </form>
    </PanelCard>
  );
};

export default SubmitLeave;
