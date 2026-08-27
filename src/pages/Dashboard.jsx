import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, Clock, AlertTriangle, CheckCircle2, TrendingUp,
  RefreshCw, ArrowUpRight, DollarSign, Calendar, AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api, { SERVER_ORIGIN } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { isSuperAdmin, user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalOmzetToday, setTotalOmzetToday] = useState(0);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [sumRes, ordersRes] = await Promise.all([
        api.get('/orders/dashboard-summary').catch(() => ({ data: {} })),
        api.get('/orders').catch(() => ({ data: [] }))
      ]);
      const summaryData = sumRes.data || {};
      setSummary(summaryData);

      const allOrders = ordersRes.data || [];
      setRecentOrders(allOrders.slice(0, 5));

      // Calculate Today's Omzet (Rp) for Super Admin
      const todayDateStr = new Date().toLocaleDateString('sv'); // YYYY-MM-DD
      const todayOmzet = allOrders
        .filter(o => {
          if (!o || o.order_status === 'cancelled') return false;
          const createdDate = o.created_at ? new Date(o.created_at).toLocaleDateString('sv') : '';
          return createdDate === todayDateStr;
        })
        .reduce((acc, o) => acc + parseFloat(o.total_amount || 0), 0);

      const serverRevenue = summaryData.revenue_today || summaryData.total_revenue_today || summaryData.total_omzet_today || summaryData.omzet_today;
      setTotalOmzetToday(serverRevenue !== undefined && serverRevenue !== null ? parseFloat(serverRevenue) : todayOmzet);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-400">Ringkasan operasional toko, statistik nota cetak, & antrean deadline</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-md transition-colors flex items-center gap-2 text-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase">Nota Hari Ini</span>
              <div className="p-2 rounded-md bg-blue-500/10 text-blue-400">
                <ShoppingBag className="h-5 w-5" />
              </div>
            </div>
            <h3 className="text-3xl font-extrabold text-slate-100">{summary.orders_received_today}</h3>
            <p className="text-xs text-slate-500">Nota masuk hari ini</p>

            {(isSuperAdmin || user?.role === 'super_admin') && (
              <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Total</span>
                <span className="font-extrabold text-emerald-400 font-mono text-sm">
                  Rp {totalOmzetToday.toLocaleString('id-ID')}
                </span>
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase">Diproses</span>
              <div className="p-2 rounded-md bg-purple-500/10 text-purple-400">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <h3 className="text-3xl font-extrabold text-purple-400">{summary.orders_in_processing}</h3>
            <p className="text-xs text-slate-500">Sedang dikerjakan mesin</p>
          </div>

          <div className="bg-slate-900 border border-amber-500/30 p-5 rounded-lg space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400 uppercase">Mendekati Deadline</span>
              <div className="p-2 rounded-md bg-amber-500/10 text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            <h3 className="text-3xl font-extrabold text-amber-400">{summary.orders_approaching_deadline}</h3>
            <p className="text-xs text-slate-500">Deadline &lt; 6 Jam</p>
          </div>

          <div className="bg-slate-900 border border-red-500/30 p-5 rounded-lg space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-red-400 uppercase">Terlewat Deadline</span>
              <div className="p-2 rounded-md bg-red-500/10 text-red-400">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>
            <h3 className="text-3xl font-extrabold text-red-400">{summary.orders_overdue}</h3>
            <p className="text-xs text-slate-500">Butuh penanganan cepat</p>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-5 rounded-lg space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400 uppercase">Siap Ambil</span>
              <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <h3 className="text-3xl font-extrabold text-emerald-400">{summary.orders_ready_for_pickup}</h3>
            <p className="text-xs text-slate-500">Menunggu customer</p>
          </div>
        </div>
      )}

      {/* Quick Navigation & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Section */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-slate-100">Nota Terbaru Masuk</h3>
            <Link to="/orders" className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold">
              <span>Lihat Semua Nota</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentOrders.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">Belum ada transaksi nota terbaru.</p>
            ) : (
              recentOrders.map(o => (
                <div key={o.id} className="bg-slate-950 p-4 rounded-md border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-400 font-mono text-sm">{o.invoice_number}</span>
                      <span className="text-[10px] uppercase bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">{o.order_source}</span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium mt-1">{o.customer_name}</p>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-slate-100 block text-sm">Rp {parseFloat(o.total_amount).toLocaleString('id-ID')}</span>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded inline-block mt-1">
                      {o.order_status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Action Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-100 pb-3 border-b border-slate-800 mb-4">Aksi Cepat Admin</h3>
            <div className="space-y-3">
              <Link
                to="/pos"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold p-3.5 rounded-md flex items-center justify-between transition-all shadow-lg shadow-emerald-500/20"
              >
                <span>+ Buat Nota / Input Order</span>
                <ArrowUpRight className="h-5 w-5" />
              </Link>
              <Link
                to="/items"
                className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold p-3.5 rounded-md flex items-center justify-between transition-all"
              >
                <span>Kelola Katalog Barang</span>
                <ArrowUpRight className="h-5 w-5" />
              </Link>
              <Link
                to="/bonuses"
                className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold p-3.5 rounded-md flex items-center justify-between transition-all"
              >
                <span>Cek Insentif Staf</span>
                <ArrowUpRight className="h-5 w-5" />
              </Link>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded-md text-xs text-slate-400 space-y-1">
            <span className="text-emerald-400 font-bold block">Status Integrasi Server</span>
            <p>Sistem backend server aktif terhubung ke `{SERVER_ORIGIN}` dengan Tortoise ORM.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
