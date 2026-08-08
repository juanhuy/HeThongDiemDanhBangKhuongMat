import React, { useMemo, useState, useEffect } from 'react';
import { Plus, X, Save, BookPlus, ChevronRight, Sparkles } from 'lucide-react';
import SearchableSelect from '../../common/SearchableSelect';
import { batchCreateCreditClasses, listSemesters } from '../../../api/creditClasses';
import GroupCard from './GroupCard';
import styles from './Styles';

export default function CreateWizardModal({
    onClose, 
    onSuccess, 
    semesters, 
    subjects, 
    lecturers,
    adminClasses, 
    rooms, 
    showToast, 
    defaultSemesterId,
    // --- Bổ sung props hỗ trợ Chỉnh sửa ---
    initialData = null,
    onUpdate = null,
    isEdit = false
}) {
    // Xác định chế độ Sửa hay Tạo
    const isEditMode = isEdit || Boolean(initialData);

    const [localSemesters, setLocalSemesters] = useState(semesters || []);

    const resolvedSemesters = useMemo(() => {
        if (Array.isArray(localSemesters) && localSemesters.length > 0) {
            return localSemesters.map((sem) => ({
                value: sem.value ?? sem.semester_id ?? sem.id ?? "",
                label: sem.label || sem.semester_id || `${sem.semester ? `Học kỳ ${sem.semester}` : ""}${sem.academic_year ? ` (${sem.academic_year})` : ""}`.trim() || 'Học kỳ'
            })).filter((item) => item.value);
        }

        return [];
    }, [localSemesters]);

    const resolvedRooms = useMemo(() => {
        if (Array.isArray(rooms) && rooms.length > 0) {
            return rooms.map((room) => ({
                value: room.room_id || room.id || room.value || room.room_name || "",
                label: room.room_name || room.room_id || room.name || room.label || "Phòng học",
                subtitle: [room.building, room.room_type].filter(Boolean).join(" • ")
            })).filter((item) => item.value);
        }

        return [
            { value: "A101", label: "A101", subtitle: "Phòng lý thuyết" },
            { value: "A102", label: "A102", subtitle: "Phòng lý thuyết" },
            { value: "P.301", label: "P.301", subtitle: "Phòng thực hành" },
            { value: "LAB-1", label: "LAB-1", subtitle: "Phòng lab" },
        ];
    }, [rooms]);

    // Khởi tạo State wizardData
    const [wizardData, setWizardData] = useState({
        semester_id: "",
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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadingSemesters, setLoadingSemesters] = useState(false);

    const formatGroupNumber = (num) => String(num || 1).padStart(2, '0');

    // Nạp dữ liệu cũ vào state khi ở chế độ EDIT
    useEffect(() => {
        if (initialData) {
            setWizardData({
                semester_id: initialData.semester_id || defaultSemesterId || "",
                subject_id: initialData.subject_id || "",
                allow_registration: initialData.allow_registration ?? true,
                is_advanced: initialData.is_advanced ?? false,
                note: initialData.note || "",
                groups: Array.isArray(initialData.groups) && initialData.groups.length > 0
                    ? initialData.groups.map((g, idx) => ({
                        id: g.id || Date.now() + idx,
                        group_number: g.group_number || g.class_group || idx + 1,
                        lecturer_id: g.lecturer_id || "",
                        max_students: g.max_students || 60,
                        target_classes: g.target_classes || [],
                        schedule_day: g.schedule_day || "Thứ 2",
                        schedule_room: g.schedule_room || "",
                        start_date: g.start_date || "2024-08-15",
                        end_date: g.end_date || "2024-12-30",
                        sub_groups: Array.isArray(g.sub_groups) ? g.sub_groups.map((sg, sgIdx) => ({
                            id: sg.id || Date.now() + sgIdx + 100,
                            sub_group_number: sg.sub_group_number || sgIdx + 1,
                            lecturer_id: sg.lecturer_id || g.lecturer_id || "",
                            max_students: sg.max_students || 30,
                            schedule_day: sg.schedule_day || "",
                            schedule_room: sg.schedule_room || "",
                            start_date: sg.start_date || g.start_date || "2024-08-15",
                            end_date: sg.end_date || g.end_date || "2024-12-30"
                        })) : []
                    }))
                    : []
            });
        }
    }, [initialData, defaultSemesterId]);

    // Tự động tìm thông tin Subject chi tiết dựa trên subject_id
    useEffect(() => {
        if (wizardData.subject_id && Array.isArray(subjects)) {
            const sub = subjects.find(s => s.value === wizardData.subject_id || s.id === wizardData.subject_id);
            if (sub) {
                setSelectedSubject(sub);
            }
        }
    }, [wizardData.subject_id, subjects]);

    useEffect(() => {
        if (!wizardData.semester_id && defaultSemesterId && !isEditMode) {
            setWizardData((prev) => ({ ...prev, semester_id: defaultSemesterId }));
        }
    }, [defaultSemesterId, isEditMode]);

    useEffect(() => {
        if ((!Array.isArray(semesters) || semesters.length === 0) && !loadingSemesters) {
            setLoadingSemesters(true);
            listSemesters()
                .then((res) => {
                    const data = Array.isArray(res) ? res : res?.data || [];
                    setLocalSemesters(data);
                    if (!wizardData.semester_id && data[0]?.semester_id && !isEditMode) {
                        setWizardData((prev) => ({ ...prev, semester_id: data[0].semester_id }));
                    }
                })
                .catch((err) => {
                    console.error('Lỗi tải học kỳ từ BE:', err);
                })
                .finally(() => setLoadingSemesters(false));
        }
    }, [semesters, loadingSemesters, wizardData.semester_id, isEditMode]);

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

    // --- Các hàm thao tác state ---
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

    const buildBatchPayload = (data) => ({
        ...(isEditMode && initialData?.id ? { id: initialData.id } : {}),
        subject_id: data.subject_id,
        semester_id: data.semester_id,
        lecturer_id: data.groups?.[0]?.lecturer_id || data.lecturer_id || null,
        allow_registration: data.allow_registration,
        is_advanced: data.is_advanced,
        note: data.note,
        groups: Array.isArray(data.groups)
            ? data.groups.map((group) => ({
                class_group: formatGroupNumber(group.group_number || group.class_group || 1),
                class_type: "Theory",
                max_students: Number(group.max_students || 0),
                target_classes: Array.isArray(group.target_classes) ? group.target_classes : [],
                sub_groups: Array.isArray(group.sub_groups)
                    ? group.sub_groups.map((sub) => ({
                        class_group: `Tổ ${sub.sub_group_number || sub.class_group || "1"}`,
                        max_students: Number(sub.max_students || 0),
                        class_type: sub.class_type || "Practice"
                    }))
                    : []
            }))
            : []
    });

    const handleSubmit = async () => {
        if (!wizardData.subject_id) {
            return showToast?.('Vui lòng chọn môn học trước khi lưu.', 'error');
        }
        if (!wizardData.semester_id) {
            return showToast?.('Vui lòng chọn học kỳ trước khi lưu.', 'error');
        }
        if (!resolvedSemesters?.find((sem) => sem.value === wizardData.semester_id)) {
            return showToast?.('Học kỳ không hợp lệ. Vui lòng chọn lại.', 'error');
        }
        if (!Array.isArray(wizardData.groups) || wizardData.groups.length === 0) {
            return showToast?.('Vui lòng tạo ít nhất một nhóm lớp.', 'error');
        }

        for (const group of wizardData.groups) {
            if (!group.max_students || Number(group.max_students) <= 0) {
                return showToast?.(`Nhóm ${group.group_number || ''} cần nhập sĩ số tối đa lớn hơn 0.`, 'error');
            }
            for (const sub of group.sub_groups || []) {
                if (!sub.max_students || Number(sub.max_students) <= 0) {
                    return showToast?.(`Tổ ${sub.sub_group_number || ''} cần nhập sĩ số tối đa lớn hơn 0.`, 'error');
                }
            }
        }

        setIsSubmitting(true);
        try {
            const payload = buildBatchPayload(wizardData);

            if (isEditMode) {
                if (typeof onUpdate === 'function') {
                    await onUpdate(payload);
                } else {
                    await onSuccess?.(payload);
                }
                showToast?.("Cập nhật lớp tín chỉ thành công!", "success");
            } else {
                await batchCreateCreditClasses(payload);
                showToast?.("Tạo lớp tín chỉ thành công!", "success");
                onSuccess?.();
            }
            onClose?.();
        } catch (error) {
            showToast?.(error?.message || `Có lỗi xảy ra khi ${isEditMode ? 'cập nhật' : 'tạo'} lớp.`, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)', padding: '16px'
        }}>
            <div style={{
                ...styles.card,
                width: '100%', maxWidth: '1200px', maxHeight: 'calc(100vh - 32px)',
                display: 'flex', flexDirection: 'column', borderRadius: 16,
                overflow: 'visible'
            }}>
                
                {/* Modal Header */}
                <div style={{ ...styles.header, background: '#106fa6', color: '#fff', borderBottom: 'none' }}>
                    <div style={styles.titleWrapper}>
                        <ChevronRight style={{ ...styles.titleIcon, color: '#fff' }} />
                        <div>
                            <h2 style={{ ...styles.title, color: '#fff' }}>
                                {isEditMode ? "Chỉnh sửa lớp tín chỉ" : "Tạo lớp tín chỉ mới"}
                            </h2>
                            <p style={{ ...styles.description, color: 'rgba(255, 255, 255, 0.8)' }}>
                                {isEditMode ? "Quản lý đào tạo • Cập nhật thông tin lớp" : "Quản lý đào tạo • Khóa học mới"}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Modal Body */}
                <div style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(12, 1fr)',
                    gap: 16,
                    padding: 20
                }}>
                    
                    {/* Left Column */}
                    <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        
                        {/* Section 1: Thông tin môn học */}
                        <div style={{ ...styles.card, padding: 20, overflow: 'visible' }}>
                            <h3 style={{ ...styles.title, fontSize: '1rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{
                                    width: 28, height: 28, borderRadius: '50%', background: '#f0f9ff',
                                    color: '#106fa6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13
                                }}>1</span>
                                Thông tin môn học
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ ...styles.description, display: 'block', marginBottom: 6, fontSize: '0.75rem', fontWeight: 600 }}>
                                        Chọn môn học
                                    </label>
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
                                <div>
                                    <label style={{ ...styles.description, display: 'block', marginBottom: 6, fontSize: '0.75rem', fontWeight: 600 }}>
                                        Học kỳ / Năm học
                                    </label>
                                    <select 
                                        value={wizardData.semester_id}
                                        onChange={(e) => setWizardData(p => ({ ...p, semester_id: e.target.value }))}
                                        disabled={!resolvedSemesters.length}
                                        style={{
                                            width: '100%', height: 42, padding: '0 12px',
                                            border: '1px solid #d0e0eb', borderRadius: 8, background: '#fff',
                                            color: '#1e293b', fontSize: '0.875rem', outline: 'none',
                                            opacity: resolvedSemesters.length ? 1 : 0.6,
                                            cursor: resolvedSemesters.length ? 'pointer' : 'not-allowed'
                                        }}
                                    >
                                        <option value="" disabled>
                                            {resolvedSemesters.length ? 'Chọn học kỳ' : 'Chưa có học kỳ khả dụng'}
                                        </option>
                                        {resolvedSemesters.map(sem => (
                                            <option key={sem.value} value={sem.value}>{sem.label}</option>
                                        ))}
                                    </select>
                                    {!resolvedSemesters.length && (
                                        <div style={{ marginTop: 8, color: '#b91c1c', fontSize: '0.75rem' }}>
                                            Hiện chưa có học kỳ thực tế từ backend. Vui lòng kiểm tra dữ liệu học kỳ.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedSubject && (
                                <div style={{
                                    marginTop: 12, padding: 12, background: '#f8fafc',
                                    border: '1px solid #d0e0eb', borderRadius: 8,
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.875rem' }}>{selectedSubject.label}</span>
                                            <span style={{ padding: '2px 6px', background: '#e0f2fe', color: '#106fa6', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 }}>
                                                {selectedSubject.code}
                                            </span>
                                        </div>
                                        <p style={{ ...styles.description, fontSize: '0.75rem', marginTop: 4 }}>
                                            Số tín chỉ: {selectedSubject.credits || 3} &bull; {selectedSubject.department || 'Khoa Công nghệ thông tin'}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => { setSelectedSubject(null); setWizardData(p => ({ ...p, subject_id: "" })); }}
                                        style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer' }}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Section 2: Danh sách Lớp tín chỉ (GroupCards) */}
                        <div style={{ ...styles.card, padding: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h3 style={{ ...styles.title, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{
                                        width: 28, height: 28, borderRadius: '50%', background: '#f0f9ff',
                                        color: '#106fa6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13
                                    }}>2</span>
                                    Cấu trúc lớp tín chỉ
                                </h3>
                                <button onClick={addGroup} style={{ ...styles.secondaryButton, height: 36, borderColor: '#106fa6', color: '#106fa6' }}>
                                    <Plus size={16} /> Thêm lớp
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {wizardData.groups.map((group) => (
                                    <GroupCard
                                        key={group.id}
                                        group={group}
                                        lecturers={lecturers}
                                        adminClasses={adminClasses}
                                        canRemoveGroup={wizardData.groups.length > 1}
                                        formatGroupNumber={formatGroupNumber}
                                        onUpdateGroup={(field, value) => updateGroup(group.id, field, value)}
                                        onDuplicateGroup={() => duplicateGroup(group)}
                                        onRemoveGroup={() => removeGroup(group.id)}
                                        onAddSubGroup={() => addSubGroup(group.id)}
                                        onRemoveSubGroup={(subId) => removeSubGroup(group.id, subId)}
                                        onUpdateSubGroup={(subId, field, value) => updateSubGroup(group.id, subId, field, value)}
                                        onAutoSplitSubGroups={() => handleAutoSplitSubGroups(group.id)}
                                        rooms={resolvedRooms}
                                    />
                                ))}
                            </div>

                            <button 
                                onClick={addGroup}
                                style={{
                                    ...styles.secondaryButton,
                                    width: '100%', marginTop: 16, borderStyle: 'dashed',
                                    borderColor: '#d0e0eb', color: '#64748b'
                                }}
                            >
                                <BookPlus size={16} /> Tạo nhanh nhiều lớp
                            </button>
                        </div>

                    </div>

                    {/* Right Column: Cài đặt & Thao tác hàng loạt */}
                    <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        
                        <div style={{ ...styles.card, padding: 20 }}>
                            <h3 style={{ ...styles.title, fontSize: '1rem', marginBottom: 16 }}>Cài đặt chung</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <label style={{ display: 'flex', gap: 10, cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={wizardData.allow_registration}
                                        onChange={(e) => setWizardData(p => ({ ...p, allow_registration: e.target.checked }))}
                                        style={{ marginTop: 3 }}
                                    />
                                    <div>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', display: 'block' }}>Cho phép sinh viên đăng ký</span>
                                        <span style={{ ...styles.description, fontSize: '0.75rem' }}>Hiển thị trong đợt đăng ký tín chỉ</span>
                                    </div>
                                </label>

                                <label style={{ display: 'flex', gap: 10, cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={wizardData.is_advanced}
                                        onChange={(e) => setWizardData(p => ({ ...p, is_advanced: e.target.checked }))}
                                        style={{ marginTop: 3 }}
                                    />
                                    <div>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', display: 'block' }}>Lớp đặc thù / Tiên tiến</span>
                                        <span style={{ ...styles.description, fontSize: '0.75rem' }}>Yêu cầu điều kiện xét tuyển</span>
                                    </div>
                                </label>

                                <div style={{ marginTop: 8 }}>
                                    <label style={{ ...styles.description, fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                                        Ghi chú (Hiển thị cho SV)
                                    </label>
                                    <textarea 
                                        rows={3}
                                        value={wizardData.note}
                                        onChange={(e) => setWizardData(p => ({ ...p, note: e.target.value }))}
                                        placeholder="Ghi chú thêm..."
                                        style={{
                                            width: '100%', padding: 10, border: '1px solid #d0e0eb',
                                            borderRadius: 8, fontSize: '0.875rem', outline: 'none', resize: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ ...styles.card, padding: 20 }}>
                            <h3 style={{ ...styles.title, fontSize: '1rem', color: '#106fa6', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Sparkles size={18} /> Thao tác hàng loạt
                            </h3>
                            <p style={{ ...styles.description, fontSize: '0.75rem', marginBottom: 16 }}>Áp dụng cấu hình cho tất cả lớp đang tạo.</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <button 
                                    onClick={() => showToast?.("Đã tự động phân phòng học tối ưu.", "success")}
                                    style={{ ...styles.secondaryButton, width: '100%', height: 38, fontSize: '0.75rem' }}
                                >
                                    Hệ thống tự phân phòng học
                                </button>
                                <button 
                                    onClick={() => showToast?.("Đã đồng bộ sĩ số các tổ thực hành.", "success")}
                                    style={{ ...styles.secondaryButton, width: '100%', height: 38, fontSize: '0.75rem' }}
                                >
                                    Đồng bộ sĩ số các tổ TH
                                </button>
                            </div>
                        </div>

                    </div>

                </div>

                {/* Modal Footer */}
                <div style={{
                    ...styles.header,
                    justifyContent: 'flex-end',
                    background: '#f8fafc',
                    borderTop: '1px solid #d0e0eb',
                    gap: 12,
                    flexWrap: 'wrap'
                }}>
                    <button onClick={onClose} style={styles.secondaryButton}>
                        Hủy
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        style={{
                            ...styles.primaryButton,
                            opacity: isSubmitting ? 0.7 : 1,
                            cursor: isSubmitting ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <Save size={16} /> 
                        {isSubmitting 
                            ? (isEditMode ? 'Đang cập nhật...' : 'Đang tạo...') 
                            : (isEditMode ? 'Cập nhật' : 'Tạo lớp')
                        }
                    </button>
                </div>

            </div>
        </div>
    );
}