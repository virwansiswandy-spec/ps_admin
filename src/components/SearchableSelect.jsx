import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

/**
 * Reusable SearchableSelect / Combobox Component
 * Allows live filtering of options by typed key/query.
 */
const SearchableSelect = ({
  options = [], // Array of { value, label, sublabel, disabled } or raw strings/numbers
  value = '',
  onChange = () => {},
  placeholder = 'Pilih opsi...',
  searchPlaceholder = 'Ketik untuk mencari...',
  className = '',
  disabled = false,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalize options array to standard object format
  const normalizedOptions = options.map(opt => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: opt.value !== undefined ? opt.value : opt.id,
        label: opt.label !== undefined ? opt.label : opt.name,
        sublabel: opt.sublabel || opt.details || '',
        disabled: Boolean(opt.disabled)
      };
    }
    return { value: opt, label: String(opt), sublabel: '', disabled: false };
  });

  // Find currently selected option
  const selectedOption = normalizedOptions.find(
    opt => String(opt.value) === String(value)
  );

  // Filter options based on typed search query
  const filteredOptions = normalizedOptions.filter(opt => {
    if (!opt) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const labelMatch = opt.label !== undefined && opt.label !== null ? String(opt.label).toLowerCase().includes(q) : false;
    const sublabelMatch = opt.sublabel !== undefined && opt.sublabel !== null ? String(opt.sublabel).toLowerCase().includes(q) : false;
    const valueMatch = opt.value !== undefined && opt.value !== null ? String(opt.value).toLowerCase().includes(q) : false;
    return labelMatch || sublabelMatch || valueMatch;
  });

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (opt) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        className={`w-full bg-slate-950 border ${
          isOpen ? 'border-purple-500 ring-1 ring-purple-500/50' : 'border-slate-800 hover:border-slate-700'
        } rounded-md p-2.5 text-xs text-left flex items-center justify-between gap-2 transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <span className="truncate flex-1">
          {selectedOption ? (
            <span className="font-semibold text-slate-100 flex items-center gap-1.5 truncate">
              {selectedOption.label}
              {selectedOption.sublabel && (
                <span className="text-[11px] font-normal text-slate-400 truncate">
                  ({selectedOption.sublabel})
                </span>
              )}
            </span>
          ) : (
            <span className="text-slate-500 italic">{placeholder}</span>
          )}
        </span>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {value && !required && (
            <span
              onClick={handleClear}
              className="p-0.5 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
              title="Bersihkan Pilihan"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-purple-400' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-slate-900 border border-slate-800 rounded-md shadow-2xl overflow-hidden text-xs max-h-64 flex flex-col">
          {/* Live Search Input */}
          <div className="p-2 border-b border-slate-800/80 bg-slate-950/80 sticky top-0">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-purple-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filtered Options List */}
          <div className="overflow-y-auto flex-1 p-1 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-slate-500 italic text-[11px]">
                Tidak ada opsi cocok dengan "{searchQuery}"
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => handleSelect(opt)}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30'
                        : 'hover:bg-slate-800/80 text-slate-300'
                    } ${opt.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="truncate flex-1">
                      <div className="font-semibold truncate">{opt.label}</div>
                      {opt.sublabel && (
                        <div className="text-[10px] text-slate-400 truncate">{opt.sublabel}</div>
                      )}
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-purple-400 shrink-0" />}
                  </button>
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
