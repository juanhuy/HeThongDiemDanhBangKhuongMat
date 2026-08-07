import React, { useState } from 'react';
import { Search, ChevronDown, Plus, Trash2, Copy, Users, Wand2, Calendar, X, AlertTriangle } from 'lucide-react';

export default function CreateClassModal({ onClose, onSuccess, metaData, showToast }) {
  // Dữ liệu mock hiển thị giao diện theo thiết kế
  const [formData, setFormData] = useState({
    subject_id: '',
    lecturer_id: '',
    max_students: 60,
    credits: 3,
    class_group: '01',
    status: 'Planning'
  });
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: 'class' | 'group', id: string/number }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.12)] w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* TOP HEADER */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-gray-50/50 flex-shrink-0">
            <div>
              <div className="flex items-center gap-3">
                <div className="bg-[#106fa6]/10 p-2 rounded-lg text-[#106fa6]">
                  <Plus size={20} />
                </div>
                <div>
                  <h2 className="text-[18px] font-bold text-gray-900 leading-tight">Tạo lớp tín chỉ mới</h2>
                  <p className="text-[13px] font-medium text-gray-500 mt-0.5">Cấu hình và mở lớp tín chỉ cho học kỳ hiện tại.</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={onClose}
                className="px-5 py-2 text-[14px] font-semibold text-[#106fa6] bg-white border border-[#106fa6] rounded-lg hover:bg-blue-50 transition-colors"
              >
                Hủy
              </button>
              <button 
                className="px-5 py-2 text-[14px] font-semibold text-white rounded-lg transition-colors"
                style={{ backgroundColor: '#106fa6' }}
              >
                Lưu hệ thống
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 flex flex-col gap-6 custom-scrollbar">
            
            {/* SECTION 1: Thông tin môn học */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-[#106fa6]/10 text-[#106fa6] flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <h2 className="text-[16px] font-bold text-slate-800">Thông tin môn học</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-600">Mã môn học / Tên môn học</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Nhập INT1434 hoặc Lập trình Web..."
                      className="w-full h-10 pl-10 pr-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-600">Học kỳ / Năm học</label>
                  <div className="relative">
                    <select className="w-full h-10 px-3 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm appearance-none bg-white">
                      <option>Học kỳ 1 - 2024-2025</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>
              </div>

              {/* Selected Subject Card */}
              <div className="border border-slate-200 bg-slate-50 rounded-lg p-4 flex items-start justify-between mt-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-800">Lập trình Web</span>
                    <span className="text-xs font-semibold bg-slate-200 text-slate-600 px-2 py-0.5 rounded">INT1434</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Số tín chỉ: 3 (2 LT + 1 TH) • Khoa Công nghệ thông tin
                  </div>
                </div>
                <button className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* SECTION 2: Cấu trúc lớp tín chỉ */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#106fa6]/10 text-[#106fa6] flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <h2 className="text-[16px] font-bold text-slate-800">Cấu trúc lớp tín chỉ</h2>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#106fa6] bg-white border border-[#106fa6] rounded-lg hover:bg-[#106fa6]/5 transition-colors">
                  <Plus size={16} /> Thêm lớp
                </button>
              </div>

              {/* Class Card */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                {/* Card Header */}
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-slate-800">Lớp 01</span>
                    <div className="flex items-center gap-2 bg-white border border-slate-300 rounded px-2 py-1">
                      <Users size={14} className="text-slate-400" />
                      <span className="text-xs text-slate-600 font-medium">Sĩ số max:</span>
                      <input type="number" defaultValue={60} className="w-10 text-xs font-bold focus:outline-none text-center" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-200 rounded transition-colors">
                      <Copy size={16} />
                    </button>
                    <button onClick={() => setDeleteConfirm({type: 'class', id: 'Lớp 01'})} className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex flex-col gap-6">
                  
                  {/* Nhóm lý thuyết */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="font-bold text-slate-800 text-sm">Nhóm lý thuyết (Bắt buộc)</span>
                    </div>
                    
                    <div className="grid grid-cols-12 gap-4 mb-4">
                      <div className="col-span-12 md:col-span-5 flex flex-col gap-1.5">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase">Giảng viên</label>
                        <div className="relative">
                          <select className="w-full h-9 px-3 pr-8 border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm appearance-none bg-white">
                            <option>TS. Nguyễn Văn A - CNTT</option>
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                        </div>
                      </div>
                      <div className="col-span-12 md:col-span-4 flex flex-col gap-1.5">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase">Lớp biên chế</label>
                        <div className="relative">
                          <select className="w-full h-9 px-3 pr-8 border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm appearance-none bg-white">
                            <option>D21CQCN01-B</option>
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                        </div>
                      </div>
                      <div className="col-span-12 md:col-span-3 flex flex-col gap-1.5">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase">Lịch học &amp; Phòng</label>
                        <div className="flex gap-2">
                           <div className="relative w-1/2">
                            <select className="w-full h-9 px-2 pr-6 border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm appearance-none bg-white">
                              <option>Thứ 2</option>
                            </select>
                            <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                          </div>
                          <input type="text" defaultValue="301-A2" className="w-1/2 h-9 px-2 border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full md:w-2/3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase">Ngày bắt đầu</label>
                        <div className="relative">
                          <input type="text" defaultValue="15-Aug-2024" className="w-full h-9 px-3 pr-8 border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm" />
                          <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-semibold text-slate-500 uppercase">Ngày kết thúc</label>
                        <div className="relative">
                          <input type="text" defaultValue="30-Dec-2024" className="w-full h-9 px-3 pr-8 border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm" />
                          <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="h-px w-full bg-slate-200"></div>

                  {/* Tổ thực hành */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="font-bold text-slate-800 text-sm">Tổ thực hành (Cấu hình tự động)</span>
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-4">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-semibold text-slate-500 uppercase">Sức chứa phòng TH</label>
                          <input type="number" defaultValue={40} className="w-32 h-9 px-3 border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-semibold text-slate-500 uppercase">Sĩ số tối đa/tổ</label>
                          <input type="number" defaultValue={40} className="w-32 h-9 px-3 border border-slate-300 rounded focus:outline-none focus:border-blue-500 text-sm" />
                        </div>
                        <div className="text-sm font-medium text-blue-600 italic lg:mb-2">
                          180 SV / 40 SV per group = 5 groups
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors">
                          <Wand2 size={14} /> Tự động chia tổ
                        </button>
                        <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors">
                          Thêm tổ TH
                        </button>
                      </div>
                    </div>

                    {/* Practical Group Item */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex flex-row md:flex-col justify-center items-center px-4 md:border-r border-slate-200 gap-2 md:gap-0">
                        <span className="font-bold text-slate-800 text-sm">Tổ 1</span>
                        <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 rounded mt-0 md:mt-1 font-semibold">Sĩ số: 40</span>
                      </div>

                      <div className="flex-1 grid grid-cols-12 gap-4">
                        <div className="col-span-12 md:col-span-4 flex flex-col gap-1">
                          <label className="text-[10px] font-semibold text-slate-500 uppercase">Giảng viên</label>
                          <div className="relative">
                            <select className="w-full h-8 px-2 pr-6 border border-slate-300 rounded bg-white focus:outline-none text-xs appearance-none">
                              <option>ThS. Trần Thị B</option>
                            </select>
                            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
                          </div>
                        </div>
                        <div className="col-span-6 md:col-span-2 flex flex-col gap-1">
                          <label className="text-[10px] font-semibold text-slate-500 uppercase">Thứ</label>
                          <div className="relative">
                            <select className="w-full h-8 px-2 border border-slate-300 rounded bg-white focus:outline-none text-xs appearance-none">
                              <option>Thứ 3</option>
                            </select>
                            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none md:hidden size={12}" />
                          </div>
                        </div>
                        <div className="col-span-6 md:col-span-2 flex flex-col gap-1">
                          <label className="text-[10px] font-semibold text-slate-500 uppercase">Phòng</label>
                          <input type="text" defaultValue="P.301" className="w-full h-8 px-2 border border-slate-300 rounded bg-white focus:outline-none text-xs" />
                        </div>
                        <div className="col-span-6 md:col-span-2 flex flex-col gap-1">
                          <label className="text-[10px] font-semibold text-slate-500 uppercase">Bắt đầu</label>
                          <input type="text" defaultValue="15/08/24" className="w-full h-8 px-2 border border-slate-300 rounded bg-white focus:outline-none text-xs" />
                        </div>
                        <div className="col-span-6 md:col-span-2 flex flex-col gap-1">
                          <label className="text-[10px] font-semibold text-slate-500 uppercase">Kết thúc</label>
                          <input type="text" defaultValue="15/12/24" className="w-full h-8 px-2 border border-slate-300 rounded bg-white focus:outline-none text-xs" />
                        </div>
                      </div>

                      <div className="flex justify-end md:block mt-2 md:mt-0">
                        <button onClick={() => setDeleteConfirm({type: 'group', id: 'Tổ 1'})} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded transition-colors ml-2">
                          <X size={16} />
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
      
      {/* CUSTOM DELETE CONFIRM MODAL FOR CREATE CLASS MODAL */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: "12px", width: "400px", maxWidth: "90%", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)", overflow: "hidden" }}>
            <div style={{ padding: "20px", display: "flex", gap: "15px" }}>
              <div style={{ background: "#fee2e2", width: "48px", height: "48px", borderRadius: "50%", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <AlertTriangle size={24} color="#ef4444" />
              </div>
              <div>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "1.1rem", color: "#0f172a" }}>Xác nhận xóa {deleteConfirm.type === 'class' ? 'lớp' : 'tổ'}</h3>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "#475569", lineHeight: "1.5" }}>
                  Bạn có chắc chắn muốn xóa {deleteConfirm.type === 'class' ? 'toàn bộ' : ''} <strong>{deleteConfirm.id}</strong> không? Hành động này không thể hoàn tác.
                </p>
              </div>
            </div>
            <div style={{ padding: "12px 20px", background: "#f8fafc", display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0" }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ padding: "8px 16px", borderRadius: "6px", background: "#fff", border: "1px solid #cbd5e1", color: "#475569", fontWeight: "600", cursor: "pointer" }}>
                Hủy
              </button>
              <button 
                onClick={() => setDeleteConfirm(null)} 
                style={{ padding: "8px 16px", borderRadius: "6px", background: "#ef4444", border: "none", color: "#fff", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Trash2 size={16} /> Xóa {deleteConfirm.type === 'class' ? 'lớp' : 'tổ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}