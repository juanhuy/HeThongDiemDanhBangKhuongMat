import React from 'react';
import PanelCard from '../components/PanelCard';
import PageHeader from '../components/PageHeader';
import ListStack from '../components/ListStack';
import ListItem from '../components/ListItem';
import { useStudentClasses } from '../hooks/student/useStudentClasses';

const MyClasses = ({ API_BASE, user }) => {
  const { myClasses, loading, error } = useStudentClasses(API_BASE, user);

  return (
    <PanelCard>
      <PageHeader title="Lớp học của tôi" />

      {loading ? <p>Đang tải...</p> : null}
      {error ? <p>{error}</p> : null}

      <ListStack>
        {myClasses.length === 0 ? (
          <ListItem>
            <span>Chưa có lớp học nào</span>
          </ListItem>
        ) : (
          myClasses.map((item) => (
            <ListItem key={item?.class_id || item?.ma_lop_tc || item?.id}>
              <span>{item?.class_id || item?.ma_lop_tc || 'Lớp'}</span>
              <span>{item?.subject_id || item?.ma_mon || ''}</span>
            </ListItem>
          ))
        )}
      </ListStack>
    </PanelCard>
  );
};

export default MyClasses;
