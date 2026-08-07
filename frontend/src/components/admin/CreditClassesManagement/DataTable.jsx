import React from 'react';
import { Edit, Trash2, Users } from 'lucide-react';

const statusConfig = {
  Active: {
    label: 'Đang mở',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  Planning: {
    label: 'Kế hoạch',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  Closed: {
    label: 'Đã đóng',
    className: 'border-slate-200 bg-slate-100 text-slate-600',
  },
};

const DataTable = ({
  classes = [],
  loading,
  selectedIds = [],
  setSelectedIds,
  onStatusChange,
  onDelete,
  onEdit,
}) => {
  const allSelected =
    classes.length > 0 && selectedIds.length === classes.length;

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedIds(classes.map((item) => item.class_id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (classId) => {
    setSelectedIds((previousIds) =>
      previousIds.includes(classId)
        ? previousIds.filter((id) => id !== classId)
        : [...previousIds, classId]
    );
  };

  if (loading) {
    return (
      <section className="overflow-hidden rounded-xl border border-[#d0e0eb] bg-white shadow-sm">
        <div className="px-6 py-10 text-center text-sm text-slate-500">
          Đang tải dữ liệu...
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-[#d0e0eb] bg-white shadow-sm">
      {/* Header bảng */}
      <div className="flex flex-col gap-1 border-b border-[#e2edf5] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-[#106fa6]">
            Danh sách lớp tín chỉ
          </h2>

          <p className="text-sm text-slate-500">
            {classes.length} lớp được tìm thấy
          </p>
        </div>

        {selectedIds.length > 0 && (
          <span className="text-sm font-semibold text-sky-700">
            Đã chọn {selectedIds.length} lớp
          </span>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#d0e0eb] bg-[#f8fafc] text-[13px] text-slate-600">
              <th className="w-11 px-3 py-3 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  aria-label="Chọn tất cả lớp"
                  className="h-4 w-4 cursor-pointer accent-[#106fa6]"
                />
              </th>

              <th className="w-12 px-3 py-3 text-center font-semibold">
                STT
              </th>

              <th className="min-w-[180px] px-3 py-3 font-semibold">
                Môn học
              </th>

              <th className="w-16 px-3 py-3 text-center font-semibold">
                N-T
              </th>

              <th className="min-w-[130px] px-3 py-3 font-semibold">
                Biên chế
              </th>

              <th className="min-w-[190px] px-3 py-3 font-semibold">
                Giảng viên
              </th>

              <th className="min-w-[110px] px-3 py-3 font-semibold">
                Phòng
              </th>

              <th className="min-w-[170px] px-3 py-3 font-semibold">
                Lịch học
              </th>

              <th className="w-32 px-3 py-3 text-center font-semibold">
                Trạng thái
              </th>

              <th className="w-24 px-3 py-3 text-center font-semibold">
                Thao tác
              </th>
            </tr>
          </thead>

          <tbody>
            {classes.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-6 py-10 text-center text-slate-500"
                >
                  Không tìm thấy dữ liệu.
                </td>
              </tr>
            ) : (
              classes.map((cls, index) => {
                const isSelected = selectedIds.includes(cls.class_id);
                const status = statusConfig[cls.status] || statusConfig.Closed;
                const currentStudents = Number(cls.current_students || 0);
                const maxStudents = Number(cls.max_students || 0);
                const isFull =
                  maxStudents > 0 && currentStudents >= maxStudents;

                return (
                  <tr
                    key={cls.class_id}
                    className={`border-b border-[#e2edf5] transition-colors last:border-b-0 ${
                      isSelected
                        ? 'bg-sky-50/70 hover:bg-sky-100/70'
                        : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-3 text-center align-top">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectOne(cls.class_id)}
                        aria-label={`Chọn lớp ${cls.class_id}`}
                        className="mt-0.5 h-4 w-4 cursor-pointer accent-[#106fa6]"
                      />
                    </td>

                    {/* STT */}
                    <td className="px-3 py-3 text-center align-top font-semibold text-slate-500">
                      {index + 1}
                    </td>

                    {/* Môn học */}
                    <td className="px-3 py-3 align-top">
                      <div className="font-bold text-[#0369a1]">
                        {cls.subject_id || '—'}
                      </div>

                      <div className="mt-1 text-xs leading-5 text-slate-600">
                        {cls.subject_name || 'Chưa có tên môn học'}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        Số tín chỉ:{' '}
                        <span className="font-semibold text-slate-700">
                          {cls.credits || 0}
                        </span>
                      </div>
                    </td>

                    {/* Nhóm */}
                    <td className="px-3 py-3 text-center align-top">
                      <span className="inline-flex rounded-md bg-orange-50 px-2 py-1 text-xs font-bold text-orange-700">
                        {cls.display_group || '—'}
                      </span>
                    </td>

                    {/* Lớp biên chế */}
                    <td className="px-3 py-3 align-top">
                      {cls.target_classes_display?.length > 0 ? (
                        <div className="flex flex-col items-start gap-1">
                          {cls.target_classes_display.map((targetClass, idx) => (
                            <span
                              key={`${targetClass}-${idx}`}
                              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700"
                            >
                              {targetClass}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs italic text-slate-400">
                          Chưa xếp
                        </span>
                      )}
                    </td>

                    {/* Giảng viên */}
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-col gap-1">
                        {cls.theory_class && (
                          <div className="flex items-center gap-2 border-b border-dashed border-slate-200 pb-1">
                            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                              LT
                            </span>

                            <span
                              className="max-w-[145px] truncate text-xs font-medium text-slate-700"
                              title={cls.theory_class.lecturer_name}
                            >
                              {cls.theory_class.lecturer_name || (
                                <span className="italic text-slate-400">
                                  Chưa xếp GV
                                </span>
                              )}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              cls.theory_class
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {cls.class_type === 'Practice' ? 'TH' : 'LT'}
                          </span>

                          <span
                            className="max-w-[145px] truncate text-xs font-medium text-slate-700"
                            title={cls.lecturer_name}
                          >
                            {cls.lecturer_name || (
                              <span className="italic text-slate-400">
                                Chưa xếp GV
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Phòng */}
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-col gap-1 text-xs font-semibold">
                        {cls.theory_class && (
                          <div className="border-b border-dashed border-slate-200 pb-1 text-blue-700">
                            {cls.theory_class.room_id || 'A2-101'}
                          </div>
                        )}

                        <div
                          className={
                            cls.theory_class
                              ? 'text-purple-700'
                              : 'text-blue-700'
                          }
                        >
                          {cls.room_id || 'PM-205'}
                        </div>
                      </div>
                    </td>

                    {/* Lịch học */}
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-col gap-1 text-xs text-slate-700">
                        {cls.theory_class && (
                          <div className="border-b border-dashed border-slate-200 pb-1">
                            <span className="font-bold">T2</span>{' '}
                            (07:00–09:30)
                            <div className="text-[10px] text-slate-500">
                              15/08 – 30/11
                            </div>
                          </div>
                        )}

                        <div>
                          <span className="font-bold">T4</span>{' '}
                          (13:00–15:30)
                          <div className="text-[10px] text-slate-500">
                            15/08 – 30/11
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Trạng thái */}
                    <td className="px-3 py-3 align-top text-center">
                      <select
                        value={cls.status || 'Active'}
                        onChange={(event) =>
                          onStatusChange(
                            cls.class_id,
                            event.target.value
                          )
                        }
                        aria-label={`Trạng thái lớp ${cls.class_id}`}
                        className={`h-9 w-full cursor-pointer rounded-md border px-2 text-center text-xs font-semibold outline-none focus:ring-2 focus:ring-sky-100 ${status.className}`}
                      >
                        <option value="Active">Đang mở</option>
                        <option value="Planning">Kế hoạch</option>
                        <option value="Closed">Đã đóng</option>
                      </select>

                      <div className="mt-2 flex items-center justify-center gap-1 rounded-md bg-slate-50 px-2 py-1.5">
                        <Users className="h-3.5 w-3.5 text-slate-500" />

                        <span
                          className={`text-xs ${
                            isFull
                              ? 'font-bold text-red-600'
                              : 'font-medium text-slate-700'
                          }`}
                        >
                          {currentStudents} / {maxStudents || '—'}
                        </span>
                      </div>
                    </td>

                    {/* Thao tác */}
                    <td className="px-3 py-3 text-center align-top">
                      <div className="flex justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEdit(cls)}
                          aria-label={`Sửa lớp ${cls.class_id}`}
                          title="Sửa lớp"
                          className="rounded-md p-2 text-[#106fa6] transition hover:bg-sky-50 hover:text-[#0d5d8a]"
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onDelete(cls.class_id, currentStudents)
                          }
                          disabled={currentStudents > 0}
                          aria-label={`Xóa lớp ${cls.class_id}`}
                          title={
                            currentStudents > 0
                              ? 'Không thể xóa lớp đã có sinh viên'
                              : 'Xóa lớp'
                          }
                          className={`rounded-md p-2 transition ${
                            currentStudents > 0
                              ? 'cursor-not-allowed text-slate-300'
                              : 'text-red-600 hover:bg-red-50 hover:text-red-700'
                          }`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default DataTable;