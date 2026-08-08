import React from 'react';
import { Group, Copy, Trash2, Sparkles, X, Plus } from 'lucide-react';
import styles from './styles';

export default function GroupCard({
    group,
    lecturers,
    adminClasses,
    canRemoveGroup,
    formatGroupNumber,
    onUpdateGroup,
    onDuplicateGroup,
    onRemoveGroup,
    onAddSubGroup,
    onRemoveSubGroup,
    onUpdateSubGroup,
    onAutoSplitSubGroups,
    rooms = []
}) {
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

    const adminClassOptions = Array.isArray(adminClasses)
        ? adminClasses.map((ac) => ({
            value: String(ac.value ?? ac.class_id ?? ac.id ?? ac.administrative_class ?? ""),
            label: ac.label ?? ac.name ?? ac.class_id ?? ac.administrative_class ?? ac.value ?? "Không xác định",
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
                        <div style={{ gridColumn: 'span 4' }}>
                            <label style={{ ...styles.description, fontSize: '0.75rem', display: 'block', marginBottom: 4 }}>Lớp biên chế mục tiêu</label>
                            <select
                                value={group.target_classes?.[0] || ""}
                                onChange={(e) => onUpdateGroup('target_classes', e.target.value ? [e.target.value] : [])}
                                style={inputStyle}
                            >
                                <option value="">Tất cả / Tự do</option>
                                {adminClassOptions.map((ac) => (
                                    <option key={ac.value} value={ac.value}>{ac.label}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ gridColumn: 'span 4' }}>
                            <label style={{ ...styles.description, fontSize: '0.75rem', display: 'block', marginBottom: 4 }}>Lịch học & Phòng</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                <select 
                                    value={group.schedule_day}
                                    onChange={(e) => onUpdateGroup('schedule_day', e.target.value)}
                                    style={inputStyle}
                                >
                                    {["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"].map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                                <select 
                                    value={group.schedule_room}
                                    onChange={(e) => onUpdateGroup('schedule_room', e.target.value)}
                                    style={inputStyle}
                                >
                                    <option value="">-- Chọn phòng --</option>
                                    {rooms.map((room) => (
                                        <option key={room.value} value={room.value}>{room.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div style={{ gridColumn: 'span 6' }}>
                            <label style={{ ...styles.description, fontSize: '0.75rem', display: 'block', marginBottom: 4 }}>Ngày bắt đầu</label>
                            <input 
                                type="date" 
                                value={group.start_date}
                                onChange={(e) => onUpdateGroup('start_date', e.target.value)}
                                style={inputStyle} 
                            />
                        </div>
                        <div style={{ gridColumn: 'span 6' }}>
                            <label style={{ ...styles.description, fontSize: '0.75rem', display: 'block', marginBottom: 4 }}>Ngày kết thúc</label>
                            <input 
                                type="date" 
                                value={group.end_date}
                                onChange={(e) => onUpdateGroup('end_date', e.target.value)}
                                style={inputStyle} 
                            />
                        </div>
                    </div>
                </div>

                {/* Tổ Thực Hành */}
                <div style={{ borderTop: '1px solid #d0e0eb', paddingTop: 14 }}>
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

                                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                    <select 
                                        value={sg.schedule_day}
                                        onChange={(e) => onUpdateSubGroup(sg.id, 'schedule_day', e.target.value)}
                                        style={{ ...inputStyle, height: 36, fontSize: '0.75rem' }}
                                    >
                                        {["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"].map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                    <select 
                                        value={sg.schedule_room}
                                        onChange={(e) => onUpdateSubGroup(sg.id, 'schedule_room', e.target.value)}
                                        style={{ ...inputStyle, height: 36, fontSize: '0.75rem' }}
                                    >
                                        <option value="">-- Chọn phòng --</option>
                                        {rooms.map((room) => (
                                            <option key={room.value} value={room.value}>{room.label}</option>
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
                </div>

            </div>
        </div>
    );
}