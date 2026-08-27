import { useState, useMemo } from 'react';
import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

/**
 * Custom Hook for sorting array data by table header column.
 */
export const useSortableData = (items = [], defaultConfig = null) => {
  const [sortConfig, setSortConfig] = useState(defaultConfig);

  const sortedItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    let sortableItems = [...items];

    if (sortConfig !== null && sortConfig.key) {
      sortableItems.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Handle nested object property (e.g. category.name)
        if (sortConfig.key.includes('.')) {
          const keys = sortConfig.key.split('.');
          aVal = keys.reduce((obj, k) => (obj && obj[k] !== undefined ? obj[k] : null), a);
          bVal = keys.reduce((obj, k) => (obj && obj[k] !== undefined ? obj[k] : null), b);
        }

        if (aVal === undefined || aVal === null) aVal = '';
        if (bVal === undefined || bVal === null) bVal = '';

        // Try numeric comparison first
        const aNum = Number(aVal);
        const bNum = Number(bVal);
        const isNumeric = !isNaN(aNum) && !isNaN(bNum) && typeof aVal !== 'boolean' && typeof bVal !== 'boolean' && String(aVal).trim() !== '' && String(bVal).trim() !== '';

        if (isNumeric) {
          return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
        }

        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();

        if (aStr < bStr) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aStr > bStr) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return { items: sortedItems, requestSort, sortConfig };
};

/**
 * Reusable SortableHeader Component for <th> cells
 */
export const SortableHeader = ({
  title,
  sortKey,
  sortConfig,
  onRequestSort,
  className = ''
}) => {
  const isSorted = sortConfig && sortConfig.key === sortKey;
  const direction = isSorted ? sortConfig.direction : null;

  return (
    <th
      onClick={() => onRequestSort(sortKey)}
      className={`px-6 py-4 cursor-pointer select-none hover:text-slate-200 transition-colors group/th ${className}`}
      title={`Klik untuk mengurutkan berdasarkan ${title}`}
    >
      <div className="flex items-center gap-1.5">
        <span>{title}</span>
        <span className="text-slate-500 group-hover/th:text-slate-300 transition-colors">
          {direction === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5 text-purple-400 font-bold" />
          ) : direction === 'desc' ? (
            <ArrowDown className="h-3.5 w-3.5 text-purple-400 font-bold" />
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 opacity-40 group-hover/th:opacity-100 transition-opacity" />
          )}
        </span>
      </div>
    </th>
  );
};
