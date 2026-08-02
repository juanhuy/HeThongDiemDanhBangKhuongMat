import React from 'react';
import PanelCard from '../components/PanelCard';
import PageHeader from '../components/PageHeader';
import ListStack from '../components/ListStack';
import ListItem from '../components/ListItem';
import ActionRow from '../components/ActionRow';
import { useLeaveRequests } from '../hooks/lecturer/useLeaveRequests';

const LeaveRequest = ({ API_BASE }) => {
  const { leaveRequests, loading, error, approve, reject } = useLeaveRequests(API_BASE);

  return (
    <PanelCard>
      <PageHeader title="Duyệt nghỉ phép" />

      {loading ? <p>Đang tải...</p> : null}
      {error ? <p>{error}</p> : null}

      <ListStack>
        {leaveRequests.length === 0 ? (
          <ListItem>
            <span>Chưa có yêu cầu nghỉ</span>
            <ActionRow>
              <button className="btn btn-approve" onClick={() => approve({})}>Approve</button>
              <button className="btn btn-reject" onClick={() => reject({})}>Reject</button>
            </ActionRow>
          </ListItem>
        ) : (
          leaveRequests.map((item) => (
            <ListItem key={item?.request_id || item?.id}>
              <span>{item?.request_id || item?.id || 'Yêu cầu'}</span>
              <ActionRow>
                <button className="btn btn-approve" onClick={() => approve(item)}>Approve</button>
                <button className="btn btn-reject" onClick={() => reject(item)}>Reject</button>
              </ActionRow>
            </ListItem>
          ))
        )}
      </ListStack>
    </PanelCard>
  );
};

export default LeaveRequest;
