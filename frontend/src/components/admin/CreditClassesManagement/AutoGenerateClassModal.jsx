import React, { useState } from 'react';
import { X, Settings, CheckSquare, Loader2, Save } from 'lucide-react';
import { previewAutoGenerateClasses, saveGeneratedClasses } from '../../../api/creditClasses';

export default function AutoGenerateClassModal({ onClose, onSuccess, metaData, showToast }) {
  const [params, setParams] = useState({
    semester_id: metaData?.semesters?.[0]?.semester_id || '',
    major_id: ''
  });
  
  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasPreviewed, setHasPreviewed] = useState(false);

  // 1. Gọi API Preview
  const handlePreview = async () => {
    if (!params.semester_id) {
      showToast?.('Vui lòng chọn Học kỳ!', 'warning');
      return;
    }
    setLoading(true);
    try {
      // Payload gửi đi có thể tùy chỉnh theo yêu cầu thực tế của Backend
      const res = await previewAutoGenerateClasses(params);
      // Giả sử API trả về mảng danh sách lớp trong res.data
      setPreviewData(res.data || res || []); 
      setHasPreviewed(true);
      showToast?.('Đã tạo danh sách xem trước thành công', 'success');
    } catch (error) {
      showToast?.(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 2. Gọi API Batch Save
  const handleSaveBatch = async () => {
    if (previewData.length === 0) return;
    setSaving(true);
    try {
      await saveGeneratedClasses(previewData);
      showToast?.(`Đã tạo thành công ${previewData.length} lớp tín chỉ!`, 'success');
      onSuccess?.(); // Cập nhật lại bảng chính
      onClose();
    } catch (error) {
      showToast?.(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="bg-[#106fa6]/10 p-2 rounded-lg text-[#106fa6]">
              <Settings size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Tạo Lớp Tín Chỉ Tự Động</h2>
              <p className="text-xs text-slate-500">Hệ thống sẽ dựa vào chương trình khung để đề xuất lớp.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:bg-slate-200 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* BODY - BỘ LỌC PREVIEW */}
        <div className="p-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Học kỳ áp dụng (*)</label>
            <select 
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500"
              value={params.semester_id}
              onChange={(e) => setParams({...params, semester_id: e.target.value})}
            >
              <option value="">-- Chọn học kỳ --</option>
              {metaData?.semesters.map(s => (
                <option key={s.semester_id} value={s.semester_id}>
                  Học kỳ {s.semester} ({s.academic_year})
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ngành (Tùy chọn)</label>
            <select 
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500"
              value={params.major_id}
              onChange={(e) => setParams({...params, major_id: e.target.value})}
            >
              <option value="">-- Tất cả các ngành --</option>
              {metaData?.majors.map(m => (
                <option key={m.major_id} value={m.major_id}>{m.major_name}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={handlePreview}
            disabled={loading}
            className="h-10 px-6 text-white rounded-lg flex items-center gap-2 transition disabled:opacity-70 text-sm font-semibold"
            style={{ backgroundColor: '#106fa6' }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Settings size={16} />}
            Chạy mô phỏng (Preview)
          </button>
        </div>

        {/* BODY - KẾT QUẢ PREVIEW */}
        <div className="flex-1 overflow-auto bg-slate-50 p-4">
          {!hasPreviewed && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Settings size={48} className="mb-3 opacity-20" />
              <p>Chọn thông số và bấm "Chạy mô phỏng" để xem danh sách lớp dự kiến.</p>
            </div>
          )}

          {hasPreviewed && previewData.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <p>Không có lớp nào được đề xuất cho các tiêu chí này.</p>
            </div>
          )}

          {hasPreviewed && previewData.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="p-3 bg-slate-100 border-b border-slate-200 font-semibold text-sm text-slate-700 flex justify-between">
                <span>Kết quả: {previewData.length} lớp dự kiến</span>
                <span style={{ color: '#106fa6' }}>Lưu ý: Dữ liệu này CHƯA được lưu vào hệ thống</span>
              </div>
              <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-white sticky top-0 z-10 shadow-sm">
                    <tr className="text-xs uppercase text-slate-500 border-b border-slate-200">
                      <th className="p-3 font-semibold">Mã MH</th>
                      <th className="p-3 font-semibold">Tên Môn Học</th>
                      <th className="p-3 font-semibold">Số TC</th>
                      <th className="p-3 font-semibold text-center">Nhóm/Tổ</th>
                      <th className="p-3 font-semibold">Lớp hành chính</th>
                      <th className="p-3 font-semibold">Giảng viên dự kiến</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {previewData.map((cls, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-indigo-50/50">
                        <td className="p-3 font-bold text-indigo-700">{cls.subject_id}</td>
                        <td className="p-3 text-slate-700">{cls.subject_name || 'N/A'}</td>
                        <td className="p-3 text-slate-600">{cls.credits}</td>
                        <td className="p-3 text-center font-bold text-orange-600">{cls.class_group || '01'}</td>
                        <td className="p-3 text-slate-600">{cls.target_classes?.join(', ') || 'N/A'}</td>
                        <td className="p-3 text-slate-600">{cls.lecturer_name || <i className="text-slate-400">Chưa xếp</i>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Hủy bỏ
          </button>
          <button 
            onClick={handleSaveBatch}
            disabled={!hasPreviewed || previewData.length === 0 || saving}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#106fa6' }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
            {saving ? 'Đang lưu...' : 'Xác nhận Lưu tất cả'}
          </button>
        </div>
      </div>
    </div>
  );
}