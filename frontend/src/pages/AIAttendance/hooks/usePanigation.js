import { useState, useMemo, useEffect } from 'react';

export const usePagination = (items = [], itemsPerPage = 5, searchFields = []) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;

    const term = searchTerm.toLowerCase().trim();
    return items.filter((item) => {
      if (!searchFields || searchFields.length === 0) {
        return Object.values(item).some((val) =>
          String(val || '').toLowerCase().includes(term)
        );
      }

      return searchFields.some((field) => {
        const value = item[field];
        return String(value || '').toLowerCase().includes(term);
      });
    });
  }, [items, searchTerm, searchFields]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, items.length]);
  const totalPages = useMemo(() => {
    return Math.ceil((filteredItems?.length || 0) / itemsPerPage);
  }, [filteredItems, itemsPerPage]);

  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const goToPage = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  return {
    currentPage,
    totalPages,
    totalItems: filteredItems.length,
    rawTotalItems: items.length,
    currentItems,
    searchTerm,
    setSearchTerm,
    setCurrentPage: goToPage,
  };
};