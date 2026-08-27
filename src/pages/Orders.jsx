import { showSuccess, showError, showConfirm } from '../utils/swal';
import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, Search, Filter, Eye, Download, Printer, CheckCircle2,
  Clock, AlertTriangle, FileText, ChevronRight, RefreshCw, X, Wallet, CreditCard, DollarSign, UserCheck, RotateCcw
} from 'lucide-react';
import api, { API_BASE_URL } from '../services/api';
import Pagination from '../components/Pagination';
import { useSortableData, SortableHeader } from '../hooks/useSortableData';
import { sendServerPrint } from '../services/printService';
import { useAuth } from '../context/AuthContext';
import { canEditOrDelete, showPermissionDeniedAlert } from '../utils/permissions';

const getOrderCreatorName = (o) => {
  if (!o) return '-';
  if (o.order_source === 'whatsapp') return '🤖 AI WhatsApp';
  if (o.created_by_user?.full_name) return o.created_by_user.full_name;
  if (o.created_by_user?.name) return o.created_by_user.name;
  if (o.created_by_user?.username) return o.created_by_user.username;

  if (o.kasir?.full_name) return o.kasir.full_name;
  if (o.kasir?.name) return o.kasir.name;
  if (o.kasir_name) return o.kasir_name;

  if (o.cashier?.full_name) return o.cashier.full_name;
  if (o.cashier?.name) return o.cashier.name;
  if (o.cashier_name) return o.cashier_name;

  if (o.user?.full_name) return o.user.full_name;
  if (o.user?.name) return o.user.name;
  if (o.user?.username) return o.user.username;

  if (o.creator?.full_name) return o.creator.full_name;
  if (o.creator?.name) return o.creator.name;

  if (o.created_by_name) return o.created_by_name;
  if (typeof o.created_by === 'string' && o.created_by.trim() && o.created_by !== 'Admin') return o.created_by;
  if (typeof o.created_by === 'object' && o.created_by !== null) {
    if (o.created_by.full_name) return o.created_by.full_name;
    if (o.created_by.name) return o.created_by.name;
  }

  if (o.order_source === 'pos' || o.order_source === 'kasir') return 'Kasir Admin';
  if (o.order_source === 'online' || o.order_source === 'web') return 'Customer (Online)';

  return 'Admin Toko';
};

const getOrderOperatorName = (o) => {
  if (!o) return 'Belum Ditugaskan';
  if (Array.isArray(o.assigned_admins) && o.assigned_admins.length > 0) {
    return o.assigned_admins.map(a => a.full_name || a.name || a.username || a.email).join(', ');
  }
  if (o.operator?.full_name) return o.operator.full_name;
  if (o.operator?.name) return o.operator.name;
  if (o.operator_name) return o.operator_name;

  if (o.assigned_to?.full_name) return o.assigned_to.full_name;
  if (o.assigned_to?.name) return o.assigned_to.name;
  if (o.assigned_to_name) return o.assigned_to_name;

  if (o.handler?.full_name) return o.handler.full_name;
  if (o.handler?.name) return o.handler.name;
  if (o.handler_name) return o.handler_name;

  if (o.processed_by_name) return o.processed_by_name;
  if (typeof o.processed_by === 'string' && o.processed_by.trim()) return o.processed_by;
  if (typeof o.processed_by === 'object' && o.processed_by !== null) {
    if (o.processed_by.full_name) return o.processed_by.full_name;
    if (o.processed_by.name) return o.processed_by.name;
  }

  // If completed or paid lunas, default operator to the admin creator
  if (o.order_status === 'completed' || o.payment_status === 'paid') {
    const creator = getOrderCreatorName(o);
    if (creator && creator !== '-') return creator;
  }

  return 'Belum Ditugaskan';
};

const isOrderUnassigned = (o) => {
  if (!o) return true;
  if (Array.isArray(o.assigned_admins) && o.assigned_admins.length > 0) return false;
  if (o.operator?.full_name || o.operator?.name || o.operator_name) return false;
  if (o.assigned_to?.full_name || o.assigned_to?.name || o.assigned_to_name) return false;
  if (o.handler?.full_name || o.handler?.name || o.handler_name) return false;
  if (o.processed_by_name || (typeof o.processed_by === 'string' && o.processed_by.trim())) return false;
  return true;
};

const canOrderBeHandled = (o) => {
  if (!o) return false;
  return o.order_status === 'pending' && isOrderUnassigned(o);
};

const canOrderBeUnhandled = (o) => {
  if (!o) return false;
  return o.order_status === 'processing';
};

const getOrderStatusBadgeClass = (status) => {
  switch (status) {
    case 'pending':
      return 'bg-rose-500/15 text-rose-400 border border-rose-500/40 font-bold';
    case 'processing':
      return 'bg-blue-500/15 text-blue-400 border border-blue-500/40 font-bold';
    case 'ready_for_pickup':
      return 'bg-transparent text-emerald-400 border border-emerald-500/80 font-bold';
    case 'completed':
      return 'bg-emerald-500 text-slate-950 border border-emerald-500 font-bold';
    case 'cancelled':
      return 'bg-slate-800 text-slate-400 border border-slate-700 font-bold';
    default:
      return 'bg-slate-800 text-slate-400 border border-slate-700 font-bold';
  }
};

const formatCustomerName = (name) => {
  if (!name) return 'Walk-in';
  const str = String(name).trim();
  if (str.toLowerCase().includes('walk-in') || str.toLowerCase().includes('walkin') || str.toLowerCase().includes('pelanggan langsung')) {
    return 'Walk-in';
  }
  return str;
};

const Orders = () => {
  const { user, isSuperAdmin } = useAuth();
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [posReceiptText, setPosReceiptText] = useState('');
  const [posQrBase64, setPosQrBase64] = useState('');
  const [tagModalTitle, setTagModalTitle] = useState('Struk POS Thermal');
  const [printStatusMsg, setPrintStatusMsg] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'kanban'
  const [waConfirmOrder, setWaConfirmOrder] = useState(null); // order object waiting for WA confirmation
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Pelunasan Sisa DP State
  const [showPelunasanModal, setShowPelunasanModal] = useState(false);
  const [pelunasanOrder, setPelunasanOrder] = useState(null);
  const [pelunasanAmount, setPelunasanAmount] = useState(0);
  const [pelunasanMethod, setPelunasanMethod] = useState('cash');
  const [pelunasanCashInput, setPelunasanCashInput] = useState('');

  const openPelunasanModal = (order, remaining) => {
    setPelunasanOrder(order);
    setPelunasanAmount(remaining);
    setPelunasanMethod('cash');
    setPelunasanCashInput('');
    setShowPelunasanModal(true);
  };

  const handlePelunasanSubmit = async () => {
    if (!pelunasanOrder) return;
    if (!canEditOrDelete(pelunasanOrder, user, isSuperAdmin)) {
      showPermissionDeniedAlert('memproses pelunasan');
      return;
    }
    const confirm = await showConfirm({
      title: 'Proses Pelunasan Nota?',
      text: `Apakah Anda yakin ingin memproses pelunasan sebesar Rp ${parseFloat(pelunasanAmount || 0).toLocaleString('id-ID')} untuk invoice ${pelunasanOrder.invoice_number}?`,
      confirmText: 'Ya, Pelunasan Lunas',
      cancelText: 'Batal',
      icon: 'question'
    });
    if (!confirm) return;

    try {
      await api.post(`/orders/${pelunasanOrder.id}/payments`, {
        amount: parseFloat(pelunasanAmount || 0),
        payment_method: pelunasanMethod,
        payment_type: 'settlement',
        notes: 'Pelunasan sisa bayar saat ambil barang'
      }).catch(async () => {
        await api.patch(`/orders/${pelunasanOrder.id}`, {
          payment_status: 'paid',
          paid_amount: parseFloat(pelunasanOrder.total_amount || 0),
          remaining_amount: 0,
          payment_method: pelunasanMethod
        }).catch(async () => {
          await api.put(`/orders/${pelunasanOrder.id}`, {
            ...pelunasanOrder,
            payment_status: 'paid',
            paid_amount: parseFloat(pelunasanOrder.total_amount || 0),
            remaining_amount: 0,
            payment_method: pelunasanMethod
          });
        });
      });

      showSuccess('Pelunasan Berhasil!', `Nota ${pelunasanOrder.invoice_number} telah dinyatakan LUNAS.`);
      setShowPelunasanModal(false);
      fetchOrders();
      if (selectedOrder && selectedOrder.id === pelunasanOrder.id) {
        handleOpenDetail(pelunasanOrder);
      }
    } catch (err) {
      showError('Gagal Pelunasan!', err.response?.data?.detail || 'Gagal memproses pelunasan sisa nota.');
    }
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/orders/');
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (order) => {
    setSelectedOrder(order);
    try {
      const res = await api.get(`/orders/${order.id}`);
      if (res.data) {
        setSelectedOrder(res.data);
      }
    } catch (err) {
      console.error('Error fetching order details:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const handleStatusChange = async (orderId, newStatus) => {
    const targetOrder = selectedOrder?.id === orderId ? selectedOrder : orders.find(o => o.id === orderId);
    if (targetOrder) {
      if (targetOrder.order_status === 'completed' && !isSuperAdmin && user?.role !== 'super_admin') {
        showError('Pesanan yang sudah berstatus COMPLETED (Selesai) tidak dapat diubah statusnya lagi, kecuali oleh Super Admin.');
        return;
      }
    }

    try {
      const updateData = { order_status: newStatus, status: newStatus };

      // Resilient fallback chain for HTTP method & route differences (PATCH / PUT / POST)
      try {
        await api.patch(`/orders/${orderId}/status`, updateData);
      } catch (err1) {
        if (err1.response?.status === 405 || err1.response?.status === 404) {
          try {
            await api.put(`/orders/${orderId}/status`, updateData);
          } catch (err2) {
            if (err2.response?.status === 405 || err2.response?.status === 404) {
              try {
                await api.patch(`/orders/${orderId}`, updateData);
              } catch (err3) {
                if (err3.response?.status === 405 || err3.response?.status === 404) {
                  try {
                    await api.put(`/orders/${orderId}`, { ...targetOrder, ...updateData });
                  } catch (err4) {
                    await api.post(`/orders/${orderId}/status`, updateData);
                  }
                } else {
                  throw err3;
                }
              }
            } else {
              throw err2;
            }
          }
        } else {
          throw err1;
        }
      }

      fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, order_status: newStatus, status: newStatus }));
      }
      showSuccess('Berhasil!', `Status pesanan diubah menjadi ${newStatus.toUpperCase()}`);
    } catch (err) {
      console.error('Error updating order status:', err);
      alert(err.response?.data?.detail || err.response?.data?.message || 'Gagal mengubah status pesanan.');
    }
  };

  const filteredOrders = orders.filter(o => {
    if (!o) return false;
    const q = searchQuery.toLowerCase();
    const invoiceNum = o.invoice_number ? String(o.invoice_number).toLowerCase() : '';
    const customerName = o.customer_name ? String(o.customer_name).toLowerCase() : '';

    const matchesSearch = invoiceNum.includes(q) || customerName.includes(q);
    const matchesStatus = statusFilter ? o.order_status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  const { items: sortedOrders, requestSort, sortConfig } = useSortableData(filteredOrders);

  const fetchThermalReceipt = async (orderId) => {
    try {
      const res = await api.get(`/orders/${orderId}/pos-receipt?width=32`);
      setPosReceiptText(res.data.receipt_text);
      setShowReceiptModal(true);
    } catch (err) {
      alert('Gagal mengambil data struk POS thermal.');
    }
  };

  const handleClaimOrder = async (orderId) => {
    const targetOrder = orders.find(o => o.id === orderId) || selectedOrder;
    const invNum = targetOrder?.invoice_number || orderId;
    try {
      setClaimingId(orderId);
      await api.post(`/orders/${orderId}/assign-me`);
      showSuccess('Order Dihandle!', `Nota ${invNum} berhasil dihandle.`);
      fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        const updated = await api.get(`/orders/${orderId}`);
        setSelectedOrder(updated.data);
      }
    } catch (err) {
      showError('Gagal Handle Order!', err.response?.data?.detail || 'Gagal menghandle order ini.');
    } finally {
      setClaimingId(null);
    }
  };

  const handleUnhandleOrder = async (orderId) => {
    const targetOrder = orders.find(o => o.id === orderId) || selectedOrder;
    const invNum = targetOrder?.invoice_number || orderId;
    const confirm = await showConfirm({
      title: 'Batalkan Penanganan Order?',
      text: `Apakah Anda yakin ingin membatalkan penanganan (Unhandle) nota ${invNum}? Status akan dikembalikan ke PENDING.`,
      confirmText: 'Ya, Unhandle',
      cancelText: 'Batal',
      icon: 'warning'
    });
    if (!confirm) return;

    try {
      setClaimingId(orderId);
      await api.post(`/orders/${orderId}/unassign-me`);
      showSuccess('Order Unhandled!', `Nota ${invNum} berhasil dibatalkan penanganannya (kembali PENDING).`);
      fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        const updated = await api.get(`/orders/${orderId}`);
        setSelectedOrder(updated.data);
      }
    } catch (err) {
      showError('Gagal Unhandle Order!', err.response?.data?.detail || 'Gagal membatalkan penanganan order.');
    } finally {
      setClaimingId(null);
    }
  };

  const fetchOrdertag = async (orderId) => {
    try {
      const res = await api.get(`/orders/${orderId}/ordertag?width=32`);
      setPosReceiptText(res.data.ordertag_text);
      setPosQrBase64('');
      setTagModalTitle('Ordertag Produksi Bengkel');
      setShowReceiptModal(true);
    } catch (err) {
      alert('Gagal mengambil data ordertag bengkel.');
    }
  };

  const fetchPickuptag = async (orderId) => {
    try {
      const res = await api.get(`/orders/${orderId}/pickuptag?width=32`);
      setPosReceiptText(res.data.pickuptag_text);
      setPosQrBase64('');
      setTagModalTitle('Tag Rak Penyimpanan (Siap Ambil)');
      setShowReceiptModal(true);
    } catch (err) {
      alert('Gagal mengambil data tag rak penyimpanan.');
    }
  };

  const handleStatusChangeAttempt = (order, newStatus) => {
    if (order?.order_status === 'completed' && !isSuperAdmin && user?.role !== 'super_admin') {
      showError('Pesanan yang sudah berstatus COMPLETED (Selesai) tidak dapat diubah statusnya lagi, kecuali oleh Super Admin.');
      return;
    }
    if (newStatus === 'ready_for_pickup') {
      const phone = order?.customer_phone || order?.phone || order?.whatsapp || order?.wa_number || order?.customer?.phone || order?.customer?.whatsapp;
      const hasPhone = phone && String(phone).trim() && String(phone).trim() !== '-' && String(phone).trim().toLowerCase() !== 'null' && String(phone).trim().toLowerCase() !== 'undefined';

      if (hasPhone) {
        setWaConfirmOrder(order);
      } else {
        handleStatusChange(order.id, newStatus);
      }
    } else {
      handleStatusChange(order.id, newStatus);
    }
  };

  const confirmReadyForPickupWithWA = async () => {
    if (!waConfirmOrder) return;
    const orderId = waConfirmOrder.id;
    try {
      await handleStatusChange(orderId, 'ready_for_pickup');
      await api.post(`/orders/${orderId}/notify-whatsapp`).catch(() => { });
      setWaConfirmOrder(null);
    } catch (err) {
      console.error(err);
    }
  };

  const paginatedOrders = sortedOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Order / Nota</h1>
          <p className="text-sm text-slate-400">Manajemen status pengerjaan cetak, pembayaran, & unduh berkas customer</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-900 border border-slate-800 rounded-md p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${viewMode === 'table' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              Tabel
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${viewMode === 'kanban' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              Kanban Board
            </button>
          </div>

          <button
            onClick={fetchOrders}
            className="p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-md transition-colors flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari no. invoice / nama customer..."
            className="w-full bg-slate-900 border border-slate-800 rounded-md py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-md px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
        >
          <option value="">Semua Status Order</option>
          <option value="pending">PENDING (Menunggu)</option>
          <option value="processing">PROCESSING (Diproses)</option>
          <option value="ready_for_pickup">READY FOR PICKUP (Siap Ambil)</option>
          <option value="completed">COMPLETED (Selesai)</option>
          <option value="cancelled">CANCELLED (Dibatalkan)</option>
        </select>
      </div>

      {/* View Rendering: Kanban Board vs Table */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { id: 'pending', label: 'PENDING', color: 'border-rose-500/30 bg-rose-500/10 text-rose-400' },
            { id: 'processing', label: 'PROCESSING', color: 'border-blue-500/30 bg-blue-500/10 text-blue-400' },
            { id: 'ready_for_pickup', label: 'READY FOR PICKUP', color: 'border-emerald-500/80 bg-transparent text-emerald-400' },
            { id: 'completed', label: 'COMPLETED', color: 'border-emerald-500 bg-emerald-500 text-slate-950 font-bold' },
            { id: 'cancelled', label: 'CANCELLED', color: 'border-slate-700 bg-slate-800 text-slate-400' },
          ].map(col => {
            const columnOrders = filteredOrders.filter(o => (o.order_status || 'pending') === col.id);
            return (
              <div key={col.id} className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col min-h-[450px]">
                <div className={`flex items-center justify-between p-2 rounded-md border mb-3 ${col.color}`}>
                  <span className="font-bold text-xs uppercase tracking-wider">{col.label}</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-950/80 rounded-full">{columnOrders.length}</span>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto max-h-[650px] pr-1">
                  {columnOrders.length === 0 ? (
                    <div className="text-center py-8 text-slate-600 text-xs italic">Kosong</div>
                  ) : (
                    columnOrders.map(o => (
                      <div key={o.id} className="bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-lg p-3 space-y-2 transition-all shadow-md">
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                          <span className="font-bold text-emerald-400 font-mono text-xs">{o.invoice_number}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${o.payment_status === 'paid' ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                            {o.payment_status}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="font-bold text-slate-200 text-xs line-clamp-1">{formatCustomerName(o.customer_name)}</div>
                          <div className="text-xs text-slate-100 font-semibold font-mono">Rp {parseFloat(o.total_amount || 0).toLocaleString('id-ID')}</div>
                        </div>

                        <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 space-y-1">
                          <div>Pembuat: <span className="text-slate-300 font-medium">{getOrderCreatorName(o)}</span></div>
                          <div>
                            Operator: <span className={isOrderUnassigned(o) ? 'text-amber-400/80 italic font-semibold' : 'text-purple-300 font-medium'}>{getOrderOperatorName(o)}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-1">
                          <button
                            onClick={() => handleOpenDetail(o)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Detail</span>
                          </button>

                          {((col.id !== 'completed' && col.id !== 'cancelled') || isSuperAdmin || user?.role === 'super_admin') && (
                            <select
                              value={o.order_status}
                              onChange={(e) => handleStatusChangeAttempt(o, e.target.value)}
                              className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded px-1.5 py-1 focus:outline-none focus:border-emerald-500"
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="ready_for_pickup">Ready Pickup</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancel</option>
                            </select>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Order Table View */
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
                <tr>
                  <SortableHeader title="No. Invoice" sortKey="invoice_number" sortConfig={sortConfig} onRequestSort={requestSort} />
                  <SortableHeader title="Total Amount" sortKey="total_amount" sortConfig={sortConfig} onRequestSort={requestSort} />
                  <SortableHeader title="Customer" sortKey="customer_name" sortConfig={sortConfig} onRequestSort={requestSort} />
                  <SortableHeader title="Dibuat Oleh" sortKey="created_by" sortConfig={sortConfig} onRequestSort={requestSort} />
                  <SortableHeader title="Dikerjakan Oleh" sortKey="operator" sortConfig={sortConfig} onRequestSort={requestSort} />
                  <SortableHeader title="Status Order" sortKey="order_status" sortConfig={sortConfig} onRequestSort={requestSort} />
                  <SortableHeader title="Status Bayar" sortKey="payment_status" sortConfig={sortConfig} onRequestSort={requestSort} />
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-slate-500">
                      Tidak ada data pesanan ditemukan.
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map(o => (
                    <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-bold text-emerald-400 font-mono">{o.invoice_number}</td>
                      <td className="px-6 py-4 font-semibold text-slate-100 font-mono">
                        Rp {parseFloat(o.total_amount || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-200">{formatCustomerName(o.customer_name)}</div>
                        <div className="text-xs text-slate-500">{o.customer_phone || '-'}</div>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-300">
                        <div>{getOrderCreatorName(o)}</div>
                        <span className="text-[10px] text-slate-500 uppercase font-mono">{o.order_source || 'pos'}</span>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <span className={`font-semibold ${isOrderUnassigned(o) ? 'text-amber-400/80 italic' : 'text-purple-300'}`}>
                          {getOrderOperatorName(o)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs uppercase tracking-wider ${getOrderStatusBadgeClass(o.order_status)}`}>
                          {o.order_status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${o.payment_status === 'paid' ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'
                          }`}>
                          {o.payment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenDetail(o)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" />
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
            totalItems={filteredOrders.length}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      {/* DETAIL ORDER MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-lg p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-lg text-slate-100">Detail Nota {selectedOrder.invoice_number}</h3>
                <p className="text-xs text-slate-400">Customer: {formatCustomerName(selectedOrder.customer_name)}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Assigned Staff & Claim Order Banner */}
            <div className="bg-slate-950 p-3.5 rounded-md border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Dibuat Oleh (Kasir / Pembuat Nota):</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {getOrderCreatorName(selectedOrder)}
                </span>
                <span className="text-[10px] text-slate-500 block uppercase font-mono mt-0.5">Sumber: {selectedOrder.order_source || 'pos'}</span>
              </div>
              <div className="flex flex-col justify-between">
                <div>
                  <span className="text-slate-400 block font-medium">Dikerjakan Oleh (Operator Staf):</span>
                  <span className={`font-bold text-sm ${isOrderUnassigned(selectedOrder) ? 'text-amber-400 italic' : 'text-purple-300'}`}>
                    {getOrderOperatorName(selectedOrder)}
                  </span>
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  {canOrderBeHandled(selectedOrder) && (
                    <button
                      onClick={() => handleClaimOrder(selectedOrder.id)}
                      disabled={claimingId === selectedOrder.id}
                      className="py-1 px-3 bg-emerald-500/15 hover:bg-emerald-500 border border-emerald-500/30 text-emerald-400 hover:text-slate-950 font-bold rounded-lg text-xs transition-all flex items-center gap-1 shadow-md cursor-pointer disabled:opacity-50"
                      title="Handle order ini dan daftarkan sebagai penanggung jawab"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>{claimingId === selectedOrder.id ? 'Memproses...' : 'Handle Order'}</span>
                    </button>
                  )}
                  {canOrderBeUnhandled(selectedOrder) && (
                    <button
                      onClick={() => handleUnhandleOrder(selectedOrder.id)}
                      disabled={claimingId === selectedOrder.id}
                      className="py-1 px-3 bg-rose-500/15 hover:bg-rose-500 border border-rose-500/30 text-rose-400 hover:text-slate-950 font-bold rounded-lg text-xs transition-all flex items-center gap-1 shadow-md cursor-pointer disabled:opacity-50"
                      title="Batalkan penanganan order ini (status kembali ke PENDING)"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>{claimingId === selectedOrder.id ? 'Memproses...' : 'Unhandle Order'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Status Switch Buttons */}
            {selectedOrder.order_status === 'completed' && !isSuperAdmin && user?.role !== 'super_admin' ? (
              <div className="bg-slate-950 p-3 rounded-md border border-slate-800 flex items-center justify-between text-xs text-emerald-400 font-semibold">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>Status pesanan ini sudah <strong>COMPLETED (SELESAI)</strong> dan terkunci. (Hanya Super Admin yang dapat me-rollback status).</span>
                </div>
                <span className="text-[10px] text-slate-500 uppercase font-mono px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">Terkunci</span>
              </div>
            ) : (
              <div className="bg-slate-950 p-3 rounded-md border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ubah Status Pengerjaan Order</span>
                  {selectedOrder.order_status === 'completed' && (isSuperAdmin || user?.role === 'super_admin') && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                      ⚡ Rollback Mode (Super Admin)
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {['pending', 'processing', 'ready_for_pickup', 'completed', 'cancelled'].map(st => (
                    <button
                      key={st}
                      onClick={() => handleStatusChangeAttempt(selectedOrder, st)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold uppercase transition-all ${selectedOrder.order_status === st
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                        }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Rincian Item Barang / Jasa pada Nota */}
            {(() => {
              const orderItemsList = selectedOrder.items || selectedOrder.order_items || selectedOrder.details || selectedOrder.items_list || selectedOrder.order_details || [];
              const totalAmt = parseFloat(selectedOrder.total_amount || selectedOrder.total_price || selectedOrder.total || 0);
              return (
                <div className="bg-slate-950 p-4 rounded-md border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Rincian Item Pesanan Nota ({orderItemsList.length} Item)
                    </span>
                    <span className="text-xs font-bold text-emerald-400">
                      Total: Rp {totalAmt.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {orderItemsList.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">Tidak ada item rincian pada nota ini.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-900 text-slate-400 font-semibold uppercase text-[10px]">
                          <tr>
                            <th className="px-3 py-2">Nama Barang / Jasa</th>
                            <th className="px-3 py-2 text-center">Qty</th>
                            <th className="px-3 py-2 text-right">Harga Satuan</th>
                            <th className="px-3 py-2 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono">
                          {orderItemsList.map((item, idx) => {
                            const itemName = item.item_name || item.name || item.title || (item.item && item.item.name) || `Item #${item.id || (idx + 1)}`;
                            const unitPrice = parseFloat(item.unit_price || item.price || 0);
                            const qty = parseFloat(item.quantity || item.qty || 1);
                            const subtotal = parseFloat(item.subtotal || item.total_price || (unitPrice * qty));
                            const itemNote = item.notes || item.item_notes || item.description;
                            return (
                              <tr key={idx} className="hover:bg-slate-900/50">
                                <td className="px-3 py-2.5 font-sans font-semibold text-slate-100">
                                  <div>{itemName}</div>
                                  {itemNote && (
                                    <div className="text-[11px] text-slate-500 font-normal italic">
                                      Catatan: {itemNote}
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-center text-purple-300 font-bold">
                                  {qty}
                                </td>
                                <td className="px-3 py-2.5 text-right text-slate-300">
                                  Rp {unitPrice.toLocaleString('id-ID')}
                                </td>
                                <td className="px-3 py-2.5 text-right font-bold text-emerald-400">
                                  Rp {subtotal.toLocaleString('id-ID')}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Rincian Status Pembayaran & Tombol Pelunasan DP */}
            {(() => {
              const totalAmount = parseFloat(selectedOrder.total_amount || selectedOrder.total_price || selectedOrder.total || 0);
              const paidAmount = parseFloat(selectedOrder.paid_amount || selectedOrder.dp_amount || selectedOrder.amount_paid || (selectedOrder.payment_status === 'paid' ? totalAmount : 0));
              const remainingAmount = selectedOrder.payment_status === 'paid'
                ? 0
                : (selectedOrder.remaining_amount !== undefined && selectedOrder.remaining_amount !== null
                  ? parseFloat(selectedOrder.remaining_amount)
                  : Math.max(0, totalAmount - paidAmount));
              const isUnpaidOrDP = selectedOrder.payment_status !== 'paid' && remainingAmount > 0;

              return (
                <div className="bg-slate-950 p-4 rounded-md border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Detail Status Pembayaran
                    </span>
                    <span className={`px-2.5 py-1 rounded text-xs font-extrabold uppercase ${selectedOrder.payment_status === 'paid'
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                      : 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                      }`}>
                      {selectedOrder.payment_status === 'paid' ? 'LUNAS (FULL)' : `BELUM LUNAS / DP (Sisa Rp ${remainingAmount.toLocaleString('id-ID')})`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Metode Bayar:</span>
                      <span className="font-bold text-slate-200 uppercase">{selectedOrder.payment_method || 'CASH'}</span>
                    </div>

                    <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Total Nota:</span>
                      <span className="font-bold text-slate-200 font-mono">Rp {totalAmount.toLocaleString('id-ID')}</span>
                    </div>

                    <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Sudah Dibayar (DP):</span>
                      <span className="font-bold text-emerald-400 font-mono">Rp {paidAmount.toLocaleString('id-ID')}</span>
                    </div>

                    <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Sisa Belum Lunas:</span>
                      <span className={`font-bold font-mono ${remainingAmount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        Rp {remainingAmount.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* Tombol Pelunasan Sisa Pembayaran jika belum lunas */}
                  {isUnpaidOrDP && canEditOrDelete(selectedOrder, user, isSuperAdmin) && (
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-[11px] text-amber-400 font-medium">
                        ⚠️ Pesanan ini memiliki sisa tagihan sebesar <span className="font-bold font-mono text-xs text-red-400">Rp {remainingAmount.toLocaleString('id-ID')}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openPelunasanModal(selectedOrder, remainingAmount)}
                        className="py-2 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 ml-auto"
                      >
                        <Wallet className="h-4 w-4" />
                        <span>PROSES PELUNASAN SISA</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Print Files List */}
            {(() => {
              const orderItemsList = selectedOrder.items || selectedOrder.order_items || selectedOrder.details || selectedOrder.items_list || selectedOrder.order_details || [];
              const itemsWithFiles = orderItemsList.filter(i => i.file_urls && i.file_urls.length > 0);
              return (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Berkas Dokumen Cetakan Customer</h4>
                  {itemsWithFiles.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">Tidak ada berkas file diunggah pada nota ini.</p>
                  ) : (
                    itemsWithFiles.map(i => (
                      i.file_urls?.map((url, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-slate-950 p-3 rounded-md border border-slate-800 text-xs">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-emerald-400" />
                            <span className="text-slate-200 font-semibold">{i.item_name || i.name} (File #{idx + 1})</span>
                          </div>
                          <a
                            href={`${API_BASE_URL}/orders/${selectedOrder.id}/items/${i.id}/download-file?file_index=${idx}&token=${localStorage.getItem("token")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 font-bold rounded-lg transition-all inline-flex items-center gap-1"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Unduh Berkas</span>
                          </a>
                        </div>
                      ))
                    ))
                  )}
                </div>
              );
            })()}

            <div className="pt-3 border-t border-slate-800 flex flex-wrap gap-2">
              <button
                onClick={() => fetchThermalReceipt(selectedOrder.id)}
                className="py-2.5 px-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 font-bold rounded-md text-xs flex items-center justify-center gap-1 transition-colors"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Struk Thermal</span>
              </button>
              <button
                onClick={() => fetchOrdertag(selectedOrder.id)}
                className="py-2.5 px-3 bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500 hover:text-slate-950 font-bold rounded-md text-xs flex items-center justify-center gap-1 transition-colors"
                title="Cetak label ordertag untuk tumpukan bahan bengkel produksi"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Ordertag Bengkel</span>
              </button>
              {(selectedOrder.order_status === 'ready_for_pickup' || selectedOrder.order_status === 'completed') && (
                <button
                  onClick={() => fetchPickuptag(selectedOrder.id)}
                  className="py-2.5 px-3 bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500 hover:text-slate-950 font-bold rounded-md text-xs flex items-center justify-center gap-1 transition-colors"
                  title="Cetak label tag untuk rak penyimpanan kemasan barang yang siap diambil"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Tag Rak Siap Ambil</span>
                </button>
              )}
              <a
                href={`${API_BASE_URL}/orders/${selectedOrder.id}/pdf?token=${localStorage.getItem("token")}`}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-md text-xs flex items-center justify-center gap-1 transition-colors"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>PDF Invoice</span>
              </a>
              <button
                onClick={() => setSelectedOrder(null)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-md text-xs ml-auto"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POS RECEIPT SILENT PRINT PREVIEW MODAL */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-bold text-sm">{tagModalTitle}</span>
              </div>
              <button onClick={() => setShowReceiptModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            {printStatusMsg && (
              <p className="text-xs font-mono text-emerald-400">{printStatusMsg}</p>
            )}

            <div className="bg-white text-black p-4 rounded-md font-mono text-[11px] leading-tight overflow-x-auto whitespace-pre border shadow-inner max-h-80">
              {posReceiptText}
              {posQrBase64 && (
                <div className="mt-3 pt-3 border-t border-dashed border-gray-300 text-center">
                  <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">? Scan QR Review Staf</p>
                  <img src={posQrBase64} alt="QR Code Review" className="w-28 h-28 mx-auto border p-1 rounded bg-white shadow-sm" />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  setPrintStatusMsg('⚡ Mengirim perintah cetak dari Backend Server ke Printer LAN (192.168.0.110)...');
                  try {
                    const result = await sendServerPrint({ orderId: selectedOrder?.id, width: 48 });
                    setPrintStatusMsg(result.message);
                  } catch (err) {
                    setPrintStatusMsg(`❌ Gagal via Server: ${err.message}`);
                  }
                }}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="h-4 w-4" />
                <span>CETAK VIA SERVER</span>
              </button>
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  setPrintStatusMsg('');
                }}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-md text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WHATSAPP CONFIRMATION MODAL FOR READY FOR PICKUP */}
      {waConfirmOrder && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-purple-400">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="font-bold text-base text-slate-100">Konfirmasi Kirim Notifikasi WhatsApp</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Ubah status pesanan <span className="font-bold text-emerald-400 font-mono">{waConfirmOrder.invoice_number}</span> menjadi <span className="font-bold text-purple-400">SIAP DIAMBIL (READY FOR PICKUP)</span>?
            </p>
            <div className="bg-slate-950 p-3 rounded-md border border-slate-800 text-xs space-y-1">
              <div className="text-slate-400">Customer: <span className="text-slate-200 font-semibold">{waConfirmOrder.customer_name}</span></div>
              <div className="text-slate-400">No. WhatsApp: <span className="text-emerald-400 font-mono font-bold">{waConfirmOrder.customer_phone || 'Tidak Ada Nomor'}</span></div>
            </div>
            <p className="text-[11px] text-slate-400 italic">
              Notifikasi pesan WhatsApp otomatis akan dikirimkan ke nomor pelanggan untuk mengabarkan bahwa pesanan siap diambil.
            </p>
            <div className="pt-2 border-t border-slate-800 flex gap-2">
              <button
                onClick={() => setWaConfirmOrder(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-md text-xs"
              >
                Batal
              </button>
              <button
                onClick={confirmReadyForPickupWithWA}
                className="flex-1 py-2.5 bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold rounded-md text-xs shadow-lg shadow-purple-500/20 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>YA, UBAH & KIRIM WA</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PELUNASAN MODAL */}
      {showPelunasanModal && pelunasanOrder && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold text-lg text-slate-100">Pelunasan Sisa Nota</h3>
              </div>
              <button onClick={() => setShowPelunasanModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Order Info */}
              <div className="bg-slate-950 p-3.5 rounded-md border border-slate-800 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-slate-400 font-sans">
                  <span>No. Invoice:</span>
                  <span className="font-bold text-emerald-400 font-mono">{pelunasanOrder.invoice_number}</span>
                </div>
                <div className="flex justify-between text-slate-400 font-sans">
                  <span>Customer:</span>
                  <span className="font-bold text-slate-200">{pelunasanOrder.customer_name}</span>
                </div>
                <div className="flex justify-between text-slate-400 font-sans pt-1 border-t border-slate-800/80">
                  <span>Total Tagihan Nota:</span>
                  <span className="font-bold text-slate-200">Rp {parseFloat(pelunasanOrder.total_amount || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-amber-400 font-sans">
                  <span>Nominal Pelunasan Sisa:</span>
                  <span className="font-extrabold text-amber-400 text-sm">Rp {parseFloat(pelunasanAmount || 0).toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Metode Pelunasan Pembayaran</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['cash', 'qris', 'debit_card', 'bank_transfer'].map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPelunasanMethod(method)}
                      className={`py-2 px-2 rounded-md text-xs font-bold uppercase transition-colors border text-center ${pelunasanMethod === method
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                    >
                      {method.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash Change Calculator */}
              {pelunasanMethod === 'cash' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Uang Tunai Diterima (Rp)</label>
                  <input
                    type="number"
                    value={pelunasanCashInput}
                    onChange={(e) => setPelunasanCashInput(e.target.value)}
                    placeholder={pelunasanAmount.toString()}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-base font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                  {parseFloat(pelunasanCashInput || 0) > parseFloat(pelunasanAmount || 0) && (
                    <div className="mt-1.5 text-xs flex justify-between text-slate-400 bg-slate-950 p-2 rounded border border-slate-800">
                      <span>Kembalian Uang Tunai:</span>
                      <span className="font-bold text-slate-100 font-mono">
                        Rp {(parseFloat(pelunasanCashInput || 0) - parseFloat(pelunasanAmount || 0)).toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowPelunasanModal(false)}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-md text-xs transition-colors"
              >
                BATAL
              </button>

              <button
                type="button"
                onClick={handlePelunasanSubmit}
                className="py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>LUNASKAN NOTA</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;



