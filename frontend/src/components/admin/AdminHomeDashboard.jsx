import React, { useEffect, useMemo, useState } from 'react';
import { Users, GraduationCap, BookOpen, Layers, Building2, BookMarked } from 'lucide-react';
import { studentsApi, lecturersApi, creditClassesApi, facultiesApi, majorsApi, subjectsApi } from '../../api';

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  title: {
    fontSize: '1.15rem',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
  },
  subtitle: {
    color: '#64748b',
    fontSize: '0.95rem',
    margin: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
  },
  statCard: {
    background: '#fff',
    padding: '16px 18px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
  },
  statContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  statValue: {
    fontSize: '1.8rem',
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 1.1,
  },
  statTitle: {
    color: '#64748b',
    fontSize: '0.92rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  iconWrap: {
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
};

const STAT_ITEMS = [
  { key: 'lecturers', title: 'Số lượng giảng viên', icon: Users, color: '#3b82f6' },
  { key: 'students', title: 'Số lượng sinh viên', icon: GraduationCap, color: '#10b981' },
  { key: 'creditClasses', title: 'Số lượng lớp tín chỉ', icon: BookMarked, color: '#f59e0b' },
  { key: 'faculties', title: 'Số lượng khoa', icon: Building2, color: '#8b5cf6' },
  { key: 'majors', title: 'Số lượng ngành', icon: Layers, color: '#ef4444' },
  { key: 'subjects', title: 'Số lượng môn học', icon: BookOpen, color: '#14b8a6' },
];

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

export default function AdminHomeDashboard() {
  const [stats, setStats] = useState({
    lecturers: 0,
    students: 0,
    creditClasses: 0,
    faculties: 0,
    majors: 0,
    subjects: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const [lecturersRes, studentsRes, creditClassesRes, facultiesRes, majorsRes, subjectsRes] = await Promise.all([
          lecturersApi.listLecturers().catch(() => []),
          studentsApi.listStudents().catch(() => []),
          creditClassesApi.listCreditClasses().catch(() => []),
          facultiesApi.listFaculties().catch(() => []),
          majorsApi.listMajors().catch(() => []),
          subjectsApi.listSubjects().catch(() => []),
        ]);

        setStats({
          lecturers: normalizeList(lecturersRes).length,
          students: normalizeList(studentsRes).length,
          creditClasses: normalizeList(creditClassesRes).length,
          faculties: normalizeList(facultiesRes).length,
          majors: normalizeList(majorsRes).length,
          subjects: normalizeList(subjectsRes).length,
        });
      } catch (error) {
        console.error('Lỗi tải thống kê trang chủ:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = useMemo(() => {
    return STAT_ITEMS.map((item) => {
      const Icon = item.icon;
      return {
        ...item,
        value: loading ? '—' : stats[item.key],
      };
    });
  }, [loading, stats]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <h3 style={styles.title}>Tổng quan hệ thống</h3>
        <p style={styles.subtitle}>Theo dõi số lượng dữ liệu chính trong hệ thống</p>
      </div>

      <div style={styles.grid}>
        {statCards.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} style={styles.statCard}>
              <div style={styles.statContent}>
                <div style={styles.statValue}>{item.value}</div>
                <div style={styles.statTitle}>
                  <Icon size={16} />
                  <span>{item.title}</span>
                </div>
              </div>
              <div style={{ ...styles.iconWrap, background: `${item.color}1A` }}>
                <Icon size={20} color={item.color} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
