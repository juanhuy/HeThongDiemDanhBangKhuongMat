import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

const SearchableSelect = ({
  options = [],
  value,
  onChange,
  placeholder = "Chọn...",
  disabled = false,
  multiple = false,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.label?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    opt.value?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
    opt.subtitle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (optValue) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      if (currentValues.includes(optValue)) {
        onChange(currentValues.filter(v => v !== optValue));
      } else {
        onChange([...currentValues, optValue]);
      }
    } else {
      onChange(optValue);
      setIsOpen(false);
      setSearchTerm("");
    }
  };

  const removeValue = (optValue, e) => {
    e.stopPropagation();
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      onChange(currentValues.filter(v => v !== optValue));
    } else {
      onChange(null);
    }
  };

  const getDisplayLabel = () => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      if (currentValues.length === 0) return <span className="text-slate-400">{placeholder}</span>;
      
      return (
        <div className="flex flex-wrap gap-1">
          {currentValues.map(v => {
            const opt = options.find(o => o.value === v);
            return (
              <span key={v} className="bg-red-50 text-red-700 px-2 py-0.5 rounded flex items-center gap-1 text-sm">
                {opt ? opt.label : v}
                <X className="w-3 h-3 cursor-pointer hover:text-red-900" onClick={(e) => removeValue(v, e)} />
              </span>
            );
          })}
        </div>
      );
    } else {
      if (!value) return <span className="text-slate-400">{placeholder}</span>;
      const opt = options.find(o => o.value === value);
      return <span className="truncate block pr-6">{opt ? opt.label : value}</span>;
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div 
        className={`w-full min-h-[42px] px-3 py-2 border rounded-lg flex items-center justify-between cursor-pointer focus-within:ring-2 focus-within:ring-red-500 focus-within:border-red-500 bg-white transition-all
          ${disabled ? "bg-slate-50 cursor-not-allowed opacity-70" : "hover:border-slate-400"}
          ${isOpen ? "border-red-500 ring-2 ring-red-500 ring-opacity-20" : "border-slate-300"}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex-1 overflow-hidden">
          {getDisplayLabel()}
        </div>
        <div className="flex items-center gap-1">
          {!multiple && value && !disabled && (
            <X className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-pointer" onClick={(e) => removeValue(value, e)} />
          )}
          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto overflow-x-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="sticky top-0 bg-white p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                placeholder="Tìm kiếm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>
          <div className="p-1">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-slate-500 text-sm">Không tìm thấy kết quả</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = multiple 
                  ? (Array.isArray(value) && value.includes(opt.value))
                  : value === opt.value;
                
                return (
                  <div
                    key={opt.value}
                    className={`px-3 py-2 cursor-pointer rounded-md flex items-center justify-between group
                      ${isSelected ? "bg-red-50 text-red-700" : "hover:bg-slate-50"}
                    `}
                    onClick={() => handleSelect(opt.value)}
                  >
                    <div className="flex flex-col">
                      <span className={`text-sm ${isSelected ? "font-medium" : ""}`}>{opt.label}</span>
                      {opt.subtitle && <span className="text-xs text-slate-500 mt-0.5 group-hover:text-slate-600">{opt.subtitle}</span>}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-red-600" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
