import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, Plus, Search, Filter, X, Tag, Edit2, Trash2, Layers, TrendingDown, Upload, Image as ImageIcon, Clock, Coins } from 'lucide-react';
import api, { softDeleteItem, getFileUrl as getImageUrl } from '../services/api';
import { showSuccess, showError, showConfirm } from '../utils/swal';
import Pagination from '../components/Pagination';
// CompositionBuilder moved to Compositions.jsx
import SearchableSelect from '../components/SearchableSelect';
import { useSortableData, SortableHeader } from '../hooks/useSortableData';
import { getItemEffectivePrice } from '../utils/priceUtils';
import { useAuth } from '../context/AuthContext';
import { canEditOrDelete, showPermissionDeniedAlert } from '../utils/permissions';

const defaultFormState = {
  name: '',
  category_id: '',
  sku: '',
  barcode: '',
  item_type: 'product',
  unit: 'pcs',
  base_price: 0,
  cost_price: 0,
  track_stock: true,
  stock: 0,
  min_stock: 5,
  is_composite: false,
  compositions: [],
  bonus_type: 'percentage',
  bonus_value: 0,
  estimated_duration_hours: 0,
  description: '',
  price_tiers: []
};

const Items = () => {
  const { user, isSuperAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryIdParam = searchParams.get('category_id') || '';

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [availableUnits, setAvailableUnits] = useState(['pcs', 'lembar', 'pack', 'box', 'rim', 'roll', 'meter', 'set', 'buku', 'sisi']);
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categoryIdParam);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Modal & Edit & Image State
  const [showModal, setShowModal] = useState(false);
  const [previewTierItem, setPreviewTierItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(defaultFormState);
  const [selectedImageFiles, setSelectedImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [existingImageUrls, setExistingImageUrls] = useState([]);

  // Sync state if query parameter changes
  useEffect(() => {
    setSelectedCategory(searchParams.get('category_id') || '');
  }, [searchParams]);

  const fetchItemsData = async () => {
    setLoading(true);
    try {
      const [itemsRes, catRes, unitsRes] = await Promise.all([
        api.get('/items', { params: { is_active: true } }).catch(() => api.get('/items?is_active=true')).catch(() => api.get('/items')),
        api.get('/categories'),
        api.get('/items/units').catch(() => ({ data: [] }))
      ]);
      const rawItems = itemsRes.data || [];
      const activeOnly = rawItems.filter(item => {
        if (!item) return false;
        if (item.is_active === false || item.is_active === 0 || item.is_active === 'false' || item.is_active === '0') return false;
        if (item.is_deleted === true || item.is_deleted === 1 || item.is_deleted === 'true' || item.is_deleted === '1') return false;
        if (item.deleted === true || item.deleted === 1 || item.deleted === 'true' || item.deleted === '1') return false;
        if (item.deleted_at !== null && item.deleted_at !== undefined && item.deleted_at !== '') return false;
        if (item.status === 'deleted' || item.status === 'inactive' || item.status === 'disabled' || item.status === 'archived') return false;
        return true;
      });
      setItems(activeOnly);
      setCategories(catRes.data || []);
      if (unitsRes.data && Array.isArray(unitsRes.data) && unitsRes.data.length > 0) {
        const defaultList = ['pcs', 'lembar', 'pack', 'box', 'rim', 'roll', 'meter', 'set', 'buku', 'sisi'];
        const combined = Array.from(new Set([...unitsRes.data, ...defaultList]));
        setAvailableUnits(combined);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItemsData();
  }, []);

  const handleCategoryFilterChange = (catId) => {
    setSelectedCategory(catId);
    if (catId) {
      setSearchParams({ category_id: catId });
    } else {
      setSearchParams({});
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setIsCustomUnit(false);
    setSelectedImageFiles([]);
    setPreviewUrls([]);
    setExistingImageUrls([]);
    setFormData({
      ...defaultFormState,
      category_id: selectedCategory || ''
    });
    setShowModal(true);
  };

  const openEditModal = async (item) => {
    if (!canEditOrDelete(item, user, isSuperAdmin)) {
      showPermissionDeniedAlert('mengubah');
      return;
    }
    setEditingItem(item);
    const itemUnit = item.unit || 'pcs';
    setIsCustomUnit(!availableUnits.includes(itemUnit));
    setSelectedImageFiles([]);
    setPreviewUrls([]);
    setExistingImageUrls(item.image_urls || []);

    let compList = [];
    if (item.is_composite) {
      try {
        const compRes = await api.get(`/compositions/item/${item.id}`);
        compList = compRes.data.map(c => ({
          id: c.id,
          child_item_id: c.child_item_id,
          quantity: parseFloat(c.quantity || 1),
          is_fixed_cost: Boolean(c.is_fixed_cost),
          notes: c.notes || ''
        }));
      } catch (e) {
        console.error('Error loading compositions:', e);
      }
    }

    setFormData({
      name: item.name || '',
      category_id: item.category_id || (item.category ? item.category.id : ''),
      sku: item.sku || '',
      barcode: item.barcode || '',
      item_type: item.item_type || 'product',
      unit: itemUnit,
      base_price: item.base_price ? parseFloat(item.base_price) : 0,
      cost_price: item.cost_price ? parseFloat(item.cost_price) : 0,
      track_stock: item.track_stock !== undefined ? Boolean(item.track_stock) : true,
      stock: item.stock ? parseFloat(item.stock) : 0,
      min_stock: item.min_stock ? parseFloat(item.min_stock) : 5,
      is_composite: Boolean(item.is_composite),
      compositions: compList,
      bonus_type: item.bonus_type || 'percentage',
      bonus_value: item.bonus_value ? parseFloat(item.bonus_value) : 0,
      estimated_duration_hours: item.estimated_duration_hours ? parseFloat(item.estimated_duration_hours) : 0,
      description: item.description || '',
      price_tiers: item.price_tiers ? item.price_tiers.map(pt => ({
        min_quantity: parseFloat(pt.min_quantity || 1),
        unit_price: parseFloat(pt.unit_price || 0),
        label: pt.label || ''
      })) : []
    });
    setShowModal(true);
  };

  const handleImageFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setSelectedImageFiles(prev => [...prev, ...files]);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newPreviews]);
  };

  const handleRemoveNewImage = (index) => {
    setSelectedImageFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Composition / BOM Handlers
  const addComposition = () => {
    const firstChild = items.find(i => !editingItem || i.id !== editingItem.id);
    setFormData({
      ...formData,
      is_composite: true,
      compositions: [
        ...(formData.compositions || []),
        { child_item_id: firstChild ? firstChild.id : '', quantity: 1, is_fixed_cost: false, notes: '' }
      ]
    });
  };

  const updateComposition = (index, field, value) => {
    const newComps = [...(formData.compositions || [])];
    newComps[index][field] = field === 'notes' ? value : field === 'is_fixed_cost' ? Boolean(value) : (field === 'child_item_id' ? parseInt(value) : parseFloat(value || 0));
    setFormData({ ...formData, compositions: newComps });
  };

  const removeComposition = (index) => {
    const newComps = (formData.compositions || []).filter((_, i) => i !== index);
    setFormData({
      ...formData,
      compositions: newComps,
      is_composite: newComps.length > 0 ? formData.is_composite : false
    });
  };

  // Price Tiers Dynamic Handlers
  const addPriceTier = () => {
    setFormData({
      ...formData,
      price_tiers: [
        ...formData.price_tiers,
        { min_quantity: 10, unit_price: 0, label: '' }
      ]
    });
  };

  const updatePriceTier = (index, field, value) => {
    const newTiers = [...formData.price_tiers];
    newTiers[index][field] = field === 'label' ? value : parseFloat(value || 0);
    setFormData({ ...formData, price_tiers: newTiers });
  };

  const removePriceTier = (index) => {
    const newTiers = formData.price_tiers.filter((_, i) => i !== index);
    setFormData({ ...formData, price_tiers: newTiers });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        ...(user?.id ? { created_by_id: user.id, user_id: user.id } : {}),
        created_by: user?.full_name || user?.username || user?.email || 'Admin',
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        base_price: parseFloat(formData.base_price || 0),
        cost_price: formData.cost_price !== '' && formData.cost_price !== null ? parseFloat(formData.cost_price) : null,
        stock: parseFloat(formData.stock || 0),
        min_stock: parseFloat(formData.min_stock || 0),
        bonus_value: parseFloat(formData.bonus_value || 0),
        estimated_duration_hours: parseFloat(formData.estimated_duration_hours || 0),
        price_tiers: formData.price_tiers.map(pt => ({
          min_quantity: parseFloat(pt.min_quantity || 1),
          unit_price: parseFloat(pt.unit_price || 0),
          label: pt.label || null
        })),
        compositions: formData.is_composite && formData.compositions ? formData.compositions.filter(c => c.child_item_id).map(c => ({
          child_item_id: parseInt(c.child_item_id),
          quantity: parseFloat(c.quantity || 1),
          is_fixed_cost: Boolean(c.is_fixed_cost),
          notes: c.notes || null
        })) : []
      };

      let savedItemId = null;
      if (editingItem) {
        if (!canEditOrDelete(editingItem, user, isSuperAdmin)) {
          showPermissionDeniedAlert('mengubah');
          return;
        }
        const res = await api.put(`/items/${editingItem.id}`, payload);
        savedItemId = res.data.id;
      } else {
        const res = await api.post('/items', payload);
        savedItemId = res.data.id;
      }

      // Upload photos if user attached new images
      if (selectedImageFiles.length > 0 && savedItemId) {
        const uploadFormData = new FormData();
        selectedImageFiles.forEach((file) => {
          uploadFormData.append('files', file);
        });
        await api.post(`/items/${savedItemId}/upload-images`, uploadFormData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      setShowModal(false);
      setEditingItem(null);
      setFormData(defaultFormState);
      setSelectedImageFiles([]);
      setPreviewUrls([]);
      setExistingImageUrls([]);
      fetchItemsData();
      showSuccess('Berhasil!', editingItem ? `Barang "${formData.name}" berhasil diperbarui.` : `Barang "${formData.name}" berhasil ditambahkan.`);
    } catch (err) {
      console.error('Error saving item:', err);
      showError('Gagal Menyimpan!', err.response?.data?.detail || err.message);
    }
  };

  const handleDelete = async (item) => {
    if (!canEditOrDelete(item, user, isSuperAdmin)) {
      showPermissionDeniedAlert('menghapus');
      return;
    }

    const confirmed = await showConfirm({
      title: 'Hapus Barang?',
      text: `Apakah Anda yakin ingin menonaktifkan/menghapus barang "${item.name}"?`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      icon: 'warning'
    });
    if (!confirmed) return;

    try {
      await softDeleteItem(item.id, item);
      showSuccess('Berhasil!', `Barang "${item.name}" telah dihapus.`);
      fetchItemsData();
    } catch (err) {
      showError('Gagal!', err.response?.data?.detail || 'Gagal menghapus barang.');
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  const isItemActive = (item) => {
    if (!item) return false;
    if (item.is_active === false || item.is_active === 0 || item.is_active === 'false' || item.is_active === '0') return false;
    if (item.is_deleted === true || item.is_deleted === 1 || item.is_deleted === 'true' || item.is_deleted === '1') return false;
    if (item.deleted === true || item.deleted === 1 || item.deleted === 'true' || item.deleted === '1') return false;
    if (item.deleted_at !== null && item.deleted_at !== undefined && item.deleted_at !== '') return false;
    if (item.status === 'deleted' || item.status === 'inactive' || item.status === 'disabled' || item.status === 'archived') return false;
    return true;
  };

  const filteredItems = items.filter(item => {
    if (!isItemActive(item)) return false;
    if (item.is_composite) return false;
    const q = searchQuery.toLowerCase();
    const itemName = item.name ? String(item.name).toLowerCase() : '';
    const itemSku = item.sku ? String(item.sku).toLowerCase() : '';
    const itemBarcode = item.barcode ? String(item.barcode).toLowerCase() : '';

    const matchesSearch = searchQuery === '' || 
      itemName.includes(q) ||
      itemSku.includes(q) ||
      itemBarcode.includes(q);
    
    const matchesCategory = selectedCategory === '' || String(item.category_id || (item.category && item.category.id)) === String(selectedCategory);
    
    return matchesSearch && matchesCategory;
  });

  const { items: sortedItems, requestSort, sortConfig } = useSortableData(filteredItems);

  const paginatedItems = sortedItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const selectedCategoryObj = categories.find(c => String(c.id) === String(selectedCategory));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Katalog Barang</h1>
          <p className="text-sm text-slate-400">Manajemen inventaris stok ATK retail dan varian jenis layanan percetakan</p>
        </div>
        {(isSuperAdmin || user?.role === 'super_admin') && (
          <button
            onClick={openCreateModal}
            className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md transition-all flex items-center gap-2 text-sm shadow-lg shadow-emerald-500/20"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Item Baru</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nama barang, SKU, atau spesifikasi..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-md text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryFilterChange(e.target.value)}
            className="w-full py-2.5 px-3 bg-slate-900 border border-slate-800 rounded-md text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="">Semua Kategori Produk</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
              <tr>
                <SortableHeader title="Nama Item" sortKey="name" sortConfig={sortConfig} onRequestSort={requestSort} />
                <SortableHeader title="Kategori" sortKey="category.name" sortConfig={sortConfig} onRequestSort={requestSort} />
                <SortableHeader title="Tipe" sortKey="item_type" sortConfig={sortConfig} onRequestSort={requestSort} />
                <SortableHeader title="Harga Jual" sortKey="base_price" sortConfig={sortConfig} onRequestSort={requestSort} />
                <th className="px-6 py-4">Tier Grosir</th>
                <SortableHeader title="Stok" sortKey="stock" sortConfig={sortConfig} onRequestSort={requestSort} />
                <SortableHeader title="Bonus Staf" sortKey="bonus_value" sortConfig={sortConfig} onRequestSort={requestSort} />
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-slate-500 text-sm">
                    {selectedCategoryObj ? `Tidak ada item pada kategori "${selectedCategoryObj.name}"` : 'Tidak ada item ditemukan.'}
                  </td>
                </tr>
              ) : (
                paginatedItems.map(item => {
                  const catObj = item.category || categories.find(c => String(c.id) === String(item.category_id));
                  const tiersCount = item.price_tiers ? item.price_tiers.length : 0;
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {item.image_urls && item.image_urls.length > 0 ? (
                            <img
                              src={getImageUrl(item.image_urls[0])}
                              alt={item.name}
                              className="w-10 h-10 object-cover rounded-lg border border-slate-800 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-slate-800/80 rounded-lg flex items-center justify-center text-slate-500 shrink-0 border border-slate-800">
                              <Package className="h-5 w-5" />
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-100">{item.name}</div>
                            <div className="text-xs text-slate-500 font-mono">
                              SKU: {item.sku || '-'} | Barcode: {item.barcode || '-'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {catObj ? (
                          <span className="px-2 py-1 bg-slate-800 text-slate-300 rounded-md text-xs border border-slate-700/50 inline-flex items-center gap-1">
                            <Tag className="h-3 w-3 text-emerald-400" />
                            {catObj.name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.item_type === 'service' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'
                        }`}>
                          {item.item_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 space-y-1">
                        {(() => {
                          const effPrice = getItemEffectivePrice(item, 1);
                          const compTotalPrice = (item.is_composite && item.compositions && item.compositions.length > 0)
                            ? item.compositions.reduce((acc, c) => {
                                const childPrice = getItemEffectivePrice(c.child_item, c.quantity);
                                return acc + (childPrice * parseFloat(c.quantity || 0));
                              }, 0)
                            : 0;
                          const displayPrice = effPrice > 0 ? effPrice : compTotalPrice;

                          return (
                            <>
                              <div className="font-semibold text-emerald-400">
                                Rp {displayPrice.toLocaleString('id-ID')} / {item.unit}
                              </div>
                              {item.is_composite && (
                                <div>
                                  <span className="px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/30 text-purple-300 rounded text-[10px] font-bold uppercase inline-flex items-center gap-1 mt-0.5">
                                    <Layers className="h-3 w-3 text-purple-400" />
                                    {effPrice === 0 ? 'Auto-Bundel' : 'Paket Bundel'}
                                  </span>
                                </div>
                              )}
                              {item.cost_price && parseFloat(item.cost_price) > 0 && (
                                <div className="text-[11px] text-slate-400">
                                  Harga Modal: Rp {parseFloat(item.cost_price).toLocaleString('id-ID')}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          if (item.is_composite) {
                            const childTiersCount = (item.compositions || []).reduce(
                              (acc, c) => acc + (c.child_item?.price_tiers?.length || 0),
                              0
                            );

                            if (tiersCount > 0) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => setPreviewTierItem(item)}
                                  className="px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-md text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm group"
                                  title="Klik untuk rincian tier harga resep & komponen"
                                >
                                  <TrendingDown className="h-3.5 w-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
                                  <span>{tiersCount + childTiersCount} Tier Resep</span>
                                </button>
                              );
                            }

                            if (childTiersCount > 0) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => setPreviewTierItem(item)}
                                  className="px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-md text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm group"
                                  title="Klik untuk rincian tier harga item komponen"
                                >
                                  <TrendingDown className="h-3.5 w-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
                                  <span>{childTiersCount} Tier Komponen</span>
                                </button>
                              );
                            }

                            return (
                              <button
                                type="button"
                                onClick={() => setPreviewTierItem(item)}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                                title="Klik untuk rincian harga komposit"
                              >
                                <Layers className="h-3 w-3 text-purple-400" />
                                <span>Flat Bundel</span>
                              </button>
                            );
                          }

                          if (tiersCount > 0) {
                            return (
                              <button
                                type="button"
                                onClick={() => setPreviewTierItem(item)}
                                className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-md text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm group"
                                title="Klik untuk rincian tier harga grosir"
                              >
                                <TrendingDown className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                                <span>{tiersCount} Tier Grosir</span>
                              </button>
                            );
                          }

                          return (
                            <button
                              type="button"
                              onClick={() => setPreviewTierItem(item)}
                              className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer flex items-center gap-1"
                              title="Klik untuk rincian harga"
                            >
                              <span>Harga Flat</span>
                            </button>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        {item.track_stock ? (
                          <span className={`${parseFloat(item.stock) <= parseFloat(item.min_stock || 0) ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
                            {parseFloat(item.stock)} {item.unit}
                          </span>
                        ) : (
                          <span className="text-slate-500">Tidak Dilacak</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-300">
                        {item.bonus_type === 'percentage' ? `${item.bonus_value}%` : `Rp ${parseFloat(item.bonus_value || 0).toLocaleString('id-ID')}`}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {canEditOrDelete(item, user, isSuperAdmin) && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                              title="Edit Item"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                              title="Hapus / Nonaktifkan Item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={filteredItems.length}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* CREATE & EDIT MODAL MATCHING SERVER DATABASE */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-lg p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-lg">
                {editingItem ? 'Edit Item' : 'Tambah Item Baru'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* SECTION 1: IDENTITAS ITEM */}
              <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-md space-y-3">
                <span className="font-bold text-emerald-400 text-xs tracking-wide uppercase block">1. Informasi & Identitas Barang</span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="block font-semibold text-slate-400 mb-1">Nama Barang / Jasa *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Contoh: Kertas HVS A4 80gr 500 Lembar"
                      className="w-full bg-slate-900 border border-slate-800 rounded-md p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">Kategori</label>
                    <SearchableSelect
                      options={categories.map(c => ({ value: c.id, label: c.name }))}
                      value={formData.category_id}
                      onChange={(val) => setFormData({ ...formData, category_id: val })}
                      placeholder="Pilih Kategori..."
                      searchPlaceholder="Ketik untuk mencari kategori..."
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">Tipe Item (Server Option)</label>
                    <select
                      value={formData.item_type}
                      onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-md p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                    >
                      <option value="product">product (Produk ATK Retail / Fisik)</option>
                      <option value="service">service (Jasa Cetak / Printing)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">Kode SKU</label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="Contoh: HVS-A4-80"
                      className="w-full bg-slate-900 border border-slate-800 rounded-md p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">Barcode / Kode Batang</label>
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      placeholder="Contoh: 899123456789"
                      className="w-full bg-slate-900 border border-slate-800 rounded-md p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: HARGA & SATUAN */}
              <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-md space-y-3">
                <span className="font-bold text-emerald-400 text-xs tracking-wide uppercase block">2. Harga Dasar & Satuan</span>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">Harga Jual Dasar (Rp) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.base_price}
                      onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-md p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">Harga HPP / Modal (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                      placeholder="Modal per unit"
                      className="w-full bg-slate-900 border border-slate-800 rounded-md p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-slate-400">Satuan Unit</label>
                      <button
                        type="button"
                        onClick={() => {
                          const nextIsCustom = !isCustomUnit;
                          setIsCustomUnit(nextIsCustom);
                          if (nextIsCustom) {
                            setFormData(prev => ({ ...prev, unit: '' }));
                          } else {
                            setFormData(prev => ({ ...prev, unit: availableUnits[0] || 'pcs' }));
                          }
                        }}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 font-medium transition-colors"
                      >
                        {isCustomUnit ? "← Pilih dari list" : "+ Ketik baru"}
                      </button>
                    </div>
                    {isCustomUnit ? (
                      <input
                        type="text"
                        required
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        placeholder="Contoh: lusin, kg, m2..."
                        className="w-full bg-slate-900 border border-emerald-500/80 rounded-md p-2.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        autoFocus
                      />
                    ) : (
                      <select
                        value={formData.unit}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            setIsCustomUnit(true);
                            setFormData({ ...formData, unit: '' });
                          } else {
                            setFormData({ ...formData, unit: e.target.value });
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-md p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                      >
                        {availableUnits.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                        <option value="__custom__" className="font-semibold text-emerald-400">+ Ketik Satuan Baru...</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 3: PRICE TIERS / HARGA GROSIR BERTINGKAT */}
              <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-md space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-amber-400 text-xs tracking-wide uppercase block">3. Harga Grosir Bertingkat (Price Tiers)</span>
                    <p className="text-[11px] text-slate-400">Diskon otomatis berdasarkan jumlah pembelian quantity</p>
                  </div>
                  <button
                    type="button"
                    onClick={addPriceTier}
                    className="py-1.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tambah Tier Harga</span>
                  </button>
                </div>

                {formData.price_tiers.length === 0 ? (
                  <div className="text-slate-500 italic text-[11px] py-1 text-center border border-dashed border-slate-800 rounded-lg">
                    Belum ada tier harga grosir. Klik "+ Tambah Tier Harga" di atas jika ada diskon pembelian jumlah banyak.
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    {formData.price_tiers.map((tier, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-2 rounded-md">
                        <div className="w-1/3">
                          <label className="block text-[10px] text-slate-400 mb-0.5">Min Qty (Unit)</label>
                          <input
                            type="number"
                            min="1"
                            value={tier.min_quantity}
                            onChange={(e) => updatePriceTier(idx, 'min_quantity', e.target.value)}
                            placeholder="Misal: 10"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="w-1/3">
                          <label className="block text-[10px] text-slate-400 mb-0.5">Harga per Unit (Rp)</label>
                          <input
                            type="number"
                            min="0"
                            value={tier.unit_price}
                            onChange={(e) => updatePriceTier(idx, 'unit_price', e.target.value)}
                            placeholder="Misal: 9000"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="w-1/3">
                          <label className="block text-[10px] text-slate-400 mb-0.5">Label Keterangan</label>
                          <input
                            type="text"
                            value={tier.label}
                            onChange={(e) => updatePriceTier(idx, 'label', e.target.value)}
                            placeholder="Misal: Grosir Min 10"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removePriceTier(idx)}
                          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors mt-3"
                          title="Hapus Tier Harga"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              

              {/* SECTION 4: MANAJEMEN STOK */}
              <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-md space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 text-xs tracking-wide uppercase">4. Pengaturan Stok</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.track_stock}
                      onChange={(e) => setFormData({ ...formData, track_stock: e.target.checked })}
                      className="rounded border-slate-800 text-emerald-500 focus:ring-0 bg-slate-900"
                    />
                    <span className="text-slate-300 font-semibold">Lacak Stok Produk Ini</span>
                  </label>
                </div>

                {formData.track_stock && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1">Jumlah Stok Saat Ini</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-md p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-400 mb-1">Batas Stok Minimum Alert</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.min_stock}
                        onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-md p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 5: ESTIMASI PENGERJAAN */}
              <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-md space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-400" />
                  <span className="font-bold text-emerald-400 text-xs tracking-wide uppercase">5. Estimasi Pengerjaan (Jam)</span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Durasi Estimasi Selesai (Dalam Jam)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.estimated_duration_hours}
                    onChange={(e) => setFormData({ ...formData, estimated_duration_hours: e.target.value })}
                    placeholder="Misal: 2.5 (untuk 2.5 jam / 2 jam 30 menit)"
                    className="w-full bg-slate-900 border border-slate-800 rounded-md p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Estimasi waktu ini digunakan pada pesanan jenis Jasa / Printing untuk kalkulasi deadline otomatis.</p>
                </div>
              </div>

              {/* SECTION 6: UPLOAD FOTO & GALERI PRODUK */}
              <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-emerald-400" />
                    <span className="font-bold text-emerald-400 text-xs tracking-wide uppercase">6. Foto & Galeri Produk</span>
                  </div>
                  <label className="cursor-pointer py-1.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Pilih Foto</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>

                {existingImageUrls.length === 0 && previewUrls.length === 0 ? (
                  <div className="text-slate-500 italic text-[11px] py-3 text-center border border-dashed border-slate-800 rounded-md bg-slate-900/40">
                    Belum ada foto yang diunggah. Klik "Pilih Foto" di atas untuk menambah foto produk.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {/* Existing saved images */}
                    {existingImageUrls.map((url, idx) => (
                      <div key={`existing-${idx}`} className="relative group w-16 h-16 rounded-md overflow-hidden border border-slate-700 bg-slate-900">
                        <img src={getImageUrl(url)} alt={`Foto ${idx+1}`} className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 left-0 right-0 bg-slate-950/70 text-[9px] text-center text-slate-300 py-0.5">Tersimpan</span>
                      </div>
                    ))}
                    {/* Newly attached image previews */}
                    {previewUrls.map((url, idx) => (
                      <div key={`preview-${idx}`} className="relative group w-16 h-16 rounded-md overflow-hidden border border-emerald-500/60 bg-slate-900">
                        <img src={url} alt={`Preview ${idx+1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveNewImage(idx)}
                          className="absolute top-1 right-1 p-0.5 bg-rose-600/90 text-white rounded-full hover:bg-rose-700 transition-colors"
                          title="Hapus foto baru ini"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <span className="absolute bottom-0 left-0 right-0 bg-emerald-950/80 text-[9px] text-center text-emerald-300 py-0.5">Baru</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 7: BONUS STAF / KASIR (Paling Bawah Sebelum Deskripsi) */}
              <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-md space-y-3">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-emerald-400" />
                  <span className="font-bold text-emerald-400 text-xs tracking-wide uppercase">7. Bonus Staf / Kasir</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">Tipe Bonus Kasir/Staf</label>
                    <select
                      value={formData.bonus_type}
                      onChange={(e) => setFormData({ ...formData, bonus_type: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-md p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="percentage">Persentase (%)</option>
                      <option value="fixed_amount">Nominal Tetap (Rp)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">Nilai Bonus</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={formData.bonus_value}
                      onChange={(e) => setFormData({ ...formData, bonus_value: e.target.value })}
                      placeholder={formData.bonus_type === 'percentage' ? 'Misal: 5 (%)' : 'Misal: 1000 (Rp)'}
                      className="w-full bg-slate-900 border border-slate-800 rounded-md p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 8: DESKRIPSI */}
              <div>
                <label className="block font-semibold text-slate-400 mb-1">8. Deskripsi & Spesifikasi Singkat</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Penjelasan produk, ketebalan kertas, resolusi cetak, dll..."
                  rows="2"
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-md text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md text-xs transition-colors shadow-lg shadow-emerald-500/20"
                >
                  {editingItem ? 'Update Data Item' : 'Simpan Item Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL TIER HARGA MODAL */}
      {previewTierItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    previewTierItem.item_type === 'service' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}>
                    {previewTierItem.item_type === 'service' ? 'Jasa / Printing' : 'ATK Retail'}
                  </span>
                  {previewTierItem.is_composite && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Komposit / Bundel
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-extrabold text-slate-100">{previewTierItem.name}</h2>
                <p className="text-xs text-slate-400 font-mono">SKU: {previewTierItem.sku || '-'} | Barcode: {previewTierItem.barcode || '-'}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTierItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Base Price Card */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">Harga Dasar (Standard / Eceran)</span>
                <div className="text-xl font-extrabold text-emerald-400 font-mono">
                  Rp {parseFloat(previewTierItem.base_price || 0).toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-400">/ {previewTierItem.unit}</span>
                </div>
              </div>
              {previewTierItem.cost_price > 0 && (
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Harga Modal HPP</span>
                  <div className="text-xs font-mono text-slate-400">
                    Rp {parseFloat(previewTierItem.cost_price).toLocaleString('id-ID')}
                  </div>
                </div>
              )}
            </div>

            {/* Price Tiers Breakdown Table */}
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <TrendingDown className="h-4 w-4 text-amber-400" />
                <span>Skema Tier Harga Grosir Berdasarkan Qty Pembelian</span>
              </h3>

              {(!previewTierItem.price_tiers || previewTierItem.price_tiers.length === 0) ? (
                <div className="p-4 bg-slate-950/60 border border-slate-800/60 rounded-lg text-center text-xs text-slate-400">
                  Item ini belum memiliki skema tier harga grosir (Menggunakan harga flat eceran).
                </div>
              ) : (
                <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800">
                      <tr>
                        <th className="px-3.5 py-2.5">Minimal Qty</th>
                        <th className="px-3.5 py-2.5">Harga Per {previewTierItem.unit}</th>
                        <th className="px-3.5 py-2.5 text-right">Potongan Hemat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {/* Standard Eceran Row */}
                      <tr className="bg-slate-950/40">
                        <td className="px-3.5 py-2 text-slate-400">1 s/d {(previewTierItem.price_tiers[0]?.min_quantity || 1) - 1} {previewTierItem.unit}</td>
                        <td className="px-3.5 py-2 font-bold text-slate-200">
                          Rp {parseFloat(previewTierItem.base_price || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="px-3.5 py-2 text-right text-slate-500">Harga Standar</td>
                      </tr>

                      {/* Configured Price Tiers Rows */}
                      {previewTierItem.price_tiers
                        .sort((a, b) => parseFloat(a.min_quantity) - parseFloat(b.min_quantity))
                        .map((tier, idx) => {
                          const unitP = parseFloat(tier.unit_price || 0);
                          const baseP = parseFloat(previewTierItem.base_price || 0);
                          const savings = baseP - unitP;

                          return (
                            <tr key={idx} className="hover:bg-amber-500/5 transition-colors">
                              <td className="px-3.5 py-2.5 font-bold text-amber-300">
                                ≥ {parseFloat(tier.min_quantity)} {previewTierItem.unit}
                              </td>
                              <td className="px-3.5 py-2.5 font-extrabold text-emerald-400">
                                Rp {unitP.toLocaleString('id-ID')}
                              </td>
                              <td className="px-3.5 py-2.5 text-right text-emerald-400/90 font-semibold">
                                {savings > 0 ? `- Rp ${savings.toLocaleString('id-ID')} (${Math.round((savings / baseP) * 100)}%)` : '-'}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Child Tiers Breakdown if Composite Item */}
            {previewTierItem.is_composite && previewTierItem.compositions && previewTierItem.compositions.length > 0 && (
              <div className="pt-2">
                <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Layers className="h-4 w-4" />
                  <span>Rincian Komponen & Tier Bahan Baku (Item Komposit)</span>
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {previewTierItem.compositions.map((comp, cIdx) => {
                    const child = comp.child_item;
                    if (!child) return null;
                    const childTiers = child.price_tiers || [];

                    return (
                      <div key={cIdx} className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200">{child.name}</span>
                          <span className="font-mono text-purple-300 font-semibold">Dibutuhkan: {comp.quantity} {child.unit}</span>
                        </div>

                        {childTiers.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-800/80">
                            {childTiers.map((ct, ctIdx) => (
                              <span key={ctIdx} className="bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2 py-0.5 rounded text-[10px] font-mono">
                                ≥{ct.min_quantity} {child.unit}: @Rp {parseFloat(ct.unit_price).toLocaleString('id-ID')}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500">Harga Flat @Rp {parseFloat(child.base_price || 0).toLocaleString('id-ID')} / {child.unit}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewTierItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-colors"
              >
                Tutup Rincian Tier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Items;
