import React, { useState, useEffect, useMemo } from 'react';
import { Award, Wallet, CheckCircle2, Clock, Calendar, RefreshCw, Eye, Download, Filter, User as UserIcon, FileSpreadsheet, Layers, Tag, X, ChevronRight, AlertCircle } from 'lucide-react';
import api from '../services/api';
import Pagination from '../components/Pagination';
import { useSortableData, SortableHeader } from '../hooks/useSortableData';
import { useAuth } from '../context/AuthContext';

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const Bonuses = () => {
  const { user, isSuperAdmin } = useAuth();
  const currentDate = new Date();

  // Filter States
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedUserId, setSelectedUserId] = useState('');

  // Data States
  const [recap, setRecap] = useState([]);
  const [details, setDetails] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [myBonus, setMyBonus] = useState(null);
  const [loading, setLoading] = useState(false);

  // Modal State for Invoice Breakdown Details
  const [selectedDetailStaff, setSelectedDetailStaff] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { items: sortedRecap, requestSort, sortConfig } = useSortableData(recap);
  const paginatedRecap = sortedRecap.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const fetchBonusData = async () => {
    setLoading(true);
    try {
      const params = {
        month: selectedMonth,
        year: selectedYear,
        ...(selectedUserId ? { user_id: selectedUserId } : {})
      };

      const [recapRes, detailsRes, meRes, usersRes] = await Promise.all([
        api.get('/bonuses/recap', { params }).catch(() => ({ data: [] })),
        api.get('/bonuses/details', { params }).catch(() => ({ data: [] })),
        api.get('/bonuses/me', { params: { month: selectedMonth, year: selectedYear } }).catch(() => ({ data: null })),
        api.get('/users').catch(() => ({ data: [] }))
      ]);

      setRecap(recapRes.data || []);
      setDetails(detailsRes.data || []);
      setMyBonus(meRes.data || null);
      setUsersList(usersRes.data || []);
    } catch (err) {
      console.error("Error fetching bonus data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBonusData();
  }, [selectedMonth, selectedYear, selectedUserId]);

  // Overall KPI Summaries
  const kpiStats = useMemo(() => {
    const totalEarned = recap.reduce((sum, r) => sum + (r.total_earned || 0), 0);
    const totalPending = recap.reduce((sum, r) => sum + (r.total_pending || 0), 0);
    const totalClaimed = recap.reduce((sum, r) => sum + (r.total_claimed || 0), 0);
    const grandTotalMonth = totalEarned + totalPending + totalClaimed;

    const topEarner = recap.length > 0
      ? [...recap].sort((a, b) => (b.total_all || 0) - (a.total_all || 0))[0]
      : null;

    return {
      totalEarned,
      totalPending,
      totalClaimed,
      grandTotalMonth,
      topEarner
    };
  }, [recap]);

  // Filtered details for the modal view
  const staffDetailsInModal = useMemo(() => {
    if (!selectedDetailStaff) return [];
    return details.filter(d => String(d.user_id) === String(selectedDetailStaff.user_id));
  }, [details, selectedDetailStaff]);

  // CSV Export Handler
  const exportToCSV = () => {
    if (details.length === 0) {
      alert("Tidak ada data transaksi bonus pada periode ini untuk diunduh.");
      return;
    }

    const headers = ["No. Invoice", "Nama Staf", "Email Staf", "Customer", "Tanggal Transaksi", "Total Nota (Rp)", "Bonus (Rp)", "Status Pelunasan Nota", "Status Bonus"];
    const rows = details.map(d => [
      `"${d.invoice_number || '-'}"`,
      `"${d.staff_name || '-'}"`,
      `"${d.staff_email || '-'}"`,
      `"${d.customer_name || '-'}"`,
      `"${d.created_at ? new Date(d.created_at).toLocaleString('id-ID') : '-'}"`,
      d.order_total || 0,
      d.bonus_amount || 0,
      `"${d.payment_status === 'paid' ? 'LUNAS' : (d.payment_status === 'partial_dp' ? 'DP' : 'BELUM LUNAS')}"`,
      `"${d.bonus_status === 'earned' ? 'Siap Cair' : 'Pending Pelunasan'}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Bonus_Staf_${MONTH_NAMES[selectedMonth - 1]}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openStaffDetailsModal = (staffRecap) => {
    setSelectedDetailStaff(staffRecap);
    setShowDetailModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Award className="h-6 w-6 text-amber-400" />
            <span>Insentif & Bonus Staf</span>
          </h1>
          <p className="text-sm text-slate-400">Rekapitulasi komisi bonus per barang/jasa per bulan untuk kasir & operator</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(parseInt(e.target.value));
              setCurrentPage(1);
            }}
            className="py-2 px-3 bg-slate-900 border border-slate-800 rounded-md text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-400"
          >
            {MONTH_NAMES.map((m, idx) => (
              <option key={idx + 1} value={idx + 1}>{m}</option>
            ))}
          </select>

          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(parseInt(e.target.value));
              setCurrentPage(1);
            }}
            className="py-2 px-3 bg-slate-900 border border-slate-800 rounded-md text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-400"
          >
            {[2026, 2025, 2024].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Staff Filter Selector */}
          <select
            value={selectedUserId}
            onChange={(e) => {
              setSelectedUserId(e.target.value);
              setCurrentPage(1);
            }}
            className="py-2 px-3 bg-slate-900 border border-slate-800 rounded-md text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-400"
          >
            <option value="">Semua Staf Admin</option>
            {usersList.map(u => (
              <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
            ))}
          </select>

          {/* Export CSV */}
          <button
            type="button"
            onClick={exportToCSV}
            className="py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="Unduh Laporan Format CSV/Excel"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Ekspor CSV</span>
          </button>

          {/* Refresh */}
          <button
            onClick={fetchBonusData}
            className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-md transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI SUMMARY CARDS FOR SELECTED MONTH */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Terkumpul Bulan Ini */}
        <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-xl shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Total Terkumpul</span>
            <Calendar className="h-5 w-5 text-amber-400 opacity-80" />
          </div>
          <div className="text-2xl font-extrabold text-slate-100 font-mono mt-2">
            Rp {kpiStats.grandTotalMonth.toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Periode {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
          </p>
        </div>

        {/* Card 2: Bonus Siap Cair (Lunas) */}
        <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Bonus Siap Cair</span>
            <Wallet className="h-5 w-5 text-emerald-400 opacity-80" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-2">
            Rp {kpiStats.totalEarned.toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Dari nota yang sudah LUNAS
          </p>
        </div>

        {/* Card 3: Bonus Pending (Nota DP) */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Pending (Nota DP)</span>
            <Clock className="h-5 w-5 text-amber-300 opacity-80" />
          </div>
          <div className="text-2xl font-extrabold text-amber-300 font-mono mt-2">
            Rp {kpiStats.totalPending.toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Menunggu pelunasan sisa nota
          </p>
        </div>

        {/* Card 4: Top Earner Bulan Ini */}
        <div className="bg-slate-900 border border-purple-500/30 p-4 rounded-xl shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Top Earner</span>
            <Award className="h-5 w-5 text-purple-400 opacity-80" />
          </div>
          <div className="text-lg font-bold text-slate-100 mt-2 truncate">
            {kpiStats.topEarner ? kpiStats.topEarner.full_name : '-'}
          </div>
          <p className="text-[11px] text-purple-300 font-mono font-semibold">
            {kpiStats.topEarner ? `Rp ${kpiStats.topEarner.total_all.toLocaleString('id-ID')}` : 'Belum Ada Transaksi'}
          </p>
        </div>
      </div>

      {/* ADMIN RECAP TABLE FOR THE MONTH */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div>
            <h2 className="font-bold text-slate-100 text-base">Rekapitulasi Bonus Per Staf</h2>
            <p className="text-xs text-slate-400">Daftar akumulasi perolehan insentif untuk bulan {MONTH_NAMES[selectedMonth - 1]} {selectedYear}</p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1 rounded-md border border-slate-800">
            Total {recap.length} Staf
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <SortableHeader title="Nama Staf Admin" sortKey="full_name" sortConfig={sortConfig} onRequestSort={requestSort} />
                <SortableHeader title="Jumlah Nota" sortKey="order_count" sortConfig={sortConfig} onRequestSort={requestSort} />
                <SortableHeader title="Bonus Siap Cair" sortKey="total_earned" sortConfig={sortConfig} onRequestSort={requestSort} />
                <SortableHeader title="Bonus Pending (DP)" sortKey="total_pending" sortConfig={sortConfig} onRequestSort={requestSort} />
                <SortableHeader title="Total Terkumpul" sortKey="total_all" sortConfig={sortConfig} onRequestSort={requestSort} />
                <th className="px-6 py-4 text-right">Rincian Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {recap.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                    Tidak ada data akumulasi bonus staf pada bulan {MONTH_NAMES[selectedMonth - 1]} {selectedYear}.
                  </td>
                </tr>
              ) : (
                paginatedRecap.map(r => (
                  <tr key={r.user_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-sans">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-amber-400 font-bold shrink-0 border border-slate-700">
                          <UserIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-100">{r.full_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{r.email || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-300">
                      <span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">
                        {r.order_count} Nota
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-400">
                      Rp {r.total_earned.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 font-semibold text-amber-400">
                      Rp {r.total_pending.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 font-extrabold text-amber-300 text-sm">
                      Rp {r.total_all.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openStaffDetailsModal(r)}
                        className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm group"
                        title="Klik untuk rincian bonus per nota transaksi"
                      >
                        <Eye className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                        <span>Rincian Nota</span>
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
          totalItems={recap.length}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* DETAIL BONUS PER NOTA MODAL */}
      {showDetailModal && selectedDetailStaff && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Rincian Bonus Per Nota Transaksi
                  </span>
                </div>
                <h2 className="text-lg font-extrabold text-slate-100 flex items-center gap-2">
                  <span>{selectedDetailStaff.full_name}</span>
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  Periode {MONTH_NAMES[selectedMonth - 1]} {selectedYear} | Total: Rp {selectedDetailStaff.total_all.toLocaleString('id-ID')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedDetailStaff(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* List of Bonus Invoices for this staff */}
            <div className="space-y-4">
              {staffDetailsInModal.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                  Tidak ada rincian nota transaksi bonus untuk staf ini pada periode terpilih.
                </div>
              ) : (
                staffDetailsInModal.map((detailItem, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
                    {/* Invoice Meta */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-amber-400 text-sm font-mono">{detailItem.invoice_number}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            detailItem.payment_status === 'paid' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            detailItem.payment_status === 'partial_dp' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {detailItem.payment_status === 'paid' ? 'LUNAS' : (detailItem.payment_status === 'partial_dp' ? 'DP' : 'BELUM LUNAS')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Customer: <strong className="text-slate-200">{detailItem.customer_name}</strong> | Tanggal: {detailItem.created_at ? new Date(detailItem.created_at).toLocaleString('id-ID') : '-'}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Bonus Staf Nota Ini</span>
                        <span className="text-base font-extrabold text-emerald-400 font-mono">
                          + Rp {detailItem.bonus_amount.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>

                    {/* Item Breakdown inside the Invoice */}
                    {detailItem.items && detailItem.items.length > 0 && (
                      <div className="bg-slate-900/60 rounded border border-slate-800/60 p-2.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Barang / Jasa Yang Menghasilkan Bonus:</span>
                        <div className="space-y-1">
                          {detailItem.items.map((it, iIdx) => (
                            <div key={iIdx} className="flex justify-between items-center text-xs font-mono text-slate-300">
                              <span>• {it.quantity}x {it.item_name} (@Rp {it.unit_price.toLocaleString('id-ID')})</span>
                              {it.calculated_bonus > 0 ? (
                                <span className="text-amber-400 font-bold">Bonus: Rp {it.calculated_bonus.toLocaleString('id-ID')}</span>
                              ) : (
                                <span className="text-slate-500 text-[10px]">-</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedDetailStaff(null);
                }}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-colors"
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

export default Bonuses;

