import React from 'react';
import './Pagination.css';

const Pagination = ({ currentPage, totalPages, totalItems, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="pagination-container">
      <span className="pagination-info">
        Trang {currentPage} / {totalPages} {totalItems !== undefined && `(Tổng ${totalItems} mục)`}
      </span>

      <div className="pagination-controls">
        <button
          type="button"
          className="pagination-btn"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Trước
        </button>

        {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
          <button
            key={page}
            type="button"
            className={`pagination-btn ${page === currentPage ? 'active' : ''}`}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ))}

        <button
          type="button"
          className="pagination-btn"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Sau
        </button>
      </div>
    </div>
  );
};

export default Pagination;