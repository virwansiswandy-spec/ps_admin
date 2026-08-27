import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, X, Tag, Package, ChevronRight } from 'lucide-react';
import api from '../services/api';
import { showSuccess, showError, showConfirm } from '../utils/swal';
import Pagination from '../components/Pagination';
import { useAuth } from '../context/AuthContext';
import { canEditOrDelete, showPermissionDeniedAlert } from '../utils/permissions';

const Categories = () => {
  const navigate = useNavigate();
  const { user, isSuperAdmin } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setShowModal(true);
  };

  const openEditModal = (cat) => {
    if (!canEditOrDelete(cat, user, isSuperAdmin)) {
      showPermissionDeniedAlert('mengubah');
      return;
    }
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        description,
        ...(user?.id ? { created_by_id: user.id, user_id: user.id } : {}),
        created_by: user?.full_name || user?.username || user?.email || 'Admin'
      };

      if (editingCategory) {
        if (!canEditOrDelete(editingCategory, user, isSuperAdmin)) {
          showPermissionDeniedAlert('mengubah');
          return;
        }
        await api.put(`/categories/${editingCategory.id}`, payload);
      } else {
        await api.post('/categories', payload);
      }
      setShowModal(false);
      setName('');
      setDescription('');
      const catName = name;
      setEditingCategory(null);
      fetchCategories();
      showSuccess('Berhasil!', editingCategory ? `Kategori "${catName}" berhasil diperbarui.` : `Kategori "${catName}" berhasil ditambahkan.`);
    } catch (err) {
      showError('Gagal!', err.response?.data?.detail || 'Gagal menyimpan kategori.');
    }
  };

  const handleDelete = async (cat) => {
    if (!canEditOrDelete(cat, user, isSuperAdmin)) {
      showPermissionDeniedAlert('menghapus');
      return;
    }

    const confirmed = await showConfirm({
      title: 'Hapus Kategori?',
      text: `Apakah Anda yakin ingin menghapus kategori "${cat.name}"?`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      icon: 'warning'
    });
    if (!confirmed) return;

    try {
      await api.delete(`/categories/${cat.id}`);
      showSuccess('Berhasil!', `Kategori "${cat.name}" telah dihapus.`);
      fetchCategories();
    } catch (err) {
      showError('Gagal!', err.response?.data?.detail || 'Gagal menghapus kategori.');
    }
  };

  const handleNavigateToItems = (catId) => {
    navigate(`/items?category_id=${catId}`);
  };

  const paginatedCategories = categories.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Kategori</h1>
          <p className="text-sm text-slate-400">Pengelompokan kategori produk ATK dan jenis layanan percetakan</p>
        </div>
        {(isSuperAdmin || user?.role === 'super_admin') && (
          <button
            onClick={openCreateModal}
            className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md transition-all flex items-center gap-2 text-sm shadow-lg shadow-emerald-500/20"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Kategori</span>
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {paginatedCategories.map(cat => (
            <div key={cat.id} className="bg-slate-900 border border-slate-800 p-5 rounded-lg space-y-4 shadow-xl hover:border-slate-700 transition-all group flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Tag className="h-4 w-4 shrink-0" />
                  <h3 className="font-bold text-slate-100 text-base group-hover:text-emerald-400 transition-colors">{cat.name}</h3>
                </div>
                {canEditOrDelete(cat, user, isSuperAdmin) && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditModal(cat)}
                      className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Edit Kategori"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Hapus Kategori"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{cat.description || 'Tidak ada deskripsi.'}</p>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
              {/* Clickable Items Count Badge */}
              <button
                onClick={() => handleNavigateToItems(cat.id)}
                className="flex items-center gap-2 py-1.5 px-3 bg-slate-800/70 hover:bg-emerald-500/10 hover:border-emerald-500/30 border border-slate-700/50 rounded-md text-xs font-semibold text-slate-300 hover:text-emerald-400 transition-all cursor-pointer group/badge"
              >
                <Package className="h-3.5 w-3.5 text-emerald-400" />
                <span>{cat.items_count ?? 0} Item</span>
                <ChevronRight className="h-3 w-3 text-slate-500 group-hover/badge:translate-x-0.5 transition-transform" />
              </button>

              <span className="text-[10px] text-slate-500 font-mono">ID: {cat.id}</span>
            </div>
          </div>
        ))}
      </div>

        <Pagination
          currentPage={currentPage}
          totalItems={categories.length}
          pageSize={pageSize}
          pageSizeOptions={[9, 18, 27, 45]}
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
              <h3 className="font-bold text-slate-100">{editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nama Kategori</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Kertas & Karton"
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Deskripsi</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Penjelasan kategori..."
                  rows="2"
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
                  {editingCategory ? 'Update Kategori' : 'Simpan Kategori'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
