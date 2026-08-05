import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import SearchableSelect from '../../common/SearchableSelect';

export default function EditClassModal({ editData, onClose, onSuccess, lecturers, adminClasses, getSubjectLabel, showToast }) {
  const [formData, setFormData] = useState(editData);
  const inputCls = "w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500 bg-white";
  const labelCls = "block text-xs font-medium text-slate-600 mb-1.5";

  const handleSaveEdit = async () => {
    if (!formData.lecturer_id || !formData.max_students) {
      showToast?.('Vui lòng điền đủ Giảng viên và Sĩ số!', 'error');
      return;
    }
    try {
      const res = await fetch(`http://localhost:8000/api/credit-classes/${formData.class_id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lecturer_id: formData.lecturer_id,
          max_students: formData.max_students,
          target_classes: formData.target_classes
        })
      });
      if (!res.ok) throw new Error('Failed to update');
      showToast?.('Cập nhật lớp thành công!', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      showToast?.('Lỗi khi cập nhật lớp!', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white w-full max-w-xl max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* ... [Gắn HTML Header & Body edit modal từ file gốc của bạn vào] ... */}
        <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-slate-200 bg-slate-50 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-md border border-slate-300 text-sm font-medium text-slate-600 hover:bg-white">Hủy</button>
          <button onClick={handleSaveEdit} className="px-5 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5">
            <Save size={16} /> Lưu
          </button>
        </div>
      </div>
    </div>
  );
}