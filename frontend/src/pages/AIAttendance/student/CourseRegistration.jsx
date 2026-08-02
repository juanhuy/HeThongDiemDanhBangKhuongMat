import React from 'react';
import PanelCard from '../components/PanelCard';
import PageHeader from '../components/PageHeader';
import ListStack from '../components/ListStack';
import ListItem from '../components/ListItem';
import { useCourseRegistration } from '../hooks/student/useCourseRegistration';

const CourseRegistration = ({ API_BASE, user }) => {
  const { availableClasses, loading, error, register } = useCourseRegistration(API_BASE, user);

  return (
    <PanelCard>
      <PageHeader title="Đăng ký học phần" />

      {loading ? <p>Đang tải...</p> : null}
      {error ? <p>{error}</p> : null}

      <ListStack>
        {availableClasses.length === 0 ? (
          <ListItem>
            <span>Danh sách lớp mở</span>
          </ListItem>
        ) : (
          availableClasses.map((item) => (
            <ListItem key={item?.class_id || item?.ma_lop_tc || item?.id}>
              <span>{item?.class_id || item?.ma_lop_tc || 'Lớp'}</span>
              <button type="button" className="btn btn-primary" onClick={() => register({ ma_lop_tc: item?.class_id || item?.ma_lop_tc, mssv: user?.mssv })}>
                Đăng ký
              </button>
            </ListItem>
          ))
        )}
      </ListStack>
    </PanelCard>
  );
};

export default CourseRegistration;
