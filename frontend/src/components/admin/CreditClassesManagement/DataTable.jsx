import React from 'react';
import { Edit, Trash2, Users } from 'lucide-react';

const DataTable = ({ classes, loading, selectedIds, setSelectedIds, onStatusChange, onDelete, onEdit }) => {
  if (loading) {
    return <div className="bg-white p-8 text-center text-slate-500 rounded-xl shadow-sm border border-slate-200">Đang tải dữ liệu...</div>;
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(classes.map(c => c.class_id));
    else setSelectedIds([]);
  };

  const handleSelectOne = (classId) => {
    setSelectedIds(prev => prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-200 text-slate-700 text-xs uppercase tracking-wider border-b-2 border-slate-300">
              <th className="p-3 text-center w-10">
                <input type="checkbox" onChange={handleSelectAll} checked={classes.length > 0 && selectedIds.length === classes.length} className="cursor-pointer" />
              </th>
              <th className="p-3 font-semibold text-center w-10">STT</th>
              <th className="p-3 font-semibold">Môn học</th>
              <th className="p-3 font-semibold text-center">N-T</th>
              <th className="p-3 font-semibold min-w-[120px]">Biên chế</th>
              <th className="p-3 font-semibold min-w-[160px]">Giảng viên</th>
              <th className="p-3 font-semibold min-w-[100px]">Phòng</th>
              <th className="p-3 font-semibold min-w-[150px]">Lịch học</th>
              <th className="p-3 font-semibold text-center w-28">Trạng thái</th>
              <th className="p-3 font-semibold text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {(!classes || classes.length === 0) ? (
              <tr><td colSpan="10" className="p-6 text-center text-slate-500">Không tìm thấy dữ liệu.</td></tr>
            ) : (
              classes?.map((cls, index) => {
                const isSelected = selectedIds.includes(cls.class_id);
                // Hover tương phản cao: Màu vàng nhạt hoặc xanh lam nhạt để dễ nhận diện
                const rowBg = isSelected ? 'bg-blue-50' : (index % 2 === 0 ? 'bg-white' : 'bg-slate-50');

                return (
                  // border-b-4 để tạo rãnh sâu phân cách giữa 2 lớp tín chỉ
                  <tr key={cls.class_id} className={`${rowBg} hover:bg-sky-100 border-b-[4px] border-slate-200 transition-colors duration-150`}>
                    <td className="p-3 text-center align-top">
                      <input type="checkbox" checked={isSelected} onChange={() => handleSelectOne(cls.class_id)} className="cursor-pointer mt-1" />
                    </td>
                    <td className="p-3 text-center font-bold text-slate-500 align-top">{index + 1}</td>

                    <td className="p-3 align-top">
                      <div className="font-bold text-indigo-900">{cls.subject_id}</div>
                      <div className="text-slate-600 text-xs mt-1 leading-tight">{cls.subject_name}</div>
                      <div className="text-slate-400 text-xs mt-1">TC: <b className="text-slate-600">{cls.credits}</b></div>
                    </td>

                    <td className="p-3 text-center font-black text-orange-600 align-top">{cls.display_group}</td>

                    <td className="p-3 align-top">
                      {cls.target_classes_display?.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {cls.target_classes_display.map((tc, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[11px] font-bold w-max">{tc}</span>
                          ))}
                        </div>
                      ) : <span className="text-slate-400 italic">Chưa xếp</span>}
                    </td>

                    {/* GIẢNG VIÊN (Gap-0.5 để thông tin sát nhau) */}
                    <td className="p-3 align-top">
                      <div className="flex flex-col gap-0.5">
                        {cls.theory_class && (
                          <div className="flex items-center gap-1.5 pb-1 mb-1 border-b border-dashed border-slate-300">
                            <span className="font-black text-blue-700 bg-blue-100 px-1 py-0.5 rounded text-[10px]">LT</span>
                            <span className="text-slate-800 font-medium text-xs line-clamp-1" title={cls.theory_class.lecturer_name}>{cls.theory_class.lecturer_name || <span className="text-slate-400 italic">Chưa xếp GV</span>}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <span className={`font-black px-1 py-0.5 rounded text-[10px] ${cls.theory_class ? 'text-purple-700 bg-purple-100' : 'text-blue-700 bg-blue-100'}`}>
                            {cls.class_type === 'Practice' ? 'TH' : 'LT'}
                          </span>
                          <span className="text-slate-800 font-medium text-xs line-clamp-1" title={cls.lecturer_name}>{cls.lecturer_name || <span className="text-slate-400 italic">Chưa xếp GV</span>}</span>
                        </div>
                      </div>
                    </td>

                    {/* PHÒNG HỌC & LỊCH HỌC tương tự (Gap-0.5 ép sát dòng LT/TH) */}
                    <td className="p-3 align-top">
                      <div className="flex flex-col gap-0.5">
                        {cls.theory_class && <div className="text-xs font-bold text-blue-700 pb-1 mb-1 border-b border-dashed border-slate-300">A2-101</div>}
                        <div className={`text-xs font-bold ${cls.theory_class ? 'text-purple-700' : 'text-blue-700'}`}>PM-205</div>
                      </div>
                    </td>

                    <td className="p-3 align-top">
                      <div className="flex flex-col gap-0.5 text-xs text-slate-700">
                        {cls.theory_class && (
                          <div className="pb-1 mb-1 border-b border-dashed border-slate-300">
                            <b>T2</b> (07:00-09:30) <br /><span className="text-[10px] text-slate-500">15/08 - 30/11</span>
                          </div>
                        )}
                        <div>
                          <b>T4</b> (13:00-15:30) <br /><span className="text-[10px] text-slate-500">15/08 - 30/11</span>
                        </div>
                      </div>
                    </td>

                    {/* Cột Trạng thái có thể chỉnh sửa trực tiếp */}
                    <td className="p-3 align-top text-center">
                      <select
                        value={cls.status || 'Active'}
                        onChange={(e) => onStatusChange(cls.class_id, e.target.value)}
                        className={`text-xs font-semibold px-2 py-1.5 rounded-lg border outline-none cursor-pointer w-full text-center
                          ${cls.status === 'Active' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                            cls.status === 'Planning' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                              'bg-slate-200 text-slate-600 border-slate-300'}`}
                      >
                        <option value="Active">Đang mở</option>
                        <option value="Planning">Kế hoạch</option>
                        <option value="Closed">Đã đóng</option>
                      </select>

                      <div className="mt-2 flex items-center justify-center gap-1 bg-slate-100 rounded py-1">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span className={`text-xs ${cls.current_students >= cls.max_students ? 'text-red-600 font-bold' : 'text-slate-700 font-medium'}`}>
                          {cls.current_students || 0} / {cls.max_students}
                        </span>
                      </div>
                    </td>

                    {/* CỘT THAO TÁC  */}
                    <td className="p-3 text-center align-top">
                      <div className="flex justify-center gap-1">
                        {/* onClick={() => onEdit(cls)} */}
                        <button onClick={() => onEdit(cls)} className="p-1.5 text-indigo-600 hover:bg-indigo-200 rounded transition" title="Sửa">
                           <Edit className="w-4 h-4" />
                        </button>
                        
                        <button onClick={() => onDelete(cls.class_id, cls.current_students)} className={`p-1.5 rounded transition ${cls.current_students > 0 ? 'text-slate-400' : 'text-red-600 hover:bg-red-200'}`}>
                           <Trash2 className="w-4 h-4" />
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
    </div>
  );
};

export default DataTable;