import React from 'react';
import { usePendingFaces } from '../hooks/admin/usePendingFaces';

const PendingFaceList = ({ API_BASE, showToast, user }) => {
  const { pendingFaces, loading, error, refresh, approve, reject } = usePendingFaces(API_BASE);

  return (
    <section className="panel-card">
      <div className="panel-header">
        <h3>Danh sách Face chờ duyệt</h3>
        <button type="button" className="btn btn-primary" onClick={refresh}>Tải lại</button>
      </div>

      {loading ? <p>Đang tải...</p> : null}
      {error ? <p>{error}</p> : null}

      <div className="list-stack">
        {pendingFaces.length === 0 ? (
          <div className="list-item">
            <span>Chưa có dữ liệu Face mới</span>
          </div>
        ) : (
          pendingFaces.map((item) => (
            <div key={item?.id || item?.face_id || item?.request_id} className="list-item">
              <span>{item?.face_id || item?.id || item?.request_id || 'Face mới'}</span>
              <div className="action-row">
                <button type="button" className="btn btn-approve" onClick={() => approve(item)}>Approve</button>
                <button type="button" className="btn btn-reject" onClick={() => reject(item)}>Reject</button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default PendingFaceList;
