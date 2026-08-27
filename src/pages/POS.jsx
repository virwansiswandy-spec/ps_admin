import Flatpickr from "react-flatpickr";
import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Layers, Barcode, ShoppingCart, Plus, Minus, Trash2, CreditCard,
  Printer, CheckCircle2, DollarSign, Wallet, FileText, AlertCircle, RefreshCw, X, ArrowRight, Download
} from 'lucide-react';
import api from '../services/api';
import { getItemEffectivePrice, getItemPriceDetail } from '../utils/priceUtils';
import { sendServerPrint, fetchReceiptPreview, fetchReceiptData } from '../services/printService';
import { useAuth } from '../context/AuthContext';
import { showConfirm } from '../utils/swal';

const POS = () => {
  const { user } = useAuth();
  const [previewCompositionItem, setPreviewCompositionItem] = useState(null);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentType, setPaymentType] = useState('full');
  const [dpAmount, setDpAmount] = useState('');
  const [estimatedCompletionAt, setEstimatedCompletionAt] = useState('');
  const applyDeadlinePreset = (presetType) => {
    const now = new Date();
    if (presetType === '2h') {
      now.setHours(now.getHours() + 2);
    } else if (presetType === '5h') {
      now.setHours(now.getHours() + 5);
    } else if (presetType === 'tomorrow_16') {
      now.setDate(now.getDate() + 1);
      now.setHours(16, 0, 0, 0);
    } else if (presetType === '3d') {
      now.setDate(now.getDate() + 3);
    }
    // Format to YYYY-MM-THH:mm for datetime-local input
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    setEstimatedCompletionAt(`${year}-${month}-${day}T${hours}:${minutes}`);
  };
  const [cashAmount, setCashAmount] = useState('');

  const [loading, setLoading] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [lastCompletedOrder, setLastCompletedOrder] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [posReceiptText, setPosReceiptText] = useState('');
  const [posQrBase64, setPosQrBase64] = useState('');
  const [printingStatus, setPrintingStatus] = useState('');

  // Server LAN Printer Settings State
  const [printerIp, setPrinterIp] = useState(import.meta.env.VITE_PRINTER_IP || '192.168.0.110');
  const [printerPort, setPrinterPort] = useState(parseInt(import.meta.env.VITE_PRINTER_PORT || '9100', 10));
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [testPrintLoading, setTestPrintLoading] = useState(false);
  const [testPrintMessage, setTestPrintMessage] = useState('');

  // Shift Settlement Modal State
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftInitialCash, setShiftInitialCash] = useState('500000');
  const [shiftOrders, setShiftOrders] = useState([]);
  const [loadingShift, setLoadingShift] = useState(false);

  // Load draft cart from localStorage on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem('pos_draft_cart');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (Array.isArray(parsed.cart) && parsed.cart.length > 0) {
          setCart(parsed.cart);
          if (parsed.customerName) setCustomerName(parsed.customerName);
          if (parsed.customerPhone) setCustomerPhone(parsed.customerPhone);
        }
      }
    } catch (e) {
      console.error('Failed to load draft cart from localStorage', e);
    }
  }, []);

  // Save draft cart to localStorage whenever cart changes
  useEffect(() => {
    try {
      if (cart.length > 0) {
        localStorage.setItem('pos_draft_cart', JSON.stringify({
          cart,
          customerName,
          customerPhone
        }));
      } else {
        localStorage.removeItem('pos_draft_cart');
      }
    } catch (e) {
      console.error('Failed to save draft cart', e);
    }
  }, [cart, customerName, customerPhone]);

  // Global Keyboard Shortcuts (F2, F4, Esc)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        if (barcodeInputRef.current) {
          barcodeInputRef.current.focus();
          barcodeInputRef.current.select();
        }
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) {
          setShowCheckoutModal(true);
        }
      } else if (e.key === 'Escape') {
        setShowCheckoutModal(false);
        setShowReceiptModal(false);
        setShowPrinterModal(false);
        setShowShiftModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart.length]);

  const [availableCustomerNames, setAvailableCustomerNames] = useState([]);

  const handlePhoneLookup = async (phoneInput) => {
    setCustomerPhone(phoneInput);
    if (!phoneInput || phoneInput.length < 6) {
      setAvailableCustomerNames([]);
      return;
    }
    try {
      const res = await api.get(`/orders/lookup-customer-by-phone?phone=${encodeURIComponent(phoneInput)}`);
      if (res.data && res.data.found) {
        if (res.data.customer_name) {
          setCustomerName(res.data.customer_name);
        }
        if (Array.isArray(res.data.available_names)) {
          setAvailableCustomerNames(res.data.available_names);
        }
      } else {
        setAvailableCustomerNames([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const barcodeInputRef = useRef(null);

  const fetchCatalogData = async () => {
    setLoading(true);
    try {
      const [itemsRes, catRes] = await Promise.all([
        api.get('/items/', { params: { is_active: true } }).catch(() => api.get('/items/?is_active=true')).catch(() => api.get('/items/')),
        api.get('/categories/')
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogData();
  }, []);

  const isItemActive = (item) => {
    if (!item) return false;
    if (item.is_active === false || item.is_active === 0 || item.is_active === 'false' || item.is_active === '0') return false;
    if (item.is_deleted === true || item.is_deleted === 1 || item.is_deleted === 'true' || item.is_deleted === '1') return false;
    if (item.deleted === true || item.deleted === 1 || item.deleted === 'true' || item.deleted === '1') return false;
    if (item.deleted_at !== null && item.deleted_at !== undefined && item.deleted_at !== '') return false;
    if (item.status === 'deleted' || item.status === 'inactive' || item.status === 'disabled' || item.status === 'archived') return false;
    return true;
  };

  // Filter items
  const filteredItems = items.filter(item => {
    if (!isItemActive(item)) return false;
    const matchesCategory = selectedCategory ? String(item.category_id) === String(selectedCategory) : true;
    const q = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' ||
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.barcode && item.barcode.includes(searchQuery)) ||
      (item.sku && item.sku.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  // Handle Barcode Search Direct Hit
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    const matchedItem = items.find(item => isItemActive(item) && (item.barcode === searchQuery || item.sku === searchQuery));
    if (matchedItem) {
      addToCart(matchedItem);
      setSearchQuery('');
    }
  };

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        const currentQty = parseFloat(existing.quantity) || 0;
        return prev.map(i => i.item.id === item.id ? { ...i, quantity: currentQty + 1 } : i);
      }
      return [...prev, { item, quantity: 1, notes: '' }];
    });
  };

  const updateQuantity = (itemId, delta) => {
    setCart(prev => prev.map(i => {
      if (i.item.id === itemId) {
        const currentQty = parseFloat(i.quantity) || 0;
        const newQty = Math.max(1, currentQty + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const setDirectQuantity = (itemId, rawValue) => {
    if (rawValue === '') {
      setCart(prev => prev.map(i => i.item.id === itemId ? { ...i, quantity: '' } : i));
      return;
    }
    const val = parseFloat(rawValue);
    if (!isNaN(val)) {
      setCart(prev => prev.map(i => i.item.id === itemId ? { ...i, quantity: rawValue } : i));
    }
  };

  const handleQuantityBlur = (itemId, rawValue) => {
    const val = parseFloat(rawValue);
    if (isNaN(val) || val <= 0) {
      setCart(prev => prev.map(i => i.item.id === itemId ? { ...i, quantity: 1 } : i));
    } else {
      setCart(prev => prev.map(i => i.item.id === itemId ? { ...i, quantity: val } : i));
    }
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(i => i.item.id !== itemId));
  };

  // Subtotal Calculation
  const subtotal = cart.reduce((acc, curr) => {
    const qty = parseFloat(curr.quantity) || 0;
    const priceDetail = getItemPriceDetail(curr.item, qty);
    return acc + (priceDetail.unitPrice * qty);
  }, 0);
  const totalAmount = Math.max(0, subtotal - parseFloat(discountAmount || 0) + parseFloat(taxAmount || 0));
  const changeAmount = Math.max(0, parseFloat(cashAmount || 0) - totalAmount);

  // Submit Self POS Order
  const handleCheckoutSubmit = async (targetStatus = 'processing') => {
    if (cart.length === 0) return;
    setLoading(true);

    const isDp = paymentType === 'dp';
    const payAmount = isDp ? parseFloat(dpAmount || 0) : (paymentMethod === 'cash' ? parseFloat(cashAmount || totalAmount) : totalAmount);
    const adminIdentityName = user?.full_name || user?.username || user?.email || 'Admin Kasir';

    const orderPayload = {
      order_source: 'walk_in',
      order_status: targetStatus,
      ...(user?.id ? { created_by_id: user.id, user_id: user.id, kasir_id: user.id, cashier_id: user.id } : {}),
      created_by: adminIdentityName,
      created_by_name: adminIdentityName,
      kasir_name: adminIdentityName,
      cashier_name: adminIdentityName,
      ...(targetStatus === 'completed' || paymentType === 'full' ? {
        assigned_admins: user ? [{ id: user.id, full_name: adminIdentityName, email: user.email }] : [],
        assigned_to_name: adminIdentityName,
        operator_name: adminIdentityName,
        processed_by_name: adminIdentityName,
        assigned_admin_ids: user?.id ? [user.id] : []
      } : {}),
      customer_name: customerName || 'Walk-in Customer',
      customer_phone: customerPhone || null,
      discount_amount: parseFloat(discountAmount || 0),
      tax_amount: parseFloat(taxAmount || 0),
      notes: 'Transaksi Kasir POS Walk-in',
      estimated_completion_at: estimatedCompletionAt ? new Date(estimatedCompletionAt).toISOString() : null,
      items: cart.map(c => {
        const qty = parseFloat(c.quantity) || 1;
        const unitPrice = getItemEffectivePrice(c.item, qty);
        return {
          item_id: c.item.id,
          quantity: qty,
          unit_price: unitPrice,
          notes: c.notes || null
        };
      }),
      initial_payment: {
        payment_method: paymentMethod,
        amount: payAmount,
        payment_type: isDp ? 'dp' : (payAmount >= totalAmount ? 'full' : 'dp'),
        notes: isDp ? `Uang Muka (DP) POS (${paymentMethod.toUpperCase()})` : `Pelunasan POS (${paymentMethod.toUpperCase()})`
      }
    };

    try {
      const res = await api.post('/orders/', orderPayload);
      const createdOrder = res.data;
      setLastCompletedOrder(createdOrder);
      setShowCheckoutModal(false);

      if (targetStatus === 'processing') {
        const shouldPrint = await showConfirm({
          title: 'Cetak Tanda Terima Order?',
          text: `Pesanan nota ${createdOrder.invoice_number} berhasil dicatat. Apakah Anda ingin mencetak Tanda Terima / Struk Nota sekarang?`,
          icon: 'info',
          confirmText: 'Cetak Tanda Terima',
          cancelText: 'Tidak Perlu Print'
        });
        if (shouldPrint) {
          await fetchAndTriggerSilentPrint(createdOrder.id);
        }

        // Check if WhatsApp / HP Number is provided on TERIMA ORDER -> Ask cashier for confirmation to send WA notification
        if (customerPhone && customerPhone.trim()) {
          const shouldSendWa = await showConfirm({
            title: 'Kirim Notifikasi WhatsApp?',
            text: `Nomor WA/HP customer (${customerPhone}) terisi. Apakah Anda ingin mengirimkan pesan notifikasi nota ke WhatsApp customer?`,
            icon: 'info',
            confirmText: 'Kirim Pesan WA',
            cancelText: 'Tidak Perlu Kirim'
          });
          if (shouldSendWa) {
            try {
              await api.post(`/orders/${createdOrder.id}/send-creation-wa`);
            } catch (waErr) {
              console.error('Failed sending WA notification:', waErr);
            }
          }
        }
      } else {
        // Auto Fetch POS Receipt Text for completed orders
        await fetchAndTriggerSilentPrint(createdOrder.id);
      }

      // Clear Cart & LocalStorage Draft
      setCart([]);
      setCashAmount('');
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      localStorage.removeItem('pos_draft_cart');
    } catch (err) {
      alert(err.response?.data?.detail || 'Gagal memproses transaksi kasir.');
    } finally {
      setLoading(false);
    }
  };

  const fetchShiftSummary = async () => {
    setLoadingShift(true);
    try {
      const res = await api.get('/orders/', { params: { limit: 100 } });
      const allOrders = res.data || [];
      const todayStr = new Date().toISOString().split('T')[0];
      const todaysOrders = allOrders.filter(o => {
        if (!o || !o.created_at) return false;
        return String(o.created_at).startsWith(todayStr);
      });
      setShiftOrders(todaysOrders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingShift(false);
    }
  };

  // Direct Server Thermal Printing (Backend FastAPI -> TCP Socket LAN 192.168.0.110:9100)
  const fetchAndTriggerSilentPrint = async (orderId) => {
    try {
      setPrintingStatus('⚡ Mengirim perintah cetak dari Server Backend ke Printer LAN (192.168.0.110)...');
      setShowReceiptModal(true);

      const receiptData = await fetchReceiptData(orderId, 48);
      setPosReceiptText(receiptData.receipt_text || '');
      setPosQrBase64(receiptData.rating_qr_base64 || '');

      const result = await sendServerPrint({ orderId, printerIp, printerPort, width: 48 });
      setPrintingStatus(result.message || '✅ Struk Kasir Berhasil Dicetak!');
    } catch (err) {
      console.error(err);
      setPrintingStatus(`❌ Gagal mencetak via Server: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-6 overflow-y-auto lg:overflow-hidden min-h-0">
      {/* LEFT COLUMN: Catalog & Item Grid */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-900 border border-slate-800 rounded-lg p-3 sm:p-5">
        {/* Search Bar & Barcode Scanner */}
        <form onSubmit={handleBarcodeSubmit} className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-500" />
            <input
              ref={barcodeInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama barang ATK / scan Barcode (Tekan Enter)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-md py-3 pl-11 pr-4 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              fetchShiftSummary();
              setShowShiftModal(true);
            }}
            title="Rekap dan penutupan shift kasir"
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition-colors flex items-center gap-2 text-xs font-semibold"
          >
            <Wallet className="h-5 w-5 text-amber-400" />
            <span className="hidden sm:inline font-sans text-xs">Rekap Shift</span>
          </button>
          <button
            type="button"
            onClick={() => setShowPrinterModal(true)}
            title="Pengaturan Server Printer POS LAN"
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition-colors flex items-center gap-2 text-xs font-semibold"
          >
            <Printer className="h-5 w-5 text-emerald-400" />
            <span className="hidden sm:inline font-mono text-[11px]">{printerIp}</span>
          </button>
          <button
            type="button"
            onClick={fetchCatalogData}
            title="Refresh Katalog"
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition-colors"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </form>

        {/* Keyboard Shortcut Hints Bar */}
        <div className="flex items-center gap-2 mb-3 text-[11px] text-slate-400 font-mono bg-slate-950/60 p-2 rounded-md border border-slate-800/80">
          <span className="bg-slate-800 px-2 py-0.5 rounded text-emerald-400 font-bold border border-slate-700">F2</span>
          <span>Cari / Scan</span>
          <span className="text-slate-600">•</span>
          <span className="bg-slate-800 px-2 py-0.5 rounded text-emerald-400 font-bold border border-slate-700">F4</span>
          <span>Lanjut Bayar</span>
          <span className="text-slate-600">•</span>
          <span className="bg-slate-800 px-2 py-0.5 rounded text-amber-400 font-bold border border-slate-700">Esc</span>
          <span>Tutup Modal</span>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-3 border-b border-slate-800">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${selectedCategory === null
              ? 'bg-emerald-500 text-slate-950'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
          >
            Semua Produk & Jasa
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${selectedCategory === cat.id
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pr-1">
          {filteredItems.map(item => (
            <div
              key={item.id}
              onClick={() => addToCart(item)}
              className="bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-md p-3.5 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] group"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                  <div className="flex items-center gap-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.item_type === 'service' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                      {item.item_type === 'service' ? 'JASA CETAK' : 'ATK RETAIL'}
                    </span>
                    {(item.is_composite || (item.compositions && item.compositions.length > 0)) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewCompositionItem(item);
                        }}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/40 flex items-center gap-1 transition-all shadow-sm"
                        title="Klik untuk rincian komposisi bahan baku"
                      >
                        <Layers className="h-3 w-3" />
                        <span>KOMPOSIT</span>
                      </button>
                    )}
                  </div>
                  {item.track_stock && (
                    <span className={`text-[10px] font-mono ${parseFloat(item.stock) <= parseFloat(item.min_stock) ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                      Stok: {parseFloat(item.stock)}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-slate-200 text-sm group-hover:text-emerald-400 transition-colors line-clamp-2">{item.name}</h3>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-900 flex items-center justify-between">
                <div>
                  <span className="font-bold text-emerald-400 text-sm">
                    Rp {getItemPriceDetail(item, 1).unitPrice.toLocaleString('id-ID')}
                  </span>
                  {item.price_tiers && item.price_tiers.length > 0 && (
                    <span className="text-[9px] text-slate-400 block font-mono">Ada Grosir</span>
                  )}
                </div>
                <div className="w-7 h-7 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                  <Plus className="h-4 w-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN: Cart & Checkout Panel */}
      <div className="w-full lg:w-96 flex flex-col bg-slate-900 border border-slate-800 rounded-lg p-3 sm:p-5 flex-shrink-0">
        {/* Customer Info Card - Placed at Topmost */}
        <div className="pb-3 border-b border-slate-800 space-y-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">No. WhatsApp / HP Customer</label>
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => handlePhoneLookup(e.target.value)}
              placeholder="Contoh: 08123456789"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Nama Customer</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Walk-in Customer / Nama Pelanggan"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            
            {availableCustomerNames.length > 1 && (
              <div className="mt-2 bg-slate-900 border border-slate-800 rounded-lg p-2 space-y-1">
                <span className="text-[10px] font-bold text-amber-400 block">
                  📋 Ditemukan {availableCustomerNames.length} nama historis untuk nomor ini:
                </span>
                <div className="flex flex-wrap gap-1">
                  {availableCustomerNames.map((nameOption, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCustomerName(nameOption)}
                      className={`text-[10px] px-2 py-1 rounded-md font-medium border transition-colors ${
                        customerName === nameOption
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold ring-1 ring-emerald-500/30'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-emerald-400'
                      }`}
                    >
                      {nameOption}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <span className="text-[10px] text-slate-400 italic mt-1 block">
              * Jika nomor WA/HP dan nama customer ada, harap diisi
            </span>
          </div>
        </div>

        {/* Keranjang Header */}
        <div className="flex items-center justify-between py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-emerald-400" />
            <h2 className="font-bold text-slate-100">Keranjang</h2>
          </div>
          <button
            onClick={() => setCart([])}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            Bersihkan
          </button>
        </div>

        {/* Cart List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center">
              <ShoppingCart className="h-12 w-12 stroke-1 mb-2 text-slate-600" />
              <p className="text-sm">Keranjang masih kosong</p>
              <p className="text-xs text-slate-600">Klik item di katalog untuk menambahkan</p>
            </div>
          ) : (
            cart.map(c => {
              const qty = parseFloat(c.quantity) || 0;
              const priceDetail = getItemPriceDetail(c.item, qty);
              const itemTotal = priceDetail.unitPrice * qty;
              const isComposite = c.item.is_composite || (c.item.compositions && c.item.compositions.length > 0);

              return (
                <div key={c.item.id} className="bg-slate-950 border border-slate-800 rounded-md p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-slate-200 text-xs line-clamp-1">{c.item.name}</span>
                      {isComposite && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-medium mt-0.5">
                          <Layers className="h-3 w-3 shrink-0" />
                          <span>Barang Komposit ({c.item.compositions?.length || 0} bahan)</span>
                        </span>
                      )}
                    </div>
                    <button onClick={() => removeFromCart(c.item.id)} className="text-slate-500 hover:text-red-400 shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">
                        @Rp {priceDetail.unitPrice.toLocaleString('id-ID')}
                      </span>
                      {priceDetail.priceType === 'price_tier' && priceDetail.activeTier && (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded">
                          Grosir ≥{priceDetail.activeTier.min_quantity}
                        </span>
                      )}
                      {priceDetail.hasChildTier && priceDetail.activeChildTiers && (
                        <span
                          className="bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded cursor-help"
                          title={priceDetail.activeChildTiers.map(t => `${t.childName}: ≥${t.minQty} (@Rp ${t.unitPrice.toLocaleString('id-ID')})`).join(', ')}
                        >
                          Grosir Bahan Aktif
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-emerald-400">
                      Rp {itemTotal.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => updateQuantity(c.item.id, -1)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                        title="Kurangi kuantitas"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={c.quantity}
                        onChange={(e) => setDirectQuantity(c.item.id, e.target.value)}
                        onBlur={(e) => handleQuantityBlur(c.item.id, e.target.value)}
                        className="w-16 bg-slate-950 border border-slate-800 rounded px-1 py-0.5 text-center font-bold text-xs text-slate-200 focus:outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => updateQuantity(c.item.id, 1)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                        title="Tambah kuantitas"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Calculation Footer */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-200">Rp {subtotal.toLocaleString('id-ID')}</span>
          </div>

          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Diskon (Rp)</span>
            <input
              type="number"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
              className="w-24 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-right text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-between text-base font-extrabold text-slate-100 pt-2 border-t border-slate-800">
            <span>TOTAL</span>
            <span className="text-emerald-400">Rp {totalAmount.toLocaleString('id-ID')}</span>
          </div>

          <button
            disabled={cart.length === 0}
            onClick={() => setShowCheckoutModal(true)}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-md transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
          >
            <span>LANJUT</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* CHECKOUT MODAL */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-lg text-slate-100">Pembayaran Kasir POS</h3>
              <button onClick={() => setShowCheckoutModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Customer Summary Card */}
              <div className="bg-slate-950 p-3 rounded-md border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block">Customer:</span>
                  <span className="font-bold text-slate-200">{customerName || 'Walk-in Customer'}</span>
                </div>
                {customerPhone && (
                  <div className="text-right">
                    <span className="text-slate-400 block">WhatsApp:</span>
                    <span className="font-mono text-emerald-400 font-bold">{customerPhone}</span>
                  </div>
                )}
              </div>

              {/* Deadline Date & Time Input + Quick Presets */}
              <div className="bg-slate-950 p-3 rounded-md border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-amber-400">
                    Target / Deadline Selesai Order <span className="text-slate-400 font-normal italic">(Opsional)</span>
                  </label>
                  <span className="text-[10px] text-slate-500">Pilih / Gunakan Tombol Cepat</span>
                </div>

                <Flatpickr
                  data-enable-time
                  value={estimatedCompletionAt}
                  onChange={([date]) => {
                    if (date) {
                      setEstimatedCompletionAt(date.toISOString());
                    } else {
                      setEstimatedCompletionAt('');
                    }
                  }}
                  options={{
                    enableTime: true,
                    dateFormat: "Y-m-d H:i",
                    time_24hr: true,
                    altInput: true,
                    altFormat: "d F Y - H:i WIB",
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-md p-2 text-xs text-amber-300 focus:outline-none focus:border-amber-500 font-mono cursor-pointer"
                  placeholder="Pilih Tanggal & Jam Deadline (Opsional)..."
                />

                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-slate-500 font-semibold">Preset:</span>
                  <button
                    type="button"
                    onClick={() => applyDeadlinePreset('2h')}
                    className="px-2 py-0.5 bg-slate-900 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[10px] font-bold transition-colors"
                  >
                    +2 Jam
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDeadlinePreset('5h')}
                    className="px-2 py-0.5 bg-slate-900 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[10px] font-bold transition-colors"
                  >
                    +5 Jam
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDeadlinePreset('tomorrow_16')}
                    className="px-2 py-0.5 bg-slate-900 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[10px] font-bold transition-colors"
                  >
                    Besok 16:00
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDeadlinePreset('3d')}
                    className="px-2 py-0.5 bg-slate-900 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[10px] font-bold transition-colors"
                  >
                    +3 Hari
                  </button>
                </div>
              </div>

              {/* Payment Type Toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Status / Tipe Pembayaran</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentType('full')}
                    className={`py-2.5 px-3 rounded-md text-xs font-bold transition-all border ${paymentType === 'full'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                  >
                    Bayar Lunas (Full)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('dp')}
                    className={`py-2.5 px-3 rounded-md text-xs font-bold transition-all border ${paymentType === 'dp'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                  >
                    Uang Muka (DP)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Metode Pembayaran</label>
                <div className="grid grid-cols-3 gap-2">
                  {['cash', 'qris', 'debit_card', 'bank_transfer', 'crypto_btc', 'crypto_usdt'].map(method => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 px-3 rounded-md text-xs font-bold uppercase transition-colors border ${paymentMethod === method
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                    >
                      {method.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* DP Amount & Calculation Input */}
              {paymentType === 'dp' && (
                <div className="bg-slate-950 p-3 rounded-md border border-slate-800 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-amber-400 mb-1">Nominal Uang Muka / DP (Rp)</label>
                    <input
                      type="number"
                      value={dpAmount}
                      onChange={(e) => setDpAmount(e.target.value)}
                      placeholder="Masukkan nominal DP..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-md p-2.5 text-base font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Total Nota:</span>
                      <span className="font-semibold text-slate-200">Rp {totalAmount.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-amber-400">
                      <span>Nominal DP:</span>
                      <span className="font-semibold">Rp {(parseFloat(dpAmount || 0)).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-slate-200 font-extrabold text-xs pt-1 border-t border-slate-800/50">
                      <span>Sisa Belum Lunas:</span>
                      <span className="text-red-400">
                        Rp {Math.max(0, totalAmount - parseFloat(dpAmount || 0)).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'cash' && paymentType === 'full' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nominal Uang Tunai (Rp)</label>
                  <input
                    type="number"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    placeholder={totalAmount.toString()}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-3 text-lg font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                  <div className="mt-2 text-xs flex justify-between text-slate-400">
                    <span>Kembalian:</span>
                    <span className="font-bold text-slate-100">Rp {changeAmount.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              )}
            </div>

            {/* INLINE ACTION BUTTONS */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={loading}
                  onClick={() => handleCheckoutSubmit('completed')}
                  className="py-3 px-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 text-center"
                  title="Bayar lunas & selesaikan transaksi instan"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>SELESAI & LUNAS</span>
                </button>

                <button
                  disabled={loading}
                  onClick={() => handleCheckoutSubmit('processing')}
                  className="py-3 px-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-md text-xs flex items-center justify-center gap-1.5 transition-all shadow-md text-center"
                  title="Simpan nota pesanan untuk diproses/dicetak tanpa penyelesaian instan"
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span>TERIMA ORDER</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-md text-xs transition-colors"
              >
                BATAL
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
                <span className="font-bold text-sm">Struk POS Thermal</span>
              </div>
              <button onClick={() => setShowReceiptModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-emerald-400 font-medium">{printingStatus}</p>

            <div className="bg-white text-black p-4 rounded-md font-mono text-[11px] leading-tight overflow-x-auto whitespace-pre border shadow-inner max-h-80">
              {posReceiptText}
              {posQrBase64 && (
                <div className="mt-3 pt-3 border-t border-dashed border-gray-300 text-center">
                  <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">⭐ Scan QR Review Staf</p>
                  <img src={posQrBase64} alt="QR Code Review" className="w-28 h-28 mx-auto border p-1 rounded bg-white shadow-sm" />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowReceiptModal(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-md text-xs"
              >
                Tutup Window Struk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPOSITION PREVIEW MODAL */}
      {previewCompositionItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-amber-400">
                <Layers className="h-5 w-5" />
                <h3 className="font-bold text-sm text-slate-100">Rincian Komposisi Bahan</h3>
              </div>
              <button
                onClick={() => setPreviewCompositionItem(null)}
                className="text-slate-500 hover:text-slate-300 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <h4 className="font-bold text-slate-200 text-base">{previewCompositionItem.name}</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Item Komposit ({previewCompositionItem.compositions?.length || 0} Komponen Bahan Baku / Jasa)
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-md p-3 divide-y divide-slate-800/60 max-h-60 overflow-y-auto space-y-2">
              {previewCompositionItem.compositions && previewCompositionItem.compositions.length > 0 ? (
                previewCompositionItem.compositions.map((comp, idx) => {
                  const childName = comp.child_item?.name || `Item #${comp.child_item_id}`;
                  const childUnit = comp.child_item?.unit || 'pcs';
                  const childPrice = comp.child_item ? getItemEffectivePrice(comp.child_item, comp.quantity) : 0;
                  const subtotalComp = childPrice * parseFloat(comp.quantity || 0);

                  return (
                    <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-200">{childName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {parseFloat(comp.quantity)} {childUnit} &times; @Rp {childPrice.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <span className="font-bold text-amber-400">
                        Rp {subtotalComp.toLocaleString('id-ID')}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-500 py-2 text-center">Belum ada rincian bahan baku terdaftar.</p>
              )}
            </div>

            <div className="pt-2 flex justify-between items-center text-xs text-slate-300 font-semibold border-t border-slate-800">
              <span>Total Kalkulasi Produk</span>
              <span className="text-base font-extrabold text-emerald-400">
                Rp {getItemPriceDetail(previewCompositionItem, 1).unitPrice.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  addToCart(previewCompositionItem);
                  setPreviewCompositionItem(null);
                }}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-emerald-500/20"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah ke Keranjang Kasir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SERVER DIRECT PRINTER CONFIG MODAL */}
      {showPrinterModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400">
                <Printer className="h-5 w-5" />
                <h3 className="font-bold text-sm text-slate-100">Setup Server Direct Thermal Print</h3>
              </div>
              <button onClick={() => setShowPrinterModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-md border border-slate-800 text-xs space-y-1">
              <span className="font-bold text-emerald-400 block">Server-Side Direct Print Active</span>
              <p className="text-slate-400 text-[11px]">
                Server Backend (FastAPI) langsung membuka TCP Socket ke printer LAN tanpa memerlukan service bridge di komputer kasir.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">IP Address Printer POS LAN</label>
                <input
                  type="text"
                  value={printerIp}
                  onChange={(e) => setPrinterIp(e.target.value)}
                  placeholder="192.168.0.110"
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Port RAW Socket Printer</label>
                <input
                  type="number"
                  value={printerPort}
                  onChange={(e) => setPrinterPort(parseInt(e.target.value, 10) || 9100)}
                  placeholder="9100"
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {testPrintMessage && (
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-300 font-mono">
                {testPrintMessage}
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => setShowPrinterModal(false)}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md text-xs transition-colors"
              >
                SIMPAN & TUTUP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CASHIER SHIFT SETTLEMENT MODAL */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-amber-400">
                <Wallet className="h-5 w-5" />
                <h3 className="font-bold text-base text-slate-100">Rekapitulasi Shift Kasir (Closing)</h3>
              </div>
              <button onClick={() => setShowShiftModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            {(() => {
              const totalShiftSales = shiftOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
              const cashSales = shiftOrders.filter(o => o.initial_payment?.payment_method === 'cash' || o.payment_method === 'cash').reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
              const nonCashSales = Math.max(0, totalShiftSales - cashSales);
              const expectedCashInDrawer = (parseFloat(shiftInitialCash || 0)) + cashSales;

              return (
                <div className="space-y-4 text-xs">
                  <div className="bg-slate-950 p-3.5 rounded-md border border-slate-800 space-y-2 font-mono">
                    <div className="flex justify-between text-slate-400 font-sans">
                      <span>Operator Kasir:</span>
                      <span className="font-bold text-slate-200">{user?.full_name || user?.username || 'Kasir Active'}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 font-sans">
                      <span>Tanggal Shift:</span>
                      <span className="font-bold text-emerald-400">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 font-sans pt-1 border-t border-slate-800">
                      <span>Total Transaksi Hari Ini:</span>
                      <span className="font-bold text-slate-200">{shiftOrders.length} Pesanan</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Modal Uang Tunai Awal di Laci (Rp)</label>
                    <input
                      type="number"
                      value={shiftInitialCash}
                      onChange={(e) => setShiftInitialCash(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-sm font-bold text-amber-400 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-md border border-slate-800 space-y-2">
                    <div className="flex justify-between text-slate-300">
                      <span>Total Penjualan Tunai (Cash):</span>
                      <span className="font-bold text-emerald-400 font-mono">Rp {cashSales.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Total Penjualan Non-Tunai (QRIS / Transfer):</span>
                      <span className="font-bold text-purple-400 font-mono">Rp {nonCashSales.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-slate-200 pt-2 border-t border-slate-800 font-bold">
                      <span>Total Omzet Shift Ini:</span>
                      <span className="text-emerald-400 font-mono">Rp {totalShiftSales.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  <div className="bg-amber-500/10 p-3.5 rounded-md border border-amber-500/20 text-amber-300 flex justify-between items-center">
                    <div>
                      <span className="font-bold block">Total Uang Fisik Tunai di Laci:</span>
                      <span className="text-[11px] text-amber-400/80">Modal Awal (Rp {parseFloat(shiftInitialCash || 0).toLocaleString('id-ID')}) + Tunai Masuk</span>
                    </div>
                    <span className="text-base font-extrabold font-mono">Rp {expectedCashInDrawer.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowShiftModal(false)}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-md text-xs transition-colors"
                    >
                      TUTUP REKAP SHIFT
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};


export default POS;
