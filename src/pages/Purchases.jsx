import React, { useState, useEffect, useMemo } from 'react';
import { Truck, Plus, Search, RefreshCw, Eye, Trash2, X, FileText, CheckCircle2, Clock, DollarSign, PackageCheck, AlertCircle, Building2, Package } from 'lucide-react';
import api from '../services/api';
import Pagination from '../components/Pagination';
import { useSortableData, SortableHeader } from '../hooks/useSortableData';
import { showSuccess, showError, showConfirm } from '../utils/swal';

const Purchases = () => {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');

  // Modals State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPurchaseDetail, setSelectedPurchaseDetail] = useState(null);

  // Quick Create Sub-modals State
  const [showQuickSupplierModal, setShowQuickSupplierModal] = useState(false);
  const [quickSupplierData, setQuickSupplierData] = useState({
    name: '',
    contact_name: '',
    phone: '',
    address: ''
  });

  const [showQuickItemModal, setShowQuickItemModal] = useState(false);
  const [quickItemTargetRowIndex, setQuickItemTargetRowIndex] = useState(0);
  const [quickItemData, setQuickItemData] = useState({
    name: '',
    category_id: '',
    unit: 'pcs',
    cost_price: 0,
    base_price: 0,
    track_stock: true
  });

  // Form State for New Purchase
  const [formData, setFormData] = useState({
    supplier_id: '',
    supplier_invoice_number: '',
    status: 'received',
    discount_amount: 0,
    additional_costs: 0,
    notes: '',
    is_paid_initial: false,
    initial_payment_amount: 0,
    initial_payment_method: 'cash',
    items: [
      { item_id: '', quantity: 1, unit_cost_price: 0 }
    ]
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchPurchasesData = async () => {
    setLoading(true);
    try {
      const [purchasesRes, suppliersRes, itemsRes, categoriesRes] = await Promise.all([
        api.get('/purchases/').catch(() => ({ data: [] })),
        api.get('/suppliers/').catch(() => ({ data: [] })),
        api.get('/items/', { params: { is_active: true } }).catch(() => api.get('/items/')).catch(() => ({ data: [] })),
        api.get('/categories/').catch(() => ({ data: [] }))
      ]);

      setPurchases(purchasesRes.data || []);
      setSuppliers(suppliersRes.data || []);
      setItemsList(itemsRes.data || []);
      setCategoriesList(categoriesRes.data || []);
    } catch (err) {
      console.error("Error fetching purchases data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchasesData();
  }, []);

  // Filtered Purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (paymentStatusFilter && p.payment_status !== paymentStatusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const numMatch = p.purchase_number && p.purchase_number.toLowerCase().includes(q);
        const invMatch = p.supplier_invoice_number && p.supplier_invoice_number.toLowerCase().includes(q);
        const supMatch = p.supplier && p.supplier.name && p.supplier.name.toLowerCase().includes(q);
        return numMatch || invMatch || supMatch;
      }
      return true;
    });
  }, [purchases, searchQuery, statusFilter, paymentStatusFilter]);

  const { items: sortedPurchases, requestSort, sortConfig } = useSortableData(filteredPurchases);
  const paginatedPurchases = sortedPurchases.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Form Calculators
  const formSubtotal = useMemo(() => {
    return formData.items.reduce((sum, it) => {
      const q = parseFloat(it.quantity || 0);
      const c = parseFloat(it.unit_cost_price || 0);
      return sum + (q * c);
    }, 0);
  }, [formData.items]);

  const formGrandTotal = useMemo(() => {
    const disc = parseFloat(formData.discount_amount || 0);
    const add = parseFloat(formData.additional_costs || 0);
    const total = (formSubtotal - disc) + add;
    return total > 0 ? total : 0;
  }, [formSubtotal, formData.discount_amount, formData.additional_costs]);

  // Form Handlers
  const handleAddItemRow = () => {
    const firstItem = itemsList[0];
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          item_id: firstItem ? firstItem.id : '',
          quantity: 1,
          unit_cost_price: firstItem ? parseFloat(firstItem.cost_price || 0) : 0
        }
      ]
    }));
  };

  const handleRemoveItemRow = (index) => {
    if (formData.items.length <= 1) {
      alert("Pembelian harus memiliki minimal 1 item barang.");
      return;
    }
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemSelectChange = (index, itemIdStr) => {
    const selectedItem = itemsList.find(i => String(i.id) === String(itemIdStr));
    setFormData(prev => {
      const updatedItems = [...prev.items];
      updatedItems[index] = {
        ...updatedItems[index],
        item_id: itemIdStr ? parseInt(itemIdStr) : '',
        unit_cost_price: selectedItem ? parseFloat(selectedItem.cost_price || 0) : updatedItems[index].unit_cost_price
      };
      return { ...prev, items: updatedItems };
    });
  };

  const handleItemRowChange = (index, field, value) => {
    setFormData(prev => {
      const updatedItems = [...prev.items];
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value
      };
      return { ...prev, items: updatedItems };
    });
  };

  const openCreateModal = () => {
    const firstItem = itemsList[0];
    setFormData({
      supplier_id: '',
      supplier_invoice_number: '',
      status: 'received',
      discount_amount: 0,
      additional_costs: 0,
      notes: '',
      is_paid_initial: true,
      initial_payment_amount: 0,
      initial_payment_method: 'cash',
      items: [
        {
          item_id: firstItem ? firstItem.id : '',
          quantity: 1,
          unit_cost_price: firstItem ? parseFloat(firstItem.cost_price || 0) : 0
        }
      ]
    });
    setShowCreateModal(true);
  };

  // Quick Create Supplier Handler
  const handleQuickSupplierSubmit = async (e) => {
    e.preventDefault();
    if (!quickSupplierData.name.trim()) {
      showError("Validasi Gagal", "Nama supplier harus diisi.");
      return;
    }

    try {
      const res = await api.post('/suppliers', {
        name: quickSupplierData.name.trim(),
        contact_name: quickSupplierData.contact_name.trim() || null,
        phone: quickSupplierData.phone.trim() || null,
        address: quickSupplierData.address.trim() || null,
        is_active: true
      });

      const newSup = res.data;
      setSuppliers(prev => [newSup, ...prev]);
      setFormData(prev => ({ ...prev, supplier_id: newSup.id }));
      setShowQuickSupplierModal(false);
      setQuickSupplierData({ name: '', contact_name: '', phone: '', address: '' });
      showSuccess("Berhasil!", `Supplier baru "${newSup.name}" berhasil ditambahkan.`);
    } catch (err) {
      console.error(err);
      showError("Gagal!", err.response?.data?.detail || "Gagal menambahkan supplier baru.");
    }
  };

  // Quick Create Item Handler
  const openQuickItemModal = (rowIndex = 0) => {
    setQuickItemTargetRowIndex(rowIndex);
    setQuickItemData({
      name: '',
      category_id: categoriesList[0] ? categoriesList[0].id : '',
      unit: 'pcs',
      cost_price: 0,
      base_price: 0,
      track_stock: true
    });
    setShowQuickItemModal(true);
  };

  const handleQuickItemSubmit = async (e) => {
    e.preventDefault();
    if (!quickItemData.name.trim()) {
      showError("Validasi Gagal", "Nama barang harus diisi.");
      return;
    }

    try {
      const payload = {
        name: quickItemData.name.trim(),
        category_id: quickItemData.category_id ? parseInt(quickItemData.category_id) : null,
        unit: quickItemData.unit || 'pcs',
        cost_price: parseFloat(quickItemData.cost_price || 0),
        base_price: parseFloat(quickItemData.base_price || 0),
        item_type: 'product',
        is_active: true,
        track_stock: Boolean(quickItemData.track_stock)
      };

      const res = await api.post('/items', payload);
      const newItem = res.data;

      setItemsList(prev => [newItem, ...prev]);
      
      // Auto-select in target row
      setFormData(prev => {
        const updatedItems = [...prev.items];
        const rIdx = quickItemTargetRowIndex < updatedItems.length ? quickItemTargetRowIndex : updatedItems.length - 1;
        updatedItems[rIdx] = {
          ...updatedItems[rIdx],
          item_id: newItem.id,
          unit_cost_price: parseFloat(newItem.cost_price || 0)
        };
        return { ...prev, items: updatedItems };
      });

      setShowQuickItemModal(false);
      setQuickItemData({ name: '', category_id: '', unit: 'pcs', cost_price: 0, base_price: 0, track_stock: true });
      showSuccess("Berhasil!", `Barang baru "${newItem.name}" berhasil ditambahkan.`);
    } catch (err) {
      console.error(err);
      showError("Gagal!", err.response?.data?.detail || "Gagal menambahkan barang baru.");
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const validItems = formData.items.filter(it => it.item_id && parseFloat(it.quantity) > 0);
    if (validItems.length === 0) {
      showError("Validasi Gagal", "Pilih minimal 1 item barang valid dengan jumlah > 0.");
      return;
    }

    try {
      const payload = {
        supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null,
        supplier_invoice_number: formData.supplier_invoice_number.trim() || null,
        status: formData.status || 'received',
        discount_amount: parseFloat(formData.discount_amount || 0),
        additional_costs: parseFloat(formData.additional_costs || 0),
        notes: formData.notes.trim() || null,
        items: validItems.map(it => ({
          item_id: parseInt(it.item_id),
          quantity: parseFloat(it.quantity || 1),
          unit_cost_price: parseFloat(it.unit_cost_price || 0)
        })),
        ...(formData.is_paid_initial && parseFloat(formData.initial_payment_amount) > 0 ? {
          initial_payment: {
            payment_method: formData.initial_payment_method || 'cash',
            amount: parseFloat(formData.initial_payment_amount),
            notes: 'Pembayaran saat pencatatan stok in'
          }
        } : {})
      };

      await api.post('/purchases', payload);
      showSuccess("Berhasil!", "Catatan Pembelian & Stok In berhasil disimpan.");
      setShowCreateModal(false);
      fetchPurchasesData();
    } catch (err) {
      console.error(err);
      showError("Gagal!", err.response?.data?.detail || "Gagal menyimpan transaksi pembelian.");
    }
  };

  const handleOpenDetailModal = async (purchase) => {
    try {
      const res = await api.get(`/purchases/${purchase.id}`);
      setSelectedPurchaseDetail(res.data);
      setShowDetailModal(true);
    } catch (err) {
      console.error(err);
      setSelectedPurchaseDetail(purchase);
      setShowDetailModal(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Truck className="h-6 w-6 text-emerald-400" />
            <span>Pembelian & Stok In</span>
          </h1>
          <p className="text-sm text-slate-400">Pencatatan nota pembelian dari supplier & update otomatis stok / HPP</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCreateModal}
            className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md transition-all flex items-center gap-2 text-sm shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Pembelian Stok Baru</span>
          </button>
          <button
            onClick={fetchPurchasesData}
            className="p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-md transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari no ref PO, no faktur supplier, atau nama supplier..."
            className="w-full bg-slate-950 border border-slate-800 rounded-md py-2 pl-10 pr-4 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="py-2 px-3 bg-slate-950 border border-slate-800 rounded-md text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="">Semua Status Stok</option>
            <option value="received">Stok Masuk (Received)</option>
            <option value="draft">Draft Pesanan</option>
            <option value="cancelled">Dibatalkan</option>
          </select>

          <select
            value={paymentStatusFilter}
            onChange={(e) => {
              setPaymentStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="py-2 px-3 bg-slate-950 border border-slate-800 rounded-md text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="">Semua Status Bayar</option>
            <option value="paid">Lunas</option>
            <option value="partial">Utang / DP</option>
            <option value="unpaid">Belum Dibayar</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <SortableHeader title="No. Ref PO" sortKey="purchase_number" sortConfig={sortConfig} onRequestSort={requestSort} />
                <SortableHeader title="No. Faktur Supplier" sortKey="supplier_invoice_number" sortConfig={sortConfig} onRequestSort={requestSort} />
                <SortableHeader title="Supplier" sortKey="supplier.name" sortConfig={sortConfig} onRequestSort={requestSort} />
                <SortableHeader title="Total Pembelian" sortKey="total_amount" sortConfig={sortConfig} onRequestSort={requestSort} />
                <SortableHeader title="Status Stok" sortKey="status" sortConfig={sortConfig} onRequestSort={requestSort} />
                <SortableHeader title="Status Bayar" sortKey="payment_status" sortConfig={sortConfig} onRequestSort={requestSort} />
                <SortableHeader title="Tanggal Masuk" sortKey="created_at" sortConfig={sortConfig} onRequestSort={requestSort} />
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-slate-500">
                    Belum ada riwayat pencatatan pembelian & stok in.
                  </td>
                </tr>
              ) : (
                paginatedPurchases.map(p => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-bold text-emerald-400">{p.purchase_number || `PO-${p.id}`}</td>
                    <td className="px-6 py-4 text-slate-300 font-sans">{p.supplier_invoice_number || '-'}</td>
                    <td className="px-6 py-4 font-semibold text-slate-100 font-sans">
                      {p.supplier ? p.supplier.name : 'Supplier Umum'}
                    </td>
                    <td className="px-6 py-4 font-extrabold text-slate-100">
                      Rp {parseFloat(p.total_amount || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        p.status === 'received' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        p.status === 'draft' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {p.status === 'received' ? 'Stok Masuk' : p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        p.payment_status === 'paid' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        p.payment_status === 'partial' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {p.payment_status === 'paid' ? 'Lunas' : (p.payment_status === 'partial' ? 'Utang / DP' : 'Belum Dibayar')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {p.created_at ? new Date(p.created_at).toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-sans">
                      <button
                        type="button"
                        onClick={() => handleOpenDetailModal(p)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={filteredPurchases.length}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* MODAL FORM TAMBAH PEMBELIAN STOK BARU */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-xl p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400">
                <Truck className="h-5 w-5" />
                <h3 className="font-bold text-slate-100 text-base">Tambah Pembelian Stok Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              {/* Row 1: Supplier & Faktur No */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-300">Supplier Rekanan</label>
                    <button
                      type="button"
                      onClick={() => setShowQuickSupplierModal(true)}
                      className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                      <span>+ Supplier Baru</span>
                    </button>
                  </div>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => {
                      if (e.target.value === '__add_new__') {
                        setShowQuickSupplierModal(true);
                      } else {
                        setFormData(prev => ({ ...prev, supplier_id: e.target.value }));
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Supplier Umum / Tanpa Rekanan</option>
                    <option value="__add_new__" className="font-bold text-emerald-400">➕ Tambah Supplier Baru...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code || `SUP-${s.id}`})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">No. Faktur / Nota Supplier</label>
                  <input
                    type="text"
                    value={formData.supplier_invoice_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplier_invoice_number: e.target.value }))}
                    placeholder="Contoh: INV-SUP-2026-001..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Status Penerimaan Stok *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="received">STOK MASUK (Received - Update Stok & HPP)</option>
                    <option value="draft">DRAFT (Rencana PO Pembelian)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Table Multi-Item Input */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-200 text-sm">Daftar Barang Pembelian / Kulakan *</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openQuickItemModal(formData.items.length - 1)}
                      className="px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>+ Barang Baru</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Tambah Baris Barang</span>
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-900 text-slate-400 text-[11px] uppercase font-semibold border-b border-slate-800">
                      <tr>
                        <th className="px-3 py-2">Barang / Bahan Baku</th>
                        <th className="px-3 py-2 w-28 text-center">Jumlah (Qty)</th>
                        <th className="px-3 py-2 w-36 text-right">Harga Modal / Unit (Rp)</th>
                        <th className="px-3 py-2 w-36 text-right">Subtotal (Rp)</th>
                        <th className="px-2 py-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {formData.items.map((rowItem, idx) => {
                        const lineSubtotal = (parseFloat(rowItem.quantity || 0)) * (parseFloat(rowItem.unit_cost_price || 0));
                        return (
                          <tr key={idx} className="hover:bg-slate-900/50">
                            <td className="px-3 py-2 font-sans">
                              <select
                                value={rowItem.item_id}
                                onChange={(e) => {
                                  if (e.target.value === '__add_new__') {
                                    openQuickItemModal(idx);
                                  } else {
                                    handleItemSelectChange(idx, e.target.value);
                                  }
                                }}
                                className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                              >
                                <option value="">Pilih Barang...</option>
                                <option value="__add_new__" className="font-bold text-purple-400">➕ Tambah Barang Baru...</option>
                                {itemsList.map(it => (
                                  <option key={it.id} value={it.id}>
                                    {it.name} ({it.unit || 'pcs'}) {it.sku ? `- SKU: ${it.sku}` : ''}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="any"
                                min="0.01"
                                value={rowItem.quantity}
                                onChange={(e) => handleItemRowChange(idx, 'quantity', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-center text-slate-200 focus:outline-none focus:border-emerald-500"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={rowItem.unit_cost_price}
                                onChange={(e) => handleItemRowChange(idx, 'unit_cost_price', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-right text-slate-200 focus:outline-none focus:border-emerald-500"
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-extrabold text-emerald-400">
                              Rp {lineSubtotal.toLocaleString('id-ID')}
                            </td>
                            <td className="px-2 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(idx)}
                                className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded"
                                title="Hapus baris"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Row 3: Totals & Diskon / Cost Adjustments */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Catatan Pembelian</label>
                    <textarea
                      rows="3"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Catatan tambahan mengenai pembelian/kulakan stok ini..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                    ></textarea>
                  </div>

                  {/* Checkbox Pembayaran Awal / Pelunasan */}
                  <div className="bg-slate-950 border border-slate-800 p-3 rounded-md space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-emerald-400">
                      <input
                        type="checkbox"
                        checked={formData.is_paid_initial}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData(prev => ({
                            ...prev,
                            is_paid_initial: checked,
                            initial_payment_amount: checked ? formGrandTotal : 0
                          }));
                        }}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span>Bayar Langsung / DP Pembelian Ini</span>
                    </label>

                    {formData.is_paid_initial && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Jumlah Bayar (Rp)</label>
                          <input
                            type="number"
                            step="any"
                            value={formData.initial_payment_amount}
                            onChange={(e) => setFormData(prev => ({ ...prev, initial_payment_amount: e.target.value }))}
                            className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200 font-mono font-bold focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Metode Bayar</label>
                          <select
                            value={formData.initial_payment_method}
                            onChange={(e) => setFormData(prev => ({ ...prev, initial_payment_method: e.target.value }))}
                            className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                          >
                            <option value="cash">Tunai (Cash)</option>
                            <option value="bank_transfer">Transfer Bank</option>
                            <option value="giro">Giro</option>
                            <option value="other">Lainnya</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-md p-4 space-y-2.5 font-mono">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Subtotal Barang ({formData.items.length} Baris):</span>
                    <span className="font-bold text-slate-200">Rp {formSubtotal.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Potongan Diskon (Rp):</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={formData.discount_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, discount_amount: e.target.value }))}
                      className="w-32 bg-slate-900 border border-slate-800 rounded p-1.5 text-right text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Biaya Tambahan / Ongkir (Rp):</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={formData.additional_costs}
                      onChange={(e) => setFormData(prev => ({ ...prev, additional_costs: e.target.value }))}
                      className="w-32 bg-slate-900 border border-slate-800 rounded p-1.5 text-right text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-sm">
                    <span className="font-bold text-slate-100 font-sans">TOTAL KULAKAN / PEMBELIAN:</span>
                    <span className="text-xl font-extrabold text-emerald-400">
                      Rp {formGrandTotal.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-md font-bold transition-colors shadow-lg shadow-emerald-500/20"
                >
                  Simpan Pembelian & Update Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK CREATE SUPPLIER SUB-MODAL */}
      {showQuickSupplierModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400">
                <Building2 className="h-5 w-5" />
                <h3 className="font-bold text-slate-100 text-sm">Tambah Supplier Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickSupplierModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleQuickSupplierSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nama Supplier / PT / CV *</label>
                <input
                  type="text"
                  required
                  value={quickSupplierData.name}
                  onChange={(e) => setQuickSupplierData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Contoh: PT Kertas Nusantara..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nama Kontak Person</label>
                <input
                  type="text"
                  value={quickSupplierData.contact_name}
                  onChange={(e) => setQuickSupplierData(prev => ({ ...prev, contact_name: e.target.value }))}
                  placeholder="Contoh: Pak Budi (Sales)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">No. HP / Telepon / WA</label>
                <input
                  type="text"
                  value={quickSupplierData.phone}
                  onChange={(e) => setQuickSupplierData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="081234567890"
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Alamat Supplier</label>
                <textarea
                  rows="2"
                  value={quickSupplierData.address}
                  onChange={(e) => setQuickSupplierData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Alamat kantor/gudang supplier..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickSupplierModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-md font-bold"
                >
                  Simpan & Pilih Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK CREATE ITEM SUB-MODAL */}
      {showQuickItemModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-purple-400">
                <Package className="h-5 w-5" />
                <h3 className="font-bold text-slate-100 text-sm">Tambah Barang Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickItemModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleQuickItemSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nama Barang / Bahan Baku *</label>
                <input
                  type="text"
                  required
                  value={quickItemData.name}
                  onChange={(e) => setQuickItemData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Contoh: Kertas Art Paper 260gr A3+..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Kategori Barang</label>
                  <select
                    value={quickItemData.category_id}
                    onChange={(e) => setQuickItemData(prev => ({ ...prev, category_id: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Tanpa Kategori</option>
                    {categoriesList.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Satuan</label>
                  <input
                    type="text"
                    value={quickItemData.unit}
                    onChange={(e) => setQuickItemData(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="pcs, pack, rim..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Harga Beli / Modal (Rp)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={quickItemData.cost_price}
                    onChange={(e) => setQuickItemData(prev => ({ ...prev, cost_price: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Harga Jual Standar (Rp)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={quickItemData.base_price}
                    onChange={(e) => setQuickItemData(prev => ({ ...prev, base_price: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-300">
                  <input
                    type="checkbox"
                    checked={quickItemData.track_stock}
                    onChange={(e) => setQuickItemData(prev => ({ ...prev, track_stock: e.target.checked }))}
                    className="rounded border-slate-700 text-purple-500 focus:ring-purple-500"
                  />
                  <span>Lacak Jumlah Stok di Toko</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickItemModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-400 text-slate-950 rounded-md font-bold"
                >
                  Simpan & Pilih Barang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETAIL PEMBELIAN */}
      {showDetailModal && selectedPurchaseDetail && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Rincian Pembelian Stok In</span>
                <h3 className="font-extrabold text-slate-100 text-lg font-mono">{selectedPurchaseDetail.purchase_number}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div>
                <span className="text-slate-500 block">Supplier:</span>
                <strong className="text-slate-200 text-sm">{selectedPurchaseDetail.supplier ? selectedPurchaseDetail.supplier.name : 'Supplier Umum'}</strong>
                <span className="text-slate-400 block text-[11px] mt-0.5">No. Faktur: {selectedPurchaseDetail.supplier_invoice_number || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Tanggal Masuk:</span>
                <span className="text-slate-200 font-mono">{new Date(selectedPurchaseDetail.created_at).toLocaleString('id-ID')}</span>
                <span className="text-slate-400 block text-[11px] mt-0.5">Total: Rp {parseFloat(selectedPurchaseDetail.total_amount || 0).toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Purchased Items Table */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300">Rincian Barang Yang Dibeli:</span>
              <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900 text-slate-400 text-[11px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-2">Barang</th>
                      <th className="px-4 py-2 text-center">Qty</th>
                      <th className="px-4 py-2 text-right">Harga Modal Unit</th>
                      <th className="px-4 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {selectedPurchaseDetail.items && selectedPurchaseDetail.items.length > 0 ? (
                      selectedPurchaseDetail.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-slate-200 font-sans">{it.item_id ? `Item #${it.item_id}` : 'Barang'}</td>
                          <td className="px-4 py-2 text-center text-slate-300">{parseFloat(it.quantity)}</td>
                          <td className="px-4 py-2 text-right text-slate-300">Rp {parseFloat(it.unit_cost_price).toLocaleString('id-ID')}</td>
                          <td className="px-4 py-2 text-right font-extrabold text-emerald-400">Rp {parseFloat(it.subtotal).toLocaleString('id-ID')}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="px-4 py-4 text-center text-slate-500">Tidak ada rincian item.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;


