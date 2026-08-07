import React, { useState } from 'react';
import { Plus, Trash2, X, Save, Copy, LibraryAdd, AutoFixHigh, Group, CalendarMonth, ChevronRight } from 'lucide-react';
import SearchableSelect from '../common/SearchableSelect';
import { batchCreateCreditClasses } from '../../../api/creditClasses';

export default function CreateWizardModal({
    onClose, onSuccess, semesters, subjects, lecturers,
    adminClasses, showToast, defaultSemesterId
}) {
    const [wizardData, setWizardData] = useState({
        semester_id: defaultSemesterId || (semesters?.[0]?.value || ""),
        subject_id: "",
        allow_registration: true,
        is_advanced: false,
        note: "",
        groups: [{
            id: Date.now(),
            group_number: 1,
            lecturer_id: "",
            max_students: 60,
            target_classes: [],
            schedule_day: "Thứ 2",
            schedule_room: "301-A2",
            start_date: "2024-08-15",
            end_date: "2024-12-30",
            sub_groups: [
                { id: Date.now() + 1, sub_group_number: 1, lecturer_id: "", max_students: 30, schedule_day: "Thứ 3", schedule_room: "P.301", start_date: "2024-08-15", end_date: "2024-12-15" }
            ]
        }]
    });

    const [selectedSubject, setSelectedSubject] = useState(null);

    const formatGroupNumber = (num) => String(num || 1).padStart(2, '0');

    const generateEmptyGroup = (index = 0) => ({
        id: Date.now() + Math.random(),
        group_number: index + 1,
        lecturer_id: "",
        max_students: 60,
        target_classes: [],
        schedule_day: "Thứ 2",
        schedule_room: "",
        start_date: "2024-08-15",
        end_date: "2024-12-30",
        sub_groups: []
    });

    const generateEmptySubGroup = (parentGroup) => ({
        id: Date.now() + Math.random(),
        sub_group_number: parentGroup.sub_groups.length + 1,
        lecturer_id: parentGroup.lecturer_id,
        max_students: 30,
        schedule_day: "",
        schedule_room: "",
        start_date: parentGroup.start_date,
        end_date: parentGroup.end_date
    });

    // --- Các hàm thao tác state nội bộ ---
    const addGroup = () => setWizardData(p => ({ 
        ...p, 
        groups: [...p.groups, generateEmptyGroup(p.groups.length)] 
    }));

    const removeGroup = (groupId) => setWizardData(p => {
        const filtered = p.groups.filter(g => g.id !== groupId);
        return { ...p, groups: filtered.map((g, idx) => ({ ...g, group_number: idx + 1 })) };
    });

    const duplicateGroup = (group) => setWizardData(p => {
        const newGroup = {
            ...group,
            id: Date.now() + Math.random(),
            group_number: p.groups.length + 1,
            sub_groups: group.sub_groups.map(sg => ({ ...sg, id: Date.now() + Math.random() }))
        };
        return { ...p, groups: [...p.groups, newGroup] };
    });

    const addSubGroup = (groupId) => setWizardData(p => ({
        ...p, 
        groups: p.groups.map(g => g.id === groupId ? { ...g, sub_groups: [...g.sub_groups, generateEmptySubGroup(g)] } : g)
    }));

    const removeSubGroup = (groupId, subId) => setWizardData(p => ({
        ...p, 
        groups: p.groups.map(g => g.id === groupId ? {
            ...g, 
            sub_groups: g.sub_groups.filter(sg => sg.id !== subId).map((sg, idx) => ({ ...sg, sub_group_number: idx + 1 }))
        } : g)
    }));

    const updateGroup = (id, field, value) => setWizardData(p => ({
        ...p, 
        groups: p.groups.map(g => g.id === id ? { ...g, [field]: value } : g)
    }));

    const updateSubGroup = (gId, sgId, field, value) => setWizardData(p => ({
        ...p, 
        groups: p.groups.map(g => g.id === gId ? {
            ...g, 
            sub_groups: g.sub_groups.map(sg => sg.id === sgId ? { ...sg, [field]: value } : sg)
        } : g)
    }));

    const handleAutoSplitSubGroups = (groupId) => {
        setWizardData(p => ({
            ...p,
            groups: p.groups.map(g => {
                if (g.id !== groupId) return g;
                const totalStudents = g.max_students || 60;
                const subLimit = 30;
                const count = Math.ceil(totalStudents / subLimit);
                const newSubGroups = [];
                for (let i = 0; i < count; i++) {
                    const remaining = totalStudents - (i * subLimit);
                    const cap = remaining > subLimit ? subLimit : remaining;
                    newSubGroups.push({
                        id: Date.now() + Math.random() + i,
                        sub_group_number: i + 1,
                        lecturer_id: g.lecturer_id,
                        max_students: cap,
                        schedule_day: g.schedule_day,
                        schedule_room: g.schedule_room,
                        start_date: g.start_date,
                        end_date: g.end_date
                    });
                }
                return { ...g, sub_groups: newSubGroups };
            })
        }));
        showToast?.("Đã tự động chia tổ thực hành thành công!", "success");
    };

    const handleSubmit = async () => {
        try {
            await batchCreateCreditClasses(wizardData);
            showToast?.("Tạo lớp tín chỉ thành công!", "success");
            onSuccess?.();
            onClose?.();
        } catch (error) {
            showToast?.(error.message || "Có lỗi xảy ra khi tạo lớp.", "error");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto p-4">
            <div className="bg-surface w-full max-w-6xl rounded-2xl shadow-2xl border border-outline-variant flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                
                {/* Modal Header */}
                <div className="flex justify-between items-center px-6 py-4 bg-primary text-on-primary">
                    <div>
                        <div className="flex items-center gap-2 text-on-primary/80 text-xs uppercase tracking-wider mb-1">
                            <span>Quản lý đào tạo</span>
                            <ChevronRight size={14} />
                            <span>Lớp tín chỉ</span>
                        </div>
                        <h2 className="text-xl font-bold font-manrope">Tạo lớp tín chỉ mới</h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-on-primary/10 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 bg-background">
                    
                    {/* Left Column: Core Setup */}
                    <div className="xl:col-span-8 flex flex-col gap-6">
                        
                        {/* Section 1: Thông tin môn học */}
                        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                            <h3 className="text-base font-bold text-on-surface mb-4 flex items-center gap-2 font-manrope">
                                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">1</span>
                                Thông tin môn học
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs text-on-surface-variant font-medium">Chọn môn học</label>
                                    <SearchableSelect 
                                        options={subjects}
                                        value={wizardData.subject_id}
                                        onChange={(val) => {
                                            setWizardData(p => ({ ...p, subject_id: val }));
                                            const sub = subjects.find(s => s.value === val);
                                            setSelectedSubject(sub);
                                        }}
                                        placeholder="Nhập mã hoặc tên môn học..."
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs text-on-surface-variant font-medium">Học kỳ / Năm học</label>
                                    <select 
                                        value={wizardData.semester_id}
                                        onChange={(e) => setWizardData(p => ({ ...p, semester_id: e.target.value }))}
                                        className="w-full h-11 px-3 border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm bg-surface"
                                    >
                                        {semesters?.map(sem => (
                                            <option key={sem.value} value={sem.value}>{sem.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {selectedSubject && (
                                <div className="mt-4 p-3 bg-surface-container-low rounded-lg border border-outline-variant flex justify-between items-center">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-on-surface text-sm">{selectedSubject.label}</span>
                                            <span className="px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded text-[10px] font-bold">{selectedSubject.code}</span>
                                        </div>
                                        <div className="text-xs text-on-surface-variant mt-1">
                                            Số tín chỉ: {selectedSubject.credits || 3} • {selectedSubject.department || 'Khoa Công nghệ thông tin'}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => { setSelectedSubject(null); setWizardData(p => ({ ...p, subject_id: "" })); }}
                                        className="text-error hover:bg-error/10 p-1.5 rounded-full transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Section 2: Cấu trúc lớp tín chỉ */}
                        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-base font-bold text-on-surface flex items-center gap-2 font-manrope">
                                    <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">2</span>
                                    Cấu trúc lớp tín chỉ
                                </h3>
                                <button 
                                    onClick={addGroup}
                                    className="text-primary text-xs font-bold flex items-center gap-1 hover:bg-primary/5 px-3 py-2 rounded-lg transition-colors border border-primary/20"
                                >
                                    <Plus size={14} /> Thêm lớp
                                </button>
                            </div>

                            {/* List of Groups */}
                            <div className="space-y-4">
                                {wizardData.groups.map((group, gIdx) => (
                                    <div key={group.id} className="border border-outline-variant rounded-xl overflow-hidden shadow-sm bg-surface">
                                        
                                        {/* Group Header */}
                                        <div className="bg-surface-container-low px-4 py-3 flex justify-between items-center border-b border-outline-variant">
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-on-surface text-sm">Lớp {formatGroupNumber(group.group_number)}</span>
                                                <span className="px-2 py-1 bg-surface rounded border border-outline-variant text-xs flex items-center gap-1.5">
                                                    <Group size={14} className="text-primary" /> Sĩ số max: 
                                                    <input 
                                                        type="number" 
                                                        value={group.max_students}
                                                        onChange={(e) => updateGroup(group.id, 'max_students', Number(e.target.value))}
                                                        className="w-12 h-6 p-1 border border-outline-variant rounded text-center text-xs font-bold" 
                                                    />
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => duplicateGroup(group)} className="text-on-surface-variant hover:text-primary p-1.5 rounded transition-colors" title="Nhân bản lớp">
                                                    <Copy size={16} />
                                                </button>
                                                {wizardData.groups.length > 1 && (
                                                    <button onClick={() => removeGroup(group.id)} className="text-error hover:bg-error/10 p-1.5 rounded transition-colors" title="Xóa lớp">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Group Body */}
                                        <div className="p-4 space-y-4">
                                            
                                            {/* Theory Group Setup */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                                                    <span className="text-xs font-bold text-on-surface uppercase tracking-wide">Nhóm lý thuyết (Bắt buộc)</span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pl-4">
                                                    <div className="md:col-span-4 flex flex-col gap-1">
                                                        <label className="text-[11px] text-on-surface-variant font-medium">Giảng viên</label>
                                                        <select 
                                                            value={group.lecturer_id}
                                                            onChange={(e) => updateGroup(group.id, 'lecturer_id', e.target.value)}
                                                            className="w-full h-9 px-2 border border-outline-variant rounded text-xs bg-surface"
                                                        >
                                                            <option value="">-- Chọn giảng viên --</option>
                                                            {lecturers?.map(l => (
                                                                <option key={l.value} value={l.value}>{l.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="md:col-span-4 flex flex-col gap-1">
                                                        <label className="text-[11px] text-on-surface-variant font-medium">Lớp biên chế mục tiêu</label>
                                                        <select 
                                                            className="w-full h-9 px-2 border border-outline-variant rounded text-xs bg-surface"
                                                        >
                                                            <option value="">Tất cả / Tự do</option>
                                                            {adminClasses?.map(ac => (
                                                                <option key={ac.value} value={ac.value}>{ac.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="md:col-span-4 flex flex-col gap-1">
                                                        <label className="text-[11px] text-on-surface-variant font-medium">Lịch học & Phòng</label>
                                                        <div className="grid grid-cols-2 gap-1">
                                                            <select 
                                                                value={group.schedule_day}
                                                                onChange={(e) => updateGroup(group.id, 'schedule_day', e.target.value)}
                                                                className="h-9 px-1 border border-outline-variant rounded text-xs bg-surface"
                                                            >
                                                                {["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"].map(d => (
                                                                    <option key={d} value={d}>{d}</option>
                                                                ))}
                                                            </select>
                                                            <input 
                                                                type="text" 
                                                                value={group.schedule_room}
                                                                onChange={(e) => updateGroup(group.id, 'schedule_room', e.target.value)}
                                                                placeholder="Phòng" 
                                                                className="h-9 px-2 border border-outline-variant rounded text-xs bg-surface" 
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="md:col-span-6 flex flex-col gap-1">
                                                        <label className="text-[11px] text-on-surface-variant font-medium">Ngày bắt đầu</label>
                                                        <input 
                                                            type="date" 
                                                            value={group.start_date}
                                                            onChange={(e) => updateGroup(group.id, 'start_date', e.target.value)}
                                                            className="w-full h-9 px-2 border border-outline-variant rounded text-xs bg-surface" 
                                                        />
                                                    </div>
                                                    <div className="md:col-span-6 flex flex-col gap-1">
                                                        <label className="text-[11px] text-on-surface-variant font-medium">Ngày kết thúc</label>
                                                        <input 
                                                            type="date" 
                                                            value={group.end_date}
                                                            onChange={(e) => updateGroup(group.id, 'end_date', e.target.value)}
                                                            className="w-full h-9 px-2 border border-outline-variant rounded text-xs bg-surface" 
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Practice Sub-Groups Setup */}
                                            <div className="border-t border-outline-variant/60 pt-4">
                                                <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-secondary"></span>
                                                        <span className="text-xs font-bold text-on-surface uppercase tracking-wide">Tổ thực hành / Bài tập</span>
                                                        <span className="text-xs text-primary font-medium italic ml-2">
                                                            ({group.max_students} SV / 30 SV max = {Math.ceil(group.max_students / 30)} tổ)
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => handleAutoSplitSubGroups(group.id)}
                                                            className="h-8 px-3 bg-primary/10 text-primary text-xs font-bold rounded-lg flex items-center gap-1 hover:bg-primary/20 transition-colors"
                                                        >
                                                            <AutoFixHigh size={14} /> Tự động chia tổ
                                                        </button>
                                                        <button 
                                                            onClick={() => addSubGroup(group.id)}
                                                            className="text-primary text-xs font-bold hover:underline px-2"
                                                        >
                                                            + Thêm tổ TH
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 pl-4">
                                                    {group.sub_groups.map((sg, sgIdx) => (
                                                        <div key={sg.id} className="flex flex-wrap md:flex-nowrap gap-2 items-center bg-surface-container-low p-2.5 rounded-lg border border-outline-variant/50">
                                                            <div className="w-20 flex flex-col">
                                                                <span className="text-xs font-bold text-on-surface">Tổ {sg.sub_group_number}</span>
                                                                <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded w-fit mt-0.5 font-medium">Sĩ số: {sg.max_students}</span>
                                                            </div>
                                                            <div className="flex-1 min-w-[140px]">
                                                                <label className="text-[9px] text-on-surface-variant uppercase mb-0.5 block font-bold">Giảng viên TH</label>
                                                                <select 
                                                                    value={sg.lecturer_id}
                                                                    onChange={(e) => updateSubGroup(group.id, sg.id, 'lecturer_id', e.target.value)}
                                                                    className="w-full h-8 px-2 border border-outline-variant rounded text-xs bg-surface"
                                                                >
                                                                    <option value="">-- Chọn giảng viên --</option>
                                                                    {lecturers?.map(l => (
                                                                        <option key={l.value} value={l.value}>{l.label}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div className="flex-1 min-w-[140px] grid grid-cols-2 gap-1">
                                                                <div>
                                                                    <label className="text-[9px] text-on-surface-variant uppercase mb-0.5 block font-bold">Thứ</label>
                                                                    <select 
                                                                        value={sg.schedule_day}
                                                                        onChange={(e) => updateSubGroup(group.id, sg.id, 'schedule_day', e.target.value)}
                                                                        className="w-full h-8 px-1 border border-outline-variant rounded text-xs bg-surface"
                                                                    >
                                                                        {["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"].map(d => (
                                                                            <option key={d} value={d}>{d}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="text-[9px] text-on-surface-variant uppercase mb-0.5 block font-bold">Phòng</label>
                                                                    <input 
                                                                        type="text" 
                                                                        value={sg.schedule_room}
                                                                        onChange={(e) => updateSubGroup(group.id, sg.id, 'schedule_room', e.target.value)}
                                                                        placeholder="Phòng TH" 
                                                                        className="w-full h-8 px-2 border border-outline-variant rounded text-xs bg-surface" 
                                                                    />
                                                                </div>
                                                            </div>
                                                            <button 
                                                                onClick={() => removeSubGroup(group.id, sg.id)}
                                                                className="text-error/70 hover:text-error p-1.5 rounded transition-colors mt-4 md:mt-0"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {group.sub_groups.length === 0 && (
                                                        <div className="text-center py-2 text-xs text-on-surface-variant italic">
                                                            Chưa có tổ thực hành nào. Nhấn "Thêm tổ TH" hoặc "Tự động chia tổ".
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-center mt-4">
                                <button 
                                    onClick={addGroup}
                                    className="px-4 py-2 border border-dashed border-outline-variant rounded-xl text-on-surface-variant hover:text-primary hover:border-primary hover:bg-primary/5 transition-colors text-xs font-bold flex items-center gap-2"
                                >
                                    <LibraryAdd size={16} /> Tạo nhanh nhiều lớp
                                </button>
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Settings & Bulk Actions */}
                    <div className="xl:col-span-4 flex flex-col gap-6">
                        
                        {/* General Settings */}
                        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                            <h3 className="text-base font-bold text-on-surface mb-4 font-manrope">Cài đặt chung</h3>
                            <div className="space-y-4">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={wizardData.allow_registration}
                                        onChange={(e) => setWizardData(p => ({ ...p, allow_registration: e.target.checked }))}
                                        className="mt-1 w-4 h-4 text-primary rounded border-outline-variant focus:ring-primary" 
                                    />
                                    <div>
                                        <span className="text-sm font-bold text-on-surface block">Cho phép sinh viên đăng ký</span>
                                        <span className="text-xs text-on-surface-variant">Lớp sẽ hiển thị trong đợt đăng ký tín chỉ sắp tới.</span>
                                    </div>
                                </label>

                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={wizardData.is_advanced}
                                        onChange={(e) => setWizardData(p => ({ ...p, is_advanced: e.target.checked }))}
                                        className="mt-1 w-4 h-4 text-primary rounded border-outline-variant focus:ring-primary" 
                                    />
                                    <div>
                                        <span className="text-sm font-bold text-on-surface block">Lớp đặc thù / Tiên tiến</span>
                                        <span className="text-xs text-on-surface-variant">Yêu cầu điều kiện đặc biệt để đăng ký.</span>
                                    </div>
                                </label>

                                <div className="flex flex-col gap-1.5 pt-2">
                                    <label className="text-xs text-on-surface-variant font-medium">Ghi chú (Hiển thị cho SV)</label>
                                    <textarea 
                                        rows={3}
                                        value={wizardData.note}
                                        onChange={(e) => setWizardData(p => ({ ...p, note: e.target.value }))}
                                        placeholder="Ví dụ: Lớp học bằng tiếng Anh, học tại cơ sở Quận 9..."
                                        className="w-full p-3 border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none text-xs bg-surface resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Bulk Actions */}
                        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                            <h3 className="text-base font-bold text-on-surface mb-3 flex items-center gap-2 font-manrope text-primary">
                                <AutoFixHigh size={18} /> Thao tác hàng loạt
                            </h3>
                            <p className="text-xs text-on-surface-variant mb-4">Áp dụng cấu hình cho tất cả các lớp tín chỉ đang tạo.</p>
                            <div className="space-y-3">
                                <button 
                                    onClick={() => showToast?.("Đã tự động phân phòng học tối ưu.", "success")}
                                    className="w-full h-10 border border-outline-variant rounded-lg text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors"
                                >
                                    Hệ thống tự phân phòng học
                                </button>
                                <button 
                                    onClick={() => showToast?.("Đã đồng bộ sĩ số các tổ thực hành.", "success")}
                                    className="w-full h-10 border border-outline-variant rounded-lg text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors"
                                >
                                    Đồng bộ sĩ số các tổ TH
                                </button>
                            </div>
                        </div>

                    </div>

                </div>

                {/* Modal Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 bg-surface-container-low border-t border-outline-variant">
                    <button 
                        onClick={onClose}
                        className="h-10 px-5 border border-primary text-primary text-sm font-bold rounded-lg hover:bg-primary/5 transition-colors"
                    >
                        Hủy
                    </button>
                    <button 
                        onClick={handleSubmit}
                        className="h-10 px-6 bg-primary text-on-primary text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2"
                    >
                        <Save size={16} /> Lưu thay đổi
                    </button>
                </div>

            </div>
        </div>
    );
}