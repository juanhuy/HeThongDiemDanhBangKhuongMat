import test from 'node:test';
import assert from 'node:assert/strict';
import { buildManualStudentPayload } from './studentFormUtils.js';

test('buildManualStudentPayload normalizes and preserves the required fields', () => {
  const payload = buildManualStudentPayload({
    student_id: ' n22dccn134 ',
    full_name: '  Nguyễn Văn A  ',
    email: '  a@example.com ',
    phone_number: '0123456789',
    administrative_class: ' D22CQCNPM02-N ',
    major: 'Công nghệ thông tin',
    academic_status: 'Đang học',
    address: 'Hà Nội'
  });

  assert.equal(payload.student_id, 'N22DCCN134');
  assert.equal(payload.full_name, 'Nguyễn Văn A');
  assert.equal(payload.email, 'a@example.com');
  assert.equal(payload.phone_number, '0123456789');
  assert.equal(payload.administrative_class, 'D22CQCNPM02-N');
  assert.equal(payload.major, 'Công nghệ thông tin');
  assert.equal(payload.academic_status, 'Đang học');
  assert.equal(payload.address, 'Hà Nội');
});
