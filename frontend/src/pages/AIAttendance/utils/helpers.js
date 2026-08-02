export const safeArray = (value) => Array.isArray(value) ? value : [];

export const toUpperCase = (value = '') => String(value).toUpperCase();

export const normalizeRole = (role = 'sinh_vien') => {
  const lower = String(role).toLowerCase();
  if (lower === 'student') return 'sinh_vien';
  if (lower === 'lecturer') return 'giang_vien';
  return lower;
};
