import React, { useState, useEffect, useMemo } from 'react';
import { Layers, Plus, Edit2, Trash2, RefreshCw, X, Tag, Package, TrendingDown, Search, Image as ImageIcon, Upload } from 'lucide-react';
import api, { softDeleteItem, getFileUrl as getImageUrl, API_BASE_URL } from '../services/api';
import { showSuccess, showError, showConfirm } from '../utils/swal';
import Pagination from '../components/Pagination';
import CompositionBuilder from '../components/CompositionBuilder';
import { useSortableData, SortableHeader } from '../hooks/useSortableData';
import { getItemEffectivePrice, getItemPriceDetail } from '../utils/priceUtils';
import { useAuth } from '../context/AuthContext';
import { canEditOrDelete, showPermissionDeniedAlert } from '../utils/permissions';

const Compositions = () => {
  const { user, isSuperAdmin } = useAuth();
  const [compositions, setCompositions] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Modal & Form State
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [previewCompositionGroup, setPreviewCompositionGroup] = useState(null);
  const [showCreateCompositeModal, setShowCreateCompositeModal] = useState(false);
  const [editingParentGroup, setEditingParentGroup] = useState(null);
  const [selectedParentId, setSelectedParentId] = useState('');
  const [editingParentName, setEditingParentName] = useState('');
  const [compList, setCompList] = useState([]);

  // Form state for creating brand NEW composite item
  const [newCompositeData, setNewCompositeData] = useState({
    name: '',
    category_id: '',
    unit: 'pcs',
    description: '',
    compositions: []
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Image Upload State for New & Edit Composite Item
  const [existingImageUrls, setExistingImageUrls] = useState([]);
  const [selectedImageFiles, setSelectedImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);



  const handleImageFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSelectedImageFiles(prev => [...prev, ...files]);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newPreviews]);
  };

  const removeSelectedImage = (index) => {
    setSelectedImageFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      const targetUrl = prev[index];
      if (targetUrl) URL.revokeObjectURL(targetUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [compRes, itemsRes, catRes] = await Promise.all([
        api.get('/compositions/').catch(() => ({ data: [] })),
        api.get('/items/', { params: { is_active: true } }).catch(() => api.get('/items/?is_active=true')).catch(() => api.get('/items/')).catch(() => ({ data: [] })),
        api.get('/categories/').catch(() => ({ data: [] }))
      ]);
      setCompositions(compRes.data || []);
      setItems(itemsRes.data || []);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Group raw compositions by Parent Item ID
  const groupedCompositions = useMemo(() => {
    const map = new Map();
    (compositions || []).forEach(c => {
      const parentId = c.parent_item_id;
      if (!map.has(parentId)) {
        const parentItemFromList = items.find(i => String(i.id) === String(parentId));
        const parentObj = { ...(parentItemFromList || {}), ...(c.parent_item || {}) };
        map.set(parentId, {
          parentId,
          parentObj,
          compositions: []
        });
      }

      const childItemFromList = items.find(i => String(i.id) === String(c.child_item_id));
      const rawChild = c.child_item || childItemFromList || {};

      const basePrice = (rawChild.base_price && parseFloat(rawChild.base_price) > 0)
        ? rawChild.base_price
        : (childItemFromList?.base_price || 0);

      const costPrice = (rawChild.cost_price && parseFloat(rawChild.cost_price) > 0)
        ? rawChild.cost_price
        : (childItemFromList?.cost_price || 0);

      const priceTiers = (rawChild.price_tiers && Array.isArray(rawChild.price_tiers) && rawChild.price_tiers.length > 0)
        ? rawChild.price_tiers
        : (childItemFromList?.price_tiers || []);

      const childObj = {
        ...childItemFromList,
        ...c.child_item,
        base_price: basePrice,
        cost_price: costPrice,
        price_tiers: priceTiers
      };

      const priceDetail = getItemPriceDetail(childObj, c.quantity);
      const unitPrice = priceDetail.unitPrice;
      const subtotal = unitPrice * parseFloat(c.quantity || 0);

      map.get(parentId).compositions.push({
        ...c,
        childObj,
        priceDetail,
        unitPrice,
        subtotal
      });
    });

    const isItemActive = (item) => {
      if (!item) return false;
      if (item.is_active === false || item.is_active === 0 || item.is_active === 'false' || item.is_active === '0') return false;
      if (item.is_deleted === true || item.is_deleted === 1 || item.is_deleted === 'true' || item.is_deleted === '1') return false;
      if (item.deleted === true || item.deleted === 1 || item.deleted === 'true' || item.deleted === '1') return false;
      if (item.deleted_at !== null && item.deleted_at !== undefined && item.deleted_at !== '') return false;
      if (item.status === 'deleted' || item.status === 'inactive' || item.status === 'disabled' || item.status === 'archived') return false;
      return true;
    };

    return Array.from(map.values())
      .filter(group => {
        const parent = group.parentObj;
        return isItemActive(parent);
      })
      .map(group => {
        const totalBundlePrice = group.compositions.reduce((acc, comp) => acc + comp.subtotal, 0);
        return {
          ...group,
          totalBundlePrice
        };
      });
  }, [compositions, items]);

  const filteredGroupedCompositions = useMemo(() => {
    return (groupedCompositions || []).filter(group => {
      const parent = group.parentObj || {};

      // Category filter
      if (selectedCategory && String(parent.category_id) !== String(selectedCategory)) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = parent.name && parent.name.toLowerCase().includes(q);
        const matchSku = parent.sku && parent.sku.toLowerCase().includes(q);
        const matchBarcode = parent.barcode && parent.barcode.toLowerCase().includes(q);
        const matchChild = group.compositions.some(c =>
          c.childObj?.name && c.childObj.name.toLowerCase().includes(q)
        );

        return matchName || matchSku || matchBarcode || matchChild;
      }

      return true;
    });
  }, [groupedCompositions, searchQuery, selectedCategory]);

  const { items: sortedGroupedCompositions, requestSort, sortConfig } = useSortableData(filteredGroupedCompositions);
  const paginatedGroups = sortedGroupedCompositions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleGroupExpand = (parentId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [parentId]: !prev[parentId]
    }));
  };

  const openCreateModal = () => {
    setEditingParentGroup(null);
    setExistingImageUrls([]);
    setSelectedImageFiles([]);
    setPreviewUrls([]);
    const defaultParent = items[0]?.id || '';
    setSelectedParentId(defaultParent);
    const defaultParentObj = items.find(i => String(i.id) === String(defaultParent));
    setEditingParentName(defaultParentObj?.name || '');
    setExistingImageUrls(defaultParentObj?.image_urls || []);
    const availableChildren = items.filter(i => String(i.id) !== String(defaultParent));
    setCompList([{
      child_item_id: availableChildren[0]?.id || '',
      quantity: 1,
      is_fixed_cost: false,
      notes: ''
    }]);
    setShowModal(true);
  };

  const openEditModalForGroup = (group) => {
    if (!canEditOrDelete(group.parentObj || group, user, isSuperAdmin)) {
      showPermissionDeniedAlert('mengubah resep');
      return;
    }
    setEditingParentGroup(group);
    setSelectedParentId(group.parentId);
    setEditingParentName(group.parentObj?.name || '');
    setExistingImageUrls(group.parentObj?.image_urls || []);
    setSelectedImageFiles([]);
    setPreviewUrls([]);
    setCompList(group.compositions.map(c => ({
      id: c.id,
      child_item_id: c.child_item_id,
      quantity: parseFloat(c.quantity || 1),
      is_fixed_cost: Boolean(c.is_fixed_cost),
      notes: c.notes || ''
    })));
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedParentId) {
      alert('Pilih produk hasil cetak utama terlebih dahulu.');
      return;
    }
    if (!editingParentName.trim()) {
      alert('Nama produk utama paket harus diisi.');
      return;
    }

    try {
      // Update parent item name, image_urls, and active status if modified
      const parentItem = items.find(i => String(i.id) === String(selectedParentId));
      if (parentItem) {
        if (!canEditOrDelete(parentItem, user, isSuperAdmin)) {
          showPermissionDeniedAlert('mengubah resep');
          return;
        }
        await api.put(`/items/${selectedParentId}`, {
          ...parentItem,
          name: editingParentName.trim(),
          image_urls: existingImageUrls,
          is_active: true
        });
      }

      // Upload new image files if selected
      if (selectedImageFiles.length > 0 && selectedParentId) {
        const formData = new FormData();
        selectedImageFiles.forEach(file => {
          formData.append('files', file);
        });
        await api.post(`/items/${selectedParentId}/upload-images`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }).catch(e => console.error('Gagal mengunggah foto barang komposit:', e));
      }

      // If editing existing parent group, remove old composition records for this parent first
      const existingForParent = compositions.filter(c => String(c.parent_item_id) === String(selectedParentId));
      for (const oldComp of existingForParent) {
        await api.delete(`/compositions/${oldComp.id}`).catch(() => {});
      }

      // Create new composition rows for the parent item
      for (const comp of compList) {
        if (comp.child_item_id) {
          await api.post('/compositions', {
            parent_item_id: parseInt(selectedParentId),
            child_item_id: parseInt(comp.child_item_id),
            quantity: parseFloat(comp.quantity || 1),
            is_fixed_cost: Boolean(comp.is_fixed_cost),
            notes: comp.notes || null,
            ...(user?.id ? { created_by_id: user.id, user_id: user.id } : {}),
            created_by: user?.full_name || user?.username || user?.email || 'Admin'
          });
        }
      }

      setShowModal(false);
      setEditingParentGroup(null);
      setSelectedImageFiles([]);
      setPreviewUrls([]);
      setExistingImageUrls([]);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Gagal menyimpan konfigurasi resep komposisi.');
    }
  };

  const handleCreateNewCompositeSubmit = async (e) => {
    e.preventDefault();
    if (!newCompositeData.name.trim()) {
      alert('Nama barang komposit harus diisi.');
      return;
    }
    if (!newCompositeData.compositions || newCompositeData.compositions.length === 0) {
      alert('Tambahkan minimal 1 komponen bahan baku / jasa penyusun.');
      return;
    }

    try {
      const payload = {
        name: newCompositeData.name.trim(),
        ...(user?.id ? { created_by_id: user.id, user_id: user.id } : {}),
        created_by: user?.full_name || user?.username || user?.email || 'Admin',
        category_id: newCompositeData.category_id ? parseInt(newCompositeData.category_id) : null,
        unit: newCompositeData.unit || 'pcs',
        description: newCompositeData.description || null,
        item_type: 'product',
        is_composite: true,
        is_active: true,
        base_price: 0,
        compositions: newCompositeData.compositions.map(c => ({
          child_item_id: parseInt(c.child_item_id),
          quantity: parseFloat(c.quantity || 1),
          is_fixed_cost: Boolean(c.is_fixed_cost),
          notes: c.notes || null
        }))
      };

      const res = await api.post('/items', payload);
      const createdItem = res.data;

      // Upload image files if selected
      if (selectedImageFiles.length > 0 && createdItem && createdItem.id) {
        const formData = new FormData();
        selectedImageFiles.forEach(file => {
          formData.append('files', file);
        });
        await api.post(`/items/${createdItem.id}/upload-images`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }).catch(e => console.error('Gagal mengunggah foto barang komposit:', e));
      }

      showSuccess('Berhasil!', `Barang komposit '${newCompositeData.name}' berhasil dibuat.`);
      setShowCreateCompositeModal(false);
      setSelectedImageFiles([]);
      setPreviewUrls([]);
      setNewCompositeData({
        name: '',
        category_id: '',
        unit: 'pcs',
        description: '',
        compositions: []
      });
      fetchData();
    } catch (err) {
      showError('Gagal!', err.response?.data?.detail || 'Gagal membuat barang komposit baru.');
    }
  };

  const handleDeleteParentGroup = async (group) => {
    if (!canEditOrDelete(group.parentObj || group, user, isSuperAdmin)) {
      showPermissionDeniedAlert('menghapus resep');
      return;
    }
    const parentName = group.parentObj ? group.parentObj.name : `Item #${group.parentId}`;
    const confirmed = await showConfirm({
      title: 'Hapus Resep Komposisi?',
      text: `Apakah Anda yakin ingin menghapus seluruh racikan paket resep untuk "${parentName}"?`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      icon: 'warning'
    });
    if (!confirmed) return;

    try {
      // 1. Delete composition child rows first to satisfy FK constraint
      if (group.compositions && group.compositions.length > 0) {
        for (const comp of group.compositions) {
          await api.delete(`/compositions/${comp.id}`).catch(() => {});
        }
      }

      // 2. Soft-delete parent item using softDeleteItem helper
      if (group.parentId) {
        await softDeleteItem(group.parentId, group.parentObj || {});
      }

      showSuccess('Berhasil!', `Resep paket untuk "${parentName}" telah dihapus.`);
      fetchData();
    } catch (err) {
      showError('Gagal!', err.response?.data?.detail || 'Gagal menghapus resep komposisi.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Katalog Komposisi</h1>
          <p className="text-sm text-slate-400">Resep produk komposit terkelompok per produk utama untuk 1 baris nota kasir & pemotongan multi-stok</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-md transition-colors flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
          <button
            onClick={() => {
              const defaultChild = items[0]?.id || '';
              setNewCompositeData({
                name: '',
                category_id: categories[0]?.id ? String(categories[0].id) : '',
                unit: 'pcs',
                description: '',
                compositions: [
                  { child_item_id: defaultChild, quantity: 1, is_fixed_cost: false, notes: '' }
                ]
              });
              setShowCreateCompositeModal(true);
            }}
            className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>+ Tambah Barang Komposit Baru</span>
          </button>

        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari berdasarkan nama produk komposit, SKU, atau nama bahan penyusun..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-md text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full py-2.5 px-3 bg-slate-900 border border-slate-800 rounded-md text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="">Semua Kategori Produk</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table / Group View */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-sm uppercase tracking-wide">
            <Layers className="h-4 w-4" />
            <span>Matriks Racikan Paket Komposit Toko ({filteredGroupedCompositions.length} Produk Paket)</span>
          </div>
          <span className="text-xs text-slate-500">Total {compositions.length} Sub-Komponen Bahan</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
              <tr>
                <SortableHeader title="Produk Hasil Cetak (Parent Item)" sortKey="parentObj.name" sortConfig={sortConfig} onRequestSort={requestSort} />
                <th className="px-6 py-4">Komponen Bahan Penyusun</th>
                <SortableHeader title="Total Harga Bundel Nota" sortKey="totalBundlePrice" sortConfig={sortConfig} onRequestSort={requestSort} />
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedGroups.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                    Belum ada komposisi resep bahan baku dikonfigurasi. Anda dapat mengaturnya dari tombol "Tambah Paket Resep Komposisi" di atas atau dari Katalog Barang.
                  </td>
                </tr>
              ) : (
                paginatedGroups.map(group => {
                  const parentObj = group.parentObj;

                  return (
                    <tr key={group.parentId} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {parentObj?.image_urls && parentObj.image_urls.length > 0 ? (
                            <img
                              src={getImageUrl(parentObj.image_urls[0])}
                              alt={parentObj.name}
                              className="w-10 h-10 object-cover rounded-lg border border-slate-800 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/30 rounded-lg flex items-center justify-center text-purple-400 shrink-0">
                              <Layers className="h-5 w-5" />
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-100 text-base">
                              {parentObj ? parentObj.name : `Item Paket #${group.parentId}`}
                            </div>
                            <div className="text-xs text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                              <span>SKU: {parentObj?.sku || '-'}</span>
                              <span>|</span>
                              <span>Satuan Nota: {parentObj?.unit || 'pcs'}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => setPreviewCompositionGroup(group)}
                          className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-md text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer shadow-sm group"
                          title="Klik untuk melihat rincian komposisi bahan & tier harga"
                        >
                          <Layers className="h-4 w-4 text-purple-400 group-hover:scale-110 transition-transform" />
                          <span>{group.compositions.length} Komponen Bahan</span>
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-emerald-400 text-base">
                          Rp {group.totalBundlePrice.toLocaleString('id-ID')} / {parentObj?.unit || 'pcs'}
                        </div>
                        <div className="text-[10px] text-purple-400 font-semibold font-mono">
                          (Akumulasi {group.compositions.length} Bahan Komponen)
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {canEditOrDelete(group.parentObj || group, user, isSuperAdmin) && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModalForGroup(group)}
                              className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                              title="Edit Komposit Ini"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteParentGroup(group)}
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Hapus Seluruh Resep Paket Ini"
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

        {/* Pagination */}
        {filteredGroupedCompositions.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredGroupedCompositions.length / pageSize)}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            totalItems={filteredGroupedCompositions.length}
          />
        )}
      </div>

      {/* Modal Resep Komposisi */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-3xl overflow-hidden shadow-2xl space-y-4 my-8">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-purple-400" />
                <h3 className="font-bold text-slate-100 text-sm uppercase tracking-wide">
                  {editingParentGroup ? 'Edit' : 'Tambah Paket Resep Komposisi'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Produk Utama Paket / Resep Komposisi *
                </label>
                <input
                  type="text"
                  required
                  value={editingParentName}
                  onChange={(e) => setEditingParentName(e.target.value)}
                  placeholder="Nama Produk Paket / Resep..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Foto Produk Komposit */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Foto Produk Komposit (Opsional)
                </label>
                <div className="flex flex-wrap items-center gap-3 bg-slate-950 p-3 rounded-md border border-slate-800">
                  {/* Existing Images */}
                  {existingImageUrls.map((url, idx) => (
                    <div key={`existing-${idx}`} className="relative w-16 h-16 rounded-lg border border-slate-700 overflow-hidden group">
                      <img src={getImageUrl(url)} alt={`Foto ${idx+1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setExistingImageUrls(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
                        title="Hapus foto ini"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {/* New Selected Images Preview */}
                  {previewUrls.map((url, idx) => (
                    <div key={`new-${idx}`} className="relative w-16 h-16 rounded-lg border border-purple-500/50 overflow-hidden group">
                      <img src={url} alt={`Preview ${idx+1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeSelectedImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
                        title="Batal upload foto ini"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {/* Upload File Input Button */}
                  <label className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-700 hover:border-purple-500 bg-slate-900 flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-purple-400 transition-all text-[10px] font-semibold text-center p-1">
                    <Upload className="h-4 w-4 mb-0.5" />
                    <span>+ Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <CompositionBuilder
                items={items}
                parentItemId={selectedParentId}
                compositions={compList}
                onChange={setCompList}
                isComposite={true}
                onIsCompositeChange={() => {}}
                showParentSelector={true}
                selectedParentId={selectedParentId}
                onParentIdChange={(newId) => {
                  setSelectedParentId(newId);
                  const found = items.find(i => String(i.id) === String(newId));
                  if (found) {
                    setEditingParentName(found.name || '');
                  }
                }}
              />

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-sm font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-500 hover:bg-purple-400 text-slate-950 rounded-md text-sm font-bold transition-colors shadow-lg shadow-purple-500/20"
                >
                  Simpan Konfigurasi Resep
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH BARANG KOMPOSIT BARU */}
      {showCreateCompositeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-lg p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400">
                <Layers className="h-5 w-5" />
                <h3 className="font-bold text-lg text-slate-100">Tambah Barang Komposit Baru (BOM / Resep Produk)</h3>
              </div>
              <button onClick={() => setShowCreateCompositeModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewCompositeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Barang Komposit / Produk Paket *</label>
                <input
                  type="text"
                  required
                  value={newCompositeData.name}
                  onChange={(e) => setNewCompositeData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Contoh: Buku Yasin Custom 128 Hal / Paket Flyer + Amplop"
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Kategori Produk</label>
                  <select
                    value={newCompositeData.category_id}
                    onChange={(e) => setNewCompositeData(prev => ({ ...prev, category_id: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Pilih Kategori --</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Satuan Produk (Unit)</label>
                  <input
                    type="text"
                    value={newCompositeData.unit}
                    onChange={(e) => setNewCompositeData(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="buku / set / pcs / pack"
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Deskripsi Produk (Opsional)</label>
                <textarea
                  rows="2"
                  value={newCompositeData.description}
                  onChange={(e) => setNewCompositeData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Catatan / spesifikasi paket..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Upload Foto Barang Komposit */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Foto Produk / Contoh Hasil (Opsional)</span>
                </label>
                <div className="flex flex-wrap gap-2 items-center">
                  {previewUrls.map((url, idx) => (
                    <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-700 group">
                      <img src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeSelectedImage(idx)}
                        className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-400 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  <label className="w-14 h-14 rounded-lg border-2 border-dashed border-slate-800 hover:border-emerald-500/50 bg-slate-950/50 flex flex-col items-center justify-center text-slate-500 hover:text-emerald-400 cursor-pointer transition-colors">
                    <Upload className="h-4 w-4 mb-0.5" />
                    <span className="text-[9px] font-bold">+Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Composition Builder Component */}
              <div className="pt-2">
                <CompositionBuilder
                  items={items}
                  showParentSelector={false}
                  isComposite={true}
                  compositions={newCompositeData.compositions}
                  onIsCompositeChange={() => {}}
                  onCompositionsChange={(list) => setNewCompositeData(prev => ({ ...prev, compositions: list }))}
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateCompositeModal(false)}
                  className="py-2.5 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-md text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md text-xs shadow-lg shadow-emerald-500/20"
                >
                  SIMPAN BARANG KOMPOSIT BARU
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL KOMPOSISI RESEP MODAL */}
      {previewCompositionGroup && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Produk Komposit / Bundel
                  </span>
                </div>
                <h2 className="text-lg font-extrabold text-slate-100">{previewCompositionGroup.parentObj?.name || `Paket #${previewCompositionGroup.parentId}`}</h2>
                <p className="text-xs text-slate-400 font-mono">
                  SKU: {previewCompositionGroup.parentObj?.sku || '-'} | Satuan Nota: {previewCompositionGroup.parentObj?.unit || 'pcs'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewCompositionGroup(null)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Total Bundle Price Banner */}
            <div className="bg-slate-950 border border-purple-500/30 p-4 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Total Akumulasi Harga Bundel</span>
                <div className="text-xl font-extrabold text-emerald-400 font-mono mt-0.5">
                  Rp {previewCompositionGroup.totalBundlePrice.toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-400">/ {previewCompositionGroup.parentObj?.unit || 'pcs'}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-300 px-2.5 py-1 bg-purple-500/10 border border-purple-500/30 rounded">
                  {previewCompositionGroup.compositions.length} Bahan Baku
                </span>
              </div>
            </div>

            {/* Sub-Components Table */}
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-purple-400" />
                <span>Rincian Item Bahan Penyusun & Subtotal Harga</span>
              </h3>

              <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-3.5 py-2.5">Item Bahan</th>
                      <th className="px-3.5 py-2.5">Kuantitas</th>
                      <th className="px-3.5 py-2.5">Harga Satuan</th>
                      <th className="px-3.5 py-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {previewCompositionGroup.compositions.map((comp, idx) => {
                      const child = comp.childObj || {};
                      const childTiers = child.price_tiers || [];

                      return (
                        <tr key={idx} className="hover:bg-purple-500/5 transition-colors">
                          <td className="px-3.5 py-2.5 font-bold text-slate-200">
                            <div>{child.name || `Bahan #${comp.child_item_id}`}</div>
                            {childTiers.length > 0 && (
                              <div className="text-[10px] text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
                                <TrendingDown className="h-3 w-3" />
                                <span>{childTiers.length} Tier Grosir Aktif</span>
                              </div>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 font-bold text-purple-300">
                            {parseFloat(comp.quantity)} {child.unit || 'pcs'}
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-300">
                            Rp {comp.unitPrice.toLocaleString('id-ID')}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-extrabold text-emerald-400">
                            Rp {comp.subtotal.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const grp = previewCompositionGroup;
                  setPreviewCompositionGroup(null);
                  openEditModalForGroup(grp);
                }}
                className="py-2 px-4 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Edit Resep Komposisi Ini</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewCompositionGroup(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-colors"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Compositions;
