import React from 'react';
import { Layers, Plus, Trash2 } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import { getItemEffectivePrice } from '../utils/priceUtils';

/**
 * Reusable CompositionBuilder Component
 * Used in both Items.jsx (Create/Edit Item Modal) and Compositions.jsx (Recipe Matrix Page).
 */
const CompositionBuilder = ({
  items = [],
  parentItemId = null,
  compositions = [],
  onChange,
  onCompositionsChange,
  isComposite = false,
  onIsCompositeChange = () => {},
  showParentSelector = false,
  selectedParentId = '',
  onParentIdChange = () => {}
}) => {

  const notifyChange = (newComps) => {
    if (typeof onCompositionsChange === 'function') {
      onCompositionsChange(newComps);
    }
    if (typeof onChange === 'function') {
      onChange(newComps);
    }
  };

  const addCompositionRow = () => {
    const availableChildren = items.filter(i => String(i.id) !== String(parentItemId || selectedParentId));
    const firstChild = availableChildren[0]?.id || '';
    const newComps = [
      ...(compositions || []),
      { child_item_id: firstChild, quantity: 1, is_fixed_cost: false, notes: '' }
    ];
    onIsCompositeChange(true);
    notifyChange(newComps);
  };

  const updateCompositionRow = (index, field, value) => {
    const newComps = [...(compositions || [])];
    if (field === 'notes') {
      newComps[index][field] = value;
    } else if (field === 'is_fixed_cost') {
      newComps[index][field] = Boolean(value);
    } else if (field === 'child_item_id') {
      newComps[index][field] = value ? parseInt(value) : '';
    } else {
      newComps[index][field] = value !== '' ? parseFloat(value) : 0;
    }
    notifyChange(newComps);
  };

  const removeCompositionRow = (index) => {
    const newComps = (compositions || []).filter((_, i) => i !== index);
    notifyChange(newComps);
    if (newComps.length === 0 && !showParentSelector) {
      onIsCompositeChange(false);
    }
  };

  // Calculate live total HPP / bundle contribution using getItemEffectivePrice
  const totalHppEst = compositions.reduce((acc, comp) => {
    const child = items.find(i => String(i.id) === String(comp.child_item_id));
    const price = getItemEffectivePrice(child, comp.quantity);
    return acc + (price * parseFloat(comp.quantity || 0));
  }, 0);

  // Options for Parent Selector
  const parentOptions = items.map(i => {
    const effPrice = getItemEffectivePrice(i, 1);
    return {
      value: i.id,
      label: i.name,
      sublabel: `${i.unit} - Rp ${effPrice.toLocaleString('id-ID')}`
    };
  });

  return (
    <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-md space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-purple-400" />
          <span className="font-bold text-purple-400 text-xs tracking-wide uppercase">
            Racikan Paket & Komposisi Bundel Nota
          </span>
        </div>
        <button
          type="button"
          onClick={addCompositionRow}
          className="py-1.5 px-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Tambah Komponen Paket</span>
        </button>
      </div>

      {/* Optional Parent Item Selector (used when creating recipe from Compositions page) */}
      {showParentSelector && (
        <div className="pb-2 border-b border-slate-800/80">
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Produk Utama Paket Cetak (Parent Item Nota) *
          </label>
          <SearchableSelect
            options={parentOptions}
            value={selectedParentId}
            onChange={(val) => onParentIdChange(val)}
            placeholder="Pilih Produk Hasil Cetak Utama..."
            searchPlaceholder="Ketik untuk mencari produk..."
          />
        </div>
      )}

      {/* Checkbox Toggle (when used inside item form) */}
      {!showParentSelector && (
        <div className="flex items-center gap-2 pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isComposite}
              onChange={(e) => {
                const checked = e.target.checked;
                onIsCompositeChange(checked);
                if (checked && compositions.length === 0) {
                  addCompositionRow();
                }
              }}
              className="rounded border-slate-800 text-purple-500 focus:ring-0 bg-slate-900"
            />
            <span className="text-slate-300 font-semibold text-xs">
              Produk Komposit / Memiliki Racikan Paket Bundel (Potong Multi-Stok)
            </span>
          </label>
        </div>
      )}

      {/* Interactive Composition Rows */}
      {(isComposite || showParentSelector) && (
        <div className="space-y-3 pt-1">
          {compositions.length === 0 ? (
            <div className="text-slate-500 italic text-[11px] py-3 text-center border border-dashed border-slate-800 rounded-lg">
              Belum ada komponen bundel ditambahkan. Klik "+ Tambah Komponen Paket" di atas.
            </div>
          ) : (
            <div className="space-y-2">
              {compositions.map((comp, idx) => {
                const childItem = items.find(i => String(i.id) === String(comp.child_item_id));
                const childPrice = getItemEffectivePrice(childItem, comp.quantity);
                const subtotalEst = childPrice * parseFloat(comp.quantity || 0);

                // Options for Child Selector
                const childOptions = items
                  .filter(i => String(i.id) !== String(parentItemId || selectedParentId))
                  .map(i => {
                    const price = getItemEffectivePrice(i, 1);
                    return {
                      value: i.id,
                      label: i.name,
                      sublabel: `Stok: ${i.stock} ${i.unit} | Rp ${price.toLocaleString('id-ID')}`
                    };
                  });

                return (
                  <div key={idx} className="bg-slate-900 border border-slate-800 p-2.5 rounded-md space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                      {/* Select Component Item with SearchableSelect */}
                      <div className="md:col-span-5">
                        <label className="block text-[10px] text-slate-400 mb-0.5 font-semibold">
                          Item Bahan / Komponen (Child)
                        </label>
                        <SearchableSelect
                          options={childOptions}
                          value={comp.child_item_id}
                          onChange={(val) => updateCompositionRow(idx, 'child_item_id', val)}
                          placeholder="Pilih Komponen..."
                          searchPlaceholder="Ketik nama / SKU komponen..."
                        />
                      </div>

                      {/* Quantity Input */}
                      <div className="md:col-span-3">
                        <label className="block text-[10px] text-slate-400 mb-0.5 font-semibold">
                          Kuantitas Konsumsi
                        </label>
                        <input
                          type="number"
                          min="0.0001"
                          step="any"
                          value={comp.quantity}
                          onChange={(e) => updateCompositionRow(idx, 'quantity', e.target.value)}
                          placeholder="Misal: 0.1 / 1"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      {/* Subtotal Cost Estimate */}
                      <div className="md:col-span-3">
                        <label className="block text-[10px] text-slate-400 mb-0.5 font-semibold text-emerald-400">
                          Harga Komponen Bundel
                        </label>
                        <div className="py-1.5 px-2 bg-slate-950 rounded-lg border border-slate-800 text-xs font-bold text-emerald-400">
                          Rp {subtotalEst.toLocaleString('id-ID')}
                        </div>
                      </div>

                      {/* Delete Row Button */}
                      <div className="md:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeCompositionRow(idx)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors mt-3"
                          title="Hapus Bahan Komponen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Optional Recipe Notes / Label */}
                    <div>
                      <input
                        type="text"
                        value={comp.notes || ''}
                        onChange={(e) => updateCompositionRow(idx, 'notes', e.target.value)}
                        placeholder="Catatan racikan / label paket (Opsional: misal potong 10 pcs per A3+)"
                        className="w-full bg-slate-950/70 border border-slate-800/80 rounded-lg px-2 py-1 text-[11px] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                );
              })}

              {/* Total HPP Summary Card */}
              <div className="mt-2 p-2.5 bg-purple-950/40 border border-purple-500/30 rounded-md flex items-center justify-between text-xs">
                <span className="font-semibold text-purple-300">Total Akumulasi Harga Paket Bundel:</span>
                <span className="font-extrabold text-emerald-400 text-sm">
                  Rp {totalHppEst.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CompositionBuilder;
