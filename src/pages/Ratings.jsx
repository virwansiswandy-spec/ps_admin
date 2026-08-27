import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, RefreshCw, Send, CheckCircle2, UserCheck, Award, ThumbsUp, AlertCircle, Filter, Trophy, Lock, ExternalLink, X } from 'lucide-react';
import api, { API_BASE_URL } from '../services/api';
import Pagination from '../components/Pagination';
import { useSortableData, SortableHeader } from '../hooks/useSortableData';
import { useAuth } from '../context/AuthContext';

const Ratings = () => {
  const { user, isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('reviews'); // 'reviews' or 'performance'
  const [ratings, setRatings] = useState([]);
  const [adminPerformance, setAdminPerformance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRating, setSelectedRating] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [filterRating, setFilterRating] = useState('all'); // 'all', '5', 'low', 'unreplied'

  // Invoice Detail Modal State
  const [viewOrderModal, setViewOrderModal] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reviewsRes, perfRes] = await Promise.all([
        api.get('/ratings/all-reviews').catch(() => ({ data: [] })),
        isSuperAdmin ? api.get('/ratings/admins/performance').catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
      ]);
      setRatings(reviewsRes.data || []);
      setAdminPerformance(perfRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isSuperAdmin]);

  const handleOpenOrderModal = async (orderId, invoiceNumber) => {
    setLoadingOrder(true);
    try {
      const res = await api.get(`/orders/${orderId}`);
      setViewOrderModal(res.data);
    } catch (err) {
      try {
        const resInv = await api.get(`/orders/track/${invoiceNumber}`);
        setViewOrderModal(resInv.data);
      } catch (e) {
        alert('Gagal mengambil rincian invoice nota.');
      }
    } finally {
      setLoadingOrder(false);
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!selectedRating) return;
    try {
      await api.post(`/ratings/reviews/${selectedRating.id}/reply`, { admin_reply: replyText });
      setSelectedRating(null);
      setReplyText('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Gagal mengirim balasan ulasan.');
    }
  };

  // Filter reviews
  const filteredRatings = ratings.filter(r => {
    const stars = r.stars || r.rating || 0;
    if (filterRating === '5') return stars === 5;
    if (filterRating === 'low') return stars <= 3;
    if (filterRating === 'unreplied') return !r.admin_reply;
    return true;
  });

  const { items: sortedRatings, requestSort, sortConfig } = useSortableData(filteredRatings);
  const paginatedRatings = sortedRatings.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Top Metrics Calculations
  const totalReviews = ratings.length;
  const avgStoreRating = totalReviews > 0
    ? (ratings.reduce((acc, curr) => acc + (curr.stars || curr.rating || 0), 0) / totalReviews).toFixed(1)
    : '0.0';

  const repliedCount = ratings.filter(r => r.admin_reply).length;
  const responseRate = totalReviews > 0 ? Math.round((repliedCount / totalReviews) * 100) : 100;

  // Top Performer Staff
  const topStaff = [...adminPerformance].sort((a, b) => b.average_rating - a.average_rating)[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <span>Ulasan & Performa Staf</span>
          </h1>
          <p className="text-sm text-slate-400">Pantau kepuasan pelanggan dan evaluasi kinerja pelayanan staf toko</p>
        </div>
        <button
          onClick={fetchData}
          className="p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Executive Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Kepuasan Toko */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rata-Rata Rating Toko</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-white">{avgStoreRating}</span>
                <span className="text-xs text-amber-400 font-bold">/ 5.0 ?</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Dari total {totalReviews} ulasan customer</p>
            </div>
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400">
              <Star className="h-7 w-7 fill-amber-400" />
            </div>
          </div>
        </div>

        {/* Card 2: Respon Balasan Admin */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tingkat Respon Balasan</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-white">{responseRate}%</span>
                <span className="text-xs text-emerald-400 font-bold">({repliedCount}/{totalReviews} Ulasan)</span>
              </div>
              {/* Progress Bar */}
              <div className="w-36 bg-slate-950 rounded-full h-1.5 mt-2 border border-slate-800 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${responseRate}%` }} />
              </div>
            </div>
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
              <MessageSquare className="h-7 w-7" />
            </div>
          </div>
        </div>

        {/* Card 3: Top Performer Staf */}
        {isSuperAdmin ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <span>Staf Paling Berprestasi</span>
                  <span className="text-amber-400">??</span>
                </p>
                <h3 className="text-lg font-bold text-white mt-1 truncate max-w-[180px]">
                  {topStaff ? topStaff.admin_name : 'Belum Ada Data'}
                </h3>
                <p className="text-xs text-amber-400 font-semibold mt-0.5">
                  {topStaff ? `${topStaff.average_rating}? (${topStaff.total_reviews_received} ulasan)` : '-'}
                </p>
              </div>
              <div className="p-3.5 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-yellow-400">
                <Trophy className="h-7 w-7" />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-lg flex items-center gap-3">
            <div className="p-3 bg-slate-800/80 rounded-xl text-slate-500">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Performa Staf Internal</p>
              <p className="text-xs text-slate-500 mt-1">Evaluasi individu hanya dapat diakses oleh Pemilik Toko (Super Admin).</p>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => { setActiveTab('reviews'); setCurrentPage(1); }}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'reviews'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>Daftar Ulasan Customer ({ratings.length})</span>
        </button>

        {isSuperAdmin && (
          <button
            onClick={() => { setActiveTab('performance'); }}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'performance'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="h-4 w-4" />
            <span>Papan Peringkat Staf ({adminPerformance.length})</span>
          </button>
        )}
      </div>

      {/* TAB 1: REVIEWS LIST */}
      {(activeTab === 'reviews' || !isSuperAdmin) && (
        <div className="space-y-4">
          {/* Quick Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Filter:</span>
              
              <button
                onClick={() => { setFilterRating('all'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  filterRating === 'all'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                Semua Ulasan ({ratings.length})
              </button>

              <button
                onClick={() => { setFilterRating('5'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  filterRating === '5'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                ? 5 Bintang ({ratings.filter(r => (r.stars || r.rating) === 5).length})
              </button>

              <button
                onClick={() => { setFilterRating('low'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  filterRating === 'low'
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                ?? 1-3 Bintang ({ratings.filter(r => (r.stars || r.rating) <= 3).length})
              </button>

              <button
                onClick={() => { setFilterRating('unreplied'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  filterRating === 'unreplied'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                Belum Dibalas ({ratings.filter(r => !r.admin_reply).length})
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <SortableHeader title="No. Invoice" sortKey="invoice_number" sortConfig={sortConfig} onRequestSort={requestSort} />
                    <SortableHeader title="Customer" sortKey="customer_name" sortConfig={sortConfig} onRequestSort={requestSort} />
                    <SortableHeader title="Staf Ditugaskan" sortKey="admin_name" sortConfig={sortConfig} onRequestSort={requestSort} />
                    <SortableHeader title="Rating Kepuasan" sortKey="stars" sortConfig={sortConfig} onRequestSort={requestSort} />
                    <SortableHeader title="Komentar / Ulasan" sortKey="comment" sortConfig={sortConfig} onRequestSort={requestSort} />
                    <th className="px-6 py-4 text-right">Tindakan Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredRatings.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                        Tidak ada data ulasan yang sesuai dengan filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedRatings.map((r) => {
                      const stars = r.stars || r.rating || 0;
                      return (
                        <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-4">
                            <button
                              type="button"
                              onClick={() => handleOpenOrderModal(r.order_id, r.invoice_number)}
                              className="font-bold text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded text-xs hover:bg-emerald-500 hover:text-slate-950 transition-all flex items-center gap-1 group cursor-pointer"
                              title="Klik untuk membuka rincian invoice nota"
                            >
                              <span>{r.invoice_number}</span>
                              <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                            </button>
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-200">{r.customer_name}</td>
                          <td className="px-6 py-4 text-slate-300 font-medium">
                            <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800 text-xs">
                              {r.admin_name}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black ${
                              stars === 5 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                              stars >= 4 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                              stars === 3 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30' :
                              'bg-red-500/10 text-red-400 border border-red-500/30'
                            }`}>
                              <Star className="h-3.5 w-3.5 fill-current" />
                              <span>{stars} / 5</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-300 max-w-xs">
                            {r.comment || r.review_text ? (
                              <p className="italic text-xs text-slate-200 bg-slate-950/60 p-2 rounded border border-slate-800/80">
                                "{r.comment || r.review_text}"
                              </p>
                            ) : (
                              <span className="text-slate-600 text-xs">- Tanpa Catatan -</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {r.admin_reply ? (
                              <div className="text-right">
                                <span className="text-xs text-emerald-400 font-bold inline-flex items-center gap-1">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Sudah Dibalas
                                </span>
                                <p className="text-[11px] text-slate-400 italic mt-0.5 truncate max-w-[180px] ml-auto">
                                  "{r.admin_reply}"
                                </p>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setSelectedRating(r); setReplyText(''); }}
                                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-sm"
                              >
                                Balas Ulasan
                              </button>
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
              totalItems={filteredRatings.length}
              pageSize={pageSize}
              onPageChange={(page) => setCurrentPage(page)}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      )}

      {/* TAB 2: STAFF PERFORMANCE LEADERBOARD (Super Admin Only) */}
      {activeTab === 'performance' && isSuperAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {adminPerformance.map((staff, idx) => {
            const ratingVal = staff.average_rating || 0;
            return (
              <div key={staff.admin_id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
                {/* Crown badge for rank #1 */}
                {idx === 0 && (
                  <div className="absolute top-0 right-0 bg-amber-500/20 border-b border-l border-amber-500/40 px-3 py-1 rounded-bl-xl text-amber-400 font-bold text-xs flex items-center gap-1">
                    <span>?? Rank #1</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-lg flex items-center justify-center">
                      {staff.admin_name ? staff.admin_name.substring(0, 2).toUpperCase() : 'ST'}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100 text-base">{staff.admin_name}</h3>
                      <p className="text-xs text-slate-400 truncate">{staff.admin_email}</p>
                    </div>
                  </div>

                  {/* Rating Highlight Badge */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 mb-4 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Skor Kepuasan</p>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-2xl font-black text-amber-400">{ratingVal}</span>
                        <span className="text-xs text-slate-400">/ 5.0 ?</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Nota</p>
                      <p className="text-lg font-bold text-white mt-0.5">{staff.total_orders_handled} Pesanan</p>
                    </div>
                  </div>

                  {/* Star Distribution Progress Bars */}
                  <div className="space-y-1.5 text-xs">
                    <p className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider mb-2">Rincian Distribusi Bintang:</p>
                    {[5, 4, 3, 2, 1].map((starKey) => {
                      const count = staff.rating_distribution ? (staff.rating_distribution[starKey] || 0) : 0;
                      const pct = staff.total_reviews_received > 0 ? Math.round((count / staff.total_reviews_received) * 100) : 0;
                      return (
                        <div key={starKey} className="flex items-center gap-2">
                          <span className="w-10 text-slate-400 font-medium">{starKey} ?</span>
                          <div className="flex-1 bg-slate-950 rounded-full h-2 border border-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                starKey === 5 ? 'bg-amber-400' :
                                starKey === 4 ? 'bg-emerald-400' :
                                starKey === 3 ? 'bg-yellow-400' : 'bg-red-400'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-slate-400 font-mono text-[11px]">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/80 flex justify-between items-center text-xs text-slate-400">
                  <span>Total Ulasan Diterima:</span>
                  <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {staff.total_reviews_received} Ulasan
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply Modal */}
      {selectedRating && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-100 text-base">Balas Ulasan Nota {selectedRating.invoice_number}</h3>
            <p className="text-xs text-slate-400">
              Customer: <strong className="text-slate-200">{selectedRating.customer_name}</strong> ({selectedRating.stars || selectedRating.rating} Bintang)
            </p>

            <form onSubmit={handleReplySubmit} className="space-y-4">
              <textarea
                required
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Tulis balasan resmi toko..."
                rows="3"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRating(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Kirim Balasan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {viewOrderModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Rincian Invoice Nota</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <h3 className="text-lg font-mono font-bold text-emerald-400">{viewOrderModal.invoice_number}</h3>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                    viewOrderModal.order_status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    viewOrderModal.order_status === 'processing' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                    'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {viewOrderModal.order_status}
                  </span>
                </div>
              </div>
              <button onClick={() => setViewOrderModal(null)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Meta Info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500 block text-[10px]">Customer:</span>
                <span className="font-bold text-slate-200">{viewOrderModal.customer_name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Telepon / WA:</span>
                <span className="font-medium text-slate-300">{viewOrderModal.customer_phone || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Metode Bayar:</span>
                <span className="font-bold text-emerald-400 uppercase">{viewOrderModal.payment_method || 'CASH'}</span>
              </div>
            </div>

            {/* Item Table */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Item Cetakan / Pesanan</h4>
              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Nama Item</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Harga</th>
                      <th className="p-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {(viewOrderModal.items || viewOrderModal.order_items || []).map((item, idx) => {
                      const uPrice = parseFloat(item.unit_price || item.price || 0);
                      const qty = parseFloat(item.quantity || 1);
                      const sub = parseFloat(item.subtotal || item.total_price || (uPrice * qty) || 0);
                      const unit = item.unit_name || item.unit || 'pcs';
                      return (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="p-2.5 font-medium">{item.item_name}</td>
                          <td className="p-2.5 text-center font-mono">{qty} {unit}</td>
                          <td className="p-2.5 text-right font-mono">Rp {uPrice.toLocaleString('id-ID')}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-400">Rp {sub.toLocaleString('id-ID')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
              <div>
                <span className="text-slate-500 block">Status Pembayaran:</span>
                <span className={`font-bold uppercase ${viewOrderModal.payment_status === 'paid' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {viewOrderModal.payment_status === 'paid' ? 'LUNAS (FULL)' : 'BELUM LUNAS / DP'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[10px]">TOTAL NOTA</span>
                <span className="text-lg font-black text-emerald-400 font-mono">
                  Rp {parseFloat(viewOrderModal.total_amount || 0).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <a
                href={`${API_BASE_URL}/orders/${viewOrderModal.id}/pdf?token=${localStorage.getItem("token")}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>?? Cetak PDF Invoice</span>
              </a>
              <button
                onClick={() => setViewOrderModal(null)}
                className="py-2.5 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
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

export default Ratings;
