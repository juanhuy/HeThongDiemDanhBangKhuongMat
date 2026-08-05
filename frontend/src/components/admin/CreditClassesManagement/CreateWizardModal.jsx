import React, { useState } from 'react';
import { Plus, Trash2, X, Save } from 'lucide-react';
import SearchableSelect from '../common/SearchableSelect';
import { batchCreateCreditClasses } from '../../../api/creditClasses';

export default function CreateWizardModal({
    onClose, onSuccess, semesters, subjects, lecturers,
    adminClasses, showToast, defaultSemesterId
}) {
    const [wizardData, setWizardData] = useState({
        semester_id: defaultSemesterId || "",
        subject_id: "",
        groups: [{
            id: Date.now(), group_number: 1, lecturer_id: "",
            max_students: 100, target_classes: [], sub_groups: []
        }]
    });

    const getSemesterLabel = (id) => semesters.find(s => s.value === id)?.label || '';
    const formatGroupNumber = (num) => String(num || 1).padStart(2, '0');

    const generateEmptyGroup = (index = 0) => ({
        id: Date.now() + Math.random(), group_number: index + 1,
        lecturer_id: "", max_students: 100, target_classes: [], sub_groups: []
    });

    const generateEmptySubGroup = (parentGroup) => ({
        id: Date.now() + Math.random(), sub_group_number: parentGroup.sub_groups.length + 1,
        lecturer_id: parentGroup.lecturer_id, max_students: 40
    });

    // --- Các hàm thao tác state nội bộ ---
    const addGroup = () => setWizardData(p => ({ ...p, groups: [...p.groups, generateEmptyGroup(p.groups.length)] }));
    const removeGroup = (groupId) => setWizardData(p => {
        const filtered = p.groups.filter(g => g.id !== groupId);
        return { ...p, groups: filtered.map((g, idx) => ({ ...g, group_number: idx + 1 })) };
    });
    const addSubGroup = (groupId) => setWizardData(p => ({
        ...p, groups: p.groups.map(g => g.id === groupId ? { ...g, sub_groups: [...g.sub_groups, generateEmptySubGroup(g)] } : g)
    }));
    const removeSubGroup = (groupId, subId) => setWizardData(p => ({
        ...p, groups: p.groups.map(g => g.id === groupId ? {
            ...g, sub_groups: g.sub_groups.filter(sg => sg.id !== subId).map((sg, idx) => ({ ...sg, sub_group_number: idx + 1 }))
        } : g)
    }));
    const updateGroup = (id, field, value) => setWizardData(p => ({
        ...p, groups: p.groups.map(g => g.id === id ? { ...g, [field]: value } : g)
    }));
    const updateSubGroup = (gId, sgId, field, value) => setWizardData(p => ({
        ...p, groups: p.groups.map(g => g.id === gId ? {
            ...g, sub_groups: g.sub_groups.map(sg => sg.id === sgId ? { ...sg, [field]: value } : sg)
        } : g)
    }));

    const handleSaveDraft = async () => {
        if (!wizardData.subject_id) return showToast?.('Vui lòng chọn Môn học!', 'error');
        if (wizardData.groups.some(g => !g.lecturer_id || !g.max_students))
            return showToast?.('Vui lòng điền đủ Giảng viên và Sĩ số cho tất cả Nhóm!', 'error');

        for (const g of wizardData.groups) {
            if (g.sub_groups.length > 0) {
                const sum = g.sub_groups.reduce((acc, sg) => acc + (Number(sg.max_students) || 0), 0);
                if (sum !== Number(g.max_students)) {
                    return showToast?.(`Nhóm ${formatGroupNumber(g.group_number)}: Tổng sĩ số các Tổ (${sum}) phải bằng sĩ số Nhóm (${g.max_students})`, 'error');
                }
            }
        }

        try {
            const payload = {
                subject_id: wizardData.subject_id,
                lecturer_id: wizardData.groups[0]?.lecturer_id || "UNKNOWN",
                semester_id: wizardData.semester_id,
                groups: wizardData.groups.map(g => ({
                    class_group: formatGroupNumber(g.group_number),
                    max_students: g.max_students,
                    class_type: g.sub_groups.length > 0 ? "Theory" : "Combined",
                    target_classes: g.target_classes,
                    lecturer_id: g.lecturer_id,
                    sub_groups: g.sub_groups.map(sg => ({
                        class_group: formatGroupNumber(sg.sub_group_number),
                        max_students: sg.max_students,
                        class_type: "Practice",
                        lecturer_id: sg.lecturer_id
                    }))
                }))
            };

            const res = await batchCreateCreditClasses(payload);
            if (!res.ok) throw new Error('Failed to save');

            showToast?.('Lưu lớp thành công!', 'success');
            onSuccess(); // Triger load data lại ở component cha
            onClose(); // Đóng modal
        } catch (error) {
            showToast?.('Lỗi khi lưu lớp!', 'error');
        }
    };

    const inputCls = "w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500 bg-white";
    const labelCls = "block text-xs font-medium text-slate-600 mb-1.5";

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* ... [Gắn nguyên phần HTML form Create Wizard từ file cũ vào đây] ... */}
            {/* (Lưu ý: Thay thế các thẻ đóng mở để phù hợp, cấu trúc y hệt file ban đầu) */}
            <div className="bg-white w-full max-w-[880px] max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">

                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
                    <h2 className="text-base font-semibold text-blue-800">Cấu hình Nhóm & Tổ</h2>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100"><X size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {/* 1. Thông tin chung */}
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">1. Thông tin chung</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label className={labelCls}>Học kỳ <span className="text-red-500">*</span></label>
                                <SearchableSelect
                                    options={semesters} value={wizardData.semester_id}
                                    onChange={(val) => setWizardData(prev => ({ ...prev, semester_id: val }))}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Môn học <span className="text-red-500">*</span></label>
                                <SearchableSelect
                                    options={subjects} value={wizardData.subject_id}
                                    onChange={(val) => setWizardData(prev => ({ ...prev, subject_id: val }))}
                                />
                            </div>
                        </div>
                    </div>

                    {/* [Tiếp tục code giao diện map Groups & SubGroups từ file gốc của bạn] */}
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-slate-200 bg-slate-50 shrink-0">
                    <button onClick={onClose} className="px-4 py-2 rounded-md border text-sm font-medium hover:bg-white">Hủy</button>
                    <button onClick={handleSaveDraft} className="px-5 py-2 rounded-md bg-[#d32f2f] text-white text-sm hover:bg-red-700 flex items-center gap-1.5">
                        <Save size={16} /> Lưu tất cả
                    </button>
                </div>
            </div>
        </div>
    );
}