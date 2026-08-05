import React from 'react';
import { Edit2, Trash2, ChevronRight } from 'lucide-react';

const StatusBadge = ({ item, handleChangeStatus }) => {
  const statusConfig = {
    Active: { label: 'Đang mở', bg: 'bg-[#e6f4ea]', text: 'text-[#1e8e3e]' },
    Planning: { label: 'Dự kiến', bg: 'bg-[#fce8e6]', text: 'text-[#d93025]' },
    Cancelled: { label: 'Đã hủy', bg: 'bg-gray-200', text: 'text-gray-600' }
  };
  const cfg = statusConfig[item.status] || statusConfig.Planning;

  return (
    <select
      value={item.status || 'Planning'}
      onChange={(e) => handleChangeStatus(item, e.target.value)}
      className={`text-[12px] font-medium px-3 py-1.5 rounded-md border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400 ${cfg.bg} ${cfg.text}`}
      title="Nhấn để đổi trạng thái"
    >
      <option value="Planning">Dự kiến</option>
      <option value="Active">Đang mở</option>
      <option value="Cancelled">Đã hủy</option>
    </select>
  );
};

export default function DataTable({ 
  loading, flatData, getSubjectLabel, getHierarchyLabel, 
  getLecturerName, getTargetClassesLabel, 
  handleEditClick, handleChangeStatus 
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-6 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f4f5f7] border-b border-slate-200 text-slate-700 text-[13px]">
              <th className="py-3.5 px-4 font-bold whitespace-nowrap">Mã Lớp TC</th>
              <th className="py-3.5 px-4 font-bold">Môn học</th>
              <th className="py-3.5 px-4 font-bold whitespace-nowrap">Nhóm / Tổ</th>
              <th className="py-3.5 px-4 font-bold min-w-[140px]">Giảng viên</th>
              <th className="py-3.5 px-4 font-bold min-w-[140px]">Lớp biên chế dự kiến</th>
              <th className="py-3.5 px-4 font-bold text-center">Phân loại</th>
              <th className="py-3.5 px-4 font-bold text-center">Sĩ số</th>
              <th className="py-3.5 px-4 font-bold text-center">Trạng thái</th>
              <th className="py-3.5 px-4 font-bold text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="text-[14px]">
            {loading ? (
              <tr><td colSpan="9" className="text-center py-10 text-slate-500">Đang tải dữ liệu...</td></tr>
            ) : flatData.length === 0 ? (
              <tr><td colSpan="9" className="text-center py-10 text-slate-500">Không tìm thấy lớp nào</td></tr>
            ) : (
              flatData.map((item) => {
                const isSub = !!item.parent_class_id;
                const parent = item._parent;
                const targets = isSub
                  ? (item.target_classes?.length ? item.target_classes : (parent?.target_classes || []))
                  : (item.target_classes || []);

                return (
                  <tr key={item.class_id} className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${isSub ? 'bg-slate-50/40' : 'bg-white'}`}>
                    <td className={`py-3.5 px-4 font-medium whitespace-nowrap ${isSub ? 'text-slate-500 pl-8' : 'text-[#1565c0] font-bold'}`}>
                      {item.class_id}
                    </td>
                    <td className={`py-3.5 px-4 ${isSub ? 'text-slate-500' : 'text-slate-700 font-medium'}`}>
                      {getSubjectLabel(item.subject_id || parent?.subject_id)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                      {getHierarchyLabel(item, parent)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">{getLecturerName(item.lecturer_id)}</td>
                    <td className="py-3.5 px-4 text-slate-600 text-[13px]">{getTargetClassesLabel(targets)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="bg-[#f1f3f5] text-slate-700 px-3 py-1.5 rounded-md text-[12px] font-medium">
                        {item.class_type === 'Theory' ? 'Lý thuyết' : item.class_type === 'Practice' ? 'Thực hành' : 'Chung'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-700">{item.current_students ?? 0}/{item.max_students}</td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge item={item} handleChangeStatus={handleChangeStatus} />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-4 text-slate-500">
                        <button onClick={() => handleEditClick(item)} className="hover:text-[#1565c0] transition-colors">
                          <Edit2 size={16} strokeWidth={2} />
                        </button>
                        <button className="hover:text-red-600 transition-colors">
                          <Trash2 size={16} strokeWidth={2} />
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
      <div className="bg-white border-t border-slate-200 p-4 flex justify-between items-center text-[13px] text-slate-600 font-medium px-6">
        <div>Hiển thị {flatData.length} lớp</div>
        <div className="flex items-center gap-1.5">
          <button className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:bg-slate-100"><ChevronRight size={16} className="rotate-180" /></button>
          <button className="w-8 h-8 flex items-center justify-center rounded bg-[#1565c0] text-white font-bold">1</button>
          <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600">2</button>
          <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600">3</button>
          <button className="w-8 h-8 flex items-center justify-center rounded text-slate-600 hover:bg-slate-100"><ChevronRight size={16} /></button>
        </div>
      </div>
    </div>
  );
}