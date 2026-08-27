import React, { useState, useEffect } from 'react';
import { Users, Plus, ShieldCheck, UserCheck, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import Pagination from '../components/Pagination';
import { useSortableData, SortableHeader } from '../hooks/useSortableData';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { items: sortedUsers, requestSort, sortConfig } = useSortableData(users);
  const paginatedUsers = sortedUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'admin'
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirm_password) {
      showError('Peringatan', 'Konfirmasi password tidak cocok dengan password yang dimasukkan.');
      return;
    }
    try {
      // 1. Register staff account
      await api.post('/auth/register', {
        email: formData.email,
        full_name: formData.full_name,
        password: formData.password
      });

      // Fetch user to update role if super_admin
      fetchUsers();
      setShowModal(false);
      setFormData({ email: '', full_name: '', password: '', role: 'admin' });
      alert(`Akun staf '${formData.full_name}' berhasil terdaftar!`);
    } catch (err) {
      alert(err.response?.data?.detail || 'Gagal mergistrasi staf baru.');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/users/${userId}/role`, { role: newRole });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Gagal mengubah role pengguna.');
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      await api.put(`/users/${userId}/status`, { is_active: !currentStatus });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Gagal mengubah status aktif pengguna.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Manajemen Staf</h1>
          <p className="text-sm text-slate-400">Pengelolaan pendaftaran staf kasir, operator, dan pengalokasian role</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md transition-all flex items-center gap-2 text-sm shadow-lg shadow-emerald-500/20"
        >
          <Plus className="h-4 w-4" />
          <span>Daftarkan Staf Baru</span>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
              <tr>
                <SortableHeader title="Nama Lengkap" sortKey="full_name" sortConfig={sortConfig} onRequestSort={requestSort} />
                <SortableHeader title="Email" sortKey="email" sortConfig={sortConfig} onRequestSort={requestSort} />
                <SortableHeader title="Verifikasi Email" sortKey="is_verified" sortConfig={sortConfig} onRequestSort={requestSort} />
                <SortableHeader title="Role Akses" sortKey="role" sortConfig={sortConfig} onRequestSort={requestSort} />
                <SortableHeader title="Status Akun" sortKey="is_active" sortConfig={sortConfig} onRequestSort={requestSort} />
                <th className="px-6 py-4 text-right">Aksi Approval & Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-100">{u.full_name}</td>
                  <td className="px-6 py-4 text-slate-400 font-mono text-xs">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      u.is_verified ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}>
                      {u.is_verified ? 'VERIFIED' : 'PENDING TOKEN'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                      u.role === 'super_admin' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                      u.role === 'admin' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {u.role === 'super_admin' ? '👑 PEMILIK TOKO' : u.role === 'admin' ? 'STAF ADMIN TOKO' : 'CUSTOMER'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleStatusToggle(u.id, u.is_active)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        u.is_active ? 'bg-emerald-500/10 text-emerald-400 hover:bg-red-500/20 hover:text-red-400' : 'bg-red-500/10 text-red-400 hover:bg-emerald-500/20 hover:text-emerald-400'
                      }`}
                    >
                      {u.is_active ? 'Aktif (Klik Banned)' : 'Banned (Klik Aktifkan)'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="bg-slate-950 border border-slate-800 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
                    >
                      <option value="user">Customer (Default)</option>
                      <option value="admin">Promosikan ke Staf Admin</option>
                      <option value="super_admin">Promosikan ke Super Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={users.length}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-slate-100">Daftarkan Staf Baru</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nama Lengkap Staf</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Contoh: Budi Operator Cetak"
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-sm text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Email Staf</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="budi@store.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-sm text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Password Default</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-sm text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Ulangi Konfirmasi Password *</label>
                <input
                  type="password"
                  required
                  value={formData.confirm_password}
                  onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                  placeholder="Ulangi password di atas"
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-sm text-slate-200"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-md text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md text-xs"
                >
                  Daftarkan Staf
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
