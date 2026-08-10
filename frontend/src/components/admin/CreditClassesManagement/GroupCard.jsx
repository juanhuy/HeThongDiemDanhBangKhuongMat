import React, { useState } from 'react';
import { Group, Copy, Trash2, Sparkles, X, Plus, CheckSquare, Square } from 'lucide-react';
import styles from './styles';

export default function GroupCard({
    group,
    lecturers,
    adminClasses = [],
    canRemoveGroup,
    formatGroupNumber,
    onUpdateGroup,
    onDuplicateGroup,
    onRemoveGroup,
    onAddSubGroup,
    onRemoveSubGroup,
    onUpdateSubGroup,
    onAutoSplitSubGroups,
    hasPracticalCredits = false
}) {
    const [isAdminDropdownOpen, setAdminDropdownOpen] = useState(false);

    const inputStyle = {
        height: 42,
        padding: '0 12px',
        border: '1px solid #d0e0eb',
        borderRadius: 8,
        background: '#fff',
        color: '#1e293b',
        fontSize: '0.875rem',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box'
    };

    const lecturerOptions = Array.isArray(lecturers)
        ? lecturers.map((l) => ({
            value: String(l.value ?? l.lecturer_id ?? l.id ?? ""),
            label: l.label ?? l.full_name ?? l.name ?? l.value ?? l.lecturer_id ?? "Không xác định",
        }))
        : [];

    return (
        <div style={{ ...styles.card, borderRadius: 16 }}>
            
            {/* Header Lớp */}
            <div style={{ ...styles.header, padding: '12px 16px', background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ ...styles.title, fontSize: '0.95rem' }}>
                        Lớp {formatGroupNumber(group.group_number)}
                    </span>
                    <div style={{ ...styles.selectedBox, background: '#fff', padding: '4px 8px' }}>
                        <Group size={14} style={{ color: '#106fa6' }} />
                        <span style={{ ...styles.selectedText, padding: 0 }}>Sĩ số max:</span>
                        <input 
                            type="number" 
                            value={group.max_students}
                            onChange={(e) => onUpdateGroup('max_students', Number(e.target.value))}
                            style={{ width: 48, height: 24, textAlign: 'center', border: '1px solid #d0e0eb', borderRadius: 4, fontWeight: 700 }} 
                        />
                    </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button 
                        onClick={onDuplicateGroup} 
                        style={{ ...styles.secondaryButton, height: 32, padding: '0 8px', border: 'none' }}
                        title="Nhân bản lớp"
                    >
                        <Copy size={16} />
                    </button>
                    {canRemoveGroup && (
                        <button 
                            onClick={onRemoveGroup} 
                            style={{ ...styles.secondaryButton, height: 32, padding: '0 8px', border: 'none', color: '#b91c1c' }}
                            title="Xóa lớp"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Content Lớp */}
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                {/* Nhóm Lý Thuyết */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#106fa6' }}></span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>
                            Nhóm lý thuyết (Bắt buộc)
                        </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 10 }}>
                            <div style={{ gridColumn: 'span 4' }}>
                            <label style={{ ...styles.description, fontSize: '0.75rem', display: 'block', marginBottom: 4 }}>Lớp biên chế</label>
                            <div style={{ position: 'relative' }}>
                                <button
                                    type="button"
                                    onClick={() => setAdminDropdownOpen((prev) => !prev)}
                                    style={{
                                        ...inputStyle,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}
                                >
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {Array.isArray(group.target_classes) && group.target_classes.length > 0
                                            ? group.target_classes.join(', ')
                                            : '-- Chọn lớp biên chế --'}
                                    </span>
                                    <span style={{ marginLeft: 12, color: '#64748b' }}>▼</span>
                                </button>
                                {isAdminDropdownOpen && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 6px)',
                                        left: 0,
                                        width: '100%',
                                        maxHeight: 240,
                                        overflowY: 'auto',
                                        background: '#fff',
                                        border: '1px solid #d0e0eb',
                                        borderRadius: 8,
                                        boxShadow: '0 10px 25px rgba(15, 23, 42, 0.08)',
                                        zIndex: 10,
                                    }}>
                                        {Array.isArray(adminClasses) && adminClasses.length > 0 ? adminClasses.map((ac) => {
                                            const adminClassId = ac.class_id || ac.value || ac.id || '';
                                            const isSelected = Array.isArray(group.target_classes) && group.target_classes.includes(adminClassId);
                                            return (
                                                <button
                                                    key={adminClassId}
                                                    type="button"
                                                    onClick={() => {
                                                        const newSelection = Array.isArray(group.target_classes) ? [...group.target_classes] : [];
                                                        const index = newSelection.indexOf(adminClassId);
                                                        if (index >= 0) {
                                                            newSelection.splice(index, 1);
                                                        } else {
                                                            newSelection.push(adminClassId);
                                                        }
                                                        onUpdateGroup('target_classes', newSelection);
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        textAlign: 'left',
                                                        padding: '10px 12px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 10,
                                                        background: isSelected ? '#eff6ff' : '#fff',
                                                        border: 'none',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {isSelected ? <CheckSquare size={16} style={{ color: '#2563eb' }} /> : <Square size={16} style={{ color: '#94a3b8' }} />}
                                                    <span style={{ fontSize: '0.875rem', color: '#1e293b' }}>{ac.class_name || adminClassId}</span>
                                                </button>
                                            );
                                        }) : (
                                            <div style={{ padding: 12, color: '#64748b', fontSize: '0.875rem' }}>
                                                Chưa có lớp biên chế khả dụng.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={{ gridColumn: 'span 4' }}>
                            <label style={{ ...styles.description, fontSize: '0.75rem', display: 'block', marginBottom: 4 }}>Giảng viên</label>
                            <select 
                                value={group.lecturer_id || ""}
                                onChange={(e) => onUpdateGroup('lecturer_id', e.target.value)}
                                style={inputStyle}
                            >
                                <option value="">-- Chọn giảng viên --</option>
                                {lecturerOptions.map((l) => (
                                    <option key={l.value} value={l.value}>{l.label}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ gridColumn: 'span 4' }} />
                    </div>
                </div>

                {/* Tổ Thực Hành */}
                {hasPracticalCredits && <div style={{ borderTop: '1px solid #d0e0eb', paddingTop: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669' }}></span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>
                                Tổ thực hành / Bài tập
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#106fa6', fontStyle: 'italic', marginLeft: 4 }}>
                                ({group.max_students} SV / 30 SV max = {Math.ceil(group.max_students / 30)} tổ)
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button 
                                onClick={onAutoSplitSubGroups}
                                style={{ ...styles.secondaryButton, height: 32, fontSize: '0.75rem', color: '#106fa6', borderColor: '#106fa6' }}
                            >
                                <Sparkles size={14} /> Tự động chia tổ
                            </button>
                            <button 
                                onClick={onAddSubGroup}
                                style={{ ...styles.secondaryButton, height: 32, fontSize: '0.75rem', color: '#106fa6', borderColor: '#106fa6' }}
                            >
                                <Plus size={14} /> Thêm tổ TH
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {group.sub_groups.map((sg) => (
                            <div key={sg.id} style={{
                                display: 'flex', alignItems: 'center', gap: 8, padding: 10,
                                background: '#f8fafc', border: '1px solid #d0e0eb', borderRadius: 8
                            }}>
                                <div style={{ minWidth: 70 }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', display: 'block' }}>Tổ {sg.sub_group_number}</span>
                                    <span style={{ fontSize: '0.65rem', color: '#059669', background: '#d1fae5', padding: '2px 4px', borderRadius: 4, fontWeight: 700 }}>
                                        Sĩ số: {sg.max_students}
                                    </span>
                                </div>

                                <div style={{ flex: 1 }}>
                                    <select 
                                        value={sg.lecturer_id}
                                        onChange={(e) => onUpdateSubGroup(sg.id, 'lecturer_id', e.target.value)}
                                        style={{ ...inputStyle, height: 36, fontSize: '0.75rem' }}
                                    >
                                        <option value="">-- Giảng viên TH --</option>
                                        {lecturers?.map(l => (
                                            <option key={l.value} value={l.value}>{l.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <button 
                                    onClick={() => onRemoveSubGroup(sg.id)}
                                    style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', padding: 4 }}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                        {group.sub_groups.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '10px 0', fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                                Chưa có tổ thực hành nào.
                            </div>
                        )}
                    </div>
                </div>}

            </div>
        </div>
    );
}