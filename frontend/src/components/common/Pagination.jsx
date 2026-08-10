import React from 'react';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';

const range = (start, end) => {
  const arr = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
};

export default function Pagination({ total = 0, pageSize = 10, currentPage = 1, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages === 1) return null;

  const handleChange = (p) => {
    if (p < 1 || p > totalPages) return;
    onChange?.(p);
  };

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(total, currentPage * pageSize);

  const pages = [];
  if (totalPages <= 7) {
    pages.push(...range(1, totalPages));
  } else {
    if (currentPage <= 4) {
      pages.push(...range(1, 5), '...', totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, '...', ...range(totalPages - 4, totalPages));
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
  }

  const btnStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '32px',
    height: '32px',
    padding: '0 8px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    background: '#fff',
    cursor: 'pointer',
    color: '#475569',
    fontWeight: '500',
    transition: 'all 0.2s',
    fontSize: '0.85rem'
  };

  const activeBtnStyle = {
    ...btnStyle,
    background: '#106fa6',
    color: '#fff',
    borderColor: '#106fa6'
  };

  const disabledBtnStyle = {
    ...btnStyle,
    opacity: 0.5,
    cursor: 'not-allowed',
    background: '#f8fafc'
  };

  return (
    <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
        Hiển thị <span style={{ fontWeight: 600, color: '#334155' }}>{startIndex}</span> - <span style={{ fontWeight: 600, color: '#334155' }}>{endIndex}</span> trong tổng <span style={{ fontWeight: 600, color: '#334155' }}>{total}</span> mục
      </div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <button disabled={currentPage === 1} onClick={() => handleChange(1)} style={currentPage === 1 ? disabledBtnStyle : btnStyle} title="Trang đầu"><ChevronsLeft size={16} /></button>
        <button disabled={currentPage === 1} onClick={() => handleChange(currentPage - 1)} style={currentPage === 1 ? disabledBtnStyle : btnStyle} title="Trang trước"><ChevronLeft size={16} /></button>
        {pages.map((p, idx) => (
          typeof p === 'number' ? (
            <button
              key={p}
              onClick={() => handleChange(p)}
              style={currentPage === p ? activeBtnStyle : btnStyle}
            >
              {p}
            </button>
          ) : (
            <span key={`sep-${idx}`} style={{ color: '#94a3b8', padding: '0 4px' }}>...</span>
          )
        ))}
        <button disabled={currentPage === totalPages} onClick={() => handleChange(currentPage + 1)} style={currentPage === totalPages ? disabledBtnStyle : btnStyle} title="Trang sau"><ChevronRight size={16} /></button>
        <button disabled={currentPage === totalPages} onClick={() => handleChange(totalPages)} style={currentPage === totalPages ? disabledBtnStyle : btnStyle} title="Trang cuối"><ChevronsRight size={16} /></button>
      </div>
    </div>
  );
}
