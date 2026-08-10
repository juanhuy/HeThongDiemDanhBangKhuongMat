export const buildManualStudentPayload = (form) => {
  const trimmed = {
    student_id: (form.student_id || '').trim().toUpperCase(),
    full_name: (form.full_name || '').trim(),
    email: (form.email || '').trim(),
    phone_number: (form.phone_number || '').trim(),
    administrative_class: (form.administrative_class || '').trim(),
    major_id: (form.major_id || '').trim(),
    specialization: (form.specialization || '').trim(),
    faculty_id: (form.faculty_id || '').trim(),
    cohort: (form.cohort || '').trim(),
    training_program: (form.training_program || '').trim(),
    academic_status: (form.academic_status || 'Đang học').trim(),
    gender: (form.gender || '').trim(),
    citizen_id: (form.citizen_id || '').trim(),
    ethnicity: (form.ethnicity || '').trim(),
    religion: (form.religion || '').trim(),
    nationality: (form.nationality || '').trim() || 'Việt Nam',
    place_of_birth: (form.place_of_birth || '').trim(),
    address: (form.address || '').trim()
  };

  return trimmed;
};
