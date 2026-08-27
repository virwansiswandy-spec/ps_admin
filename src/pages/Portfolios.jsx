import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Plus, Trash2, RefreshCw, X, Upload, Tag, Star, Eye, Edit2, ChevronLeft, ChevronRight, Maximize2, User } from 'lucide-react';
import api, { getFileUrl as getImageUrl } from '../services/api';
import { showSuccess, showError, showConfirm } from '../utils/swal';
import Pagination from '../components/Pagination';
import { useAuth } from '../context/AuthContext';
import { canEditOrDelete, showPermissionDeniedAlert } from '../utils/permissions';

const getPortfolioImages = (p) => {
  if (!p) return [];

  const extractUrl = (img) => {
    if (!img) return '';
    if (typeof img === 'string') {
      if (!img.includes('/') && !img.startsWith('http')) {
        return `/uploads/portfolios/${img}`;
      }
      return img;
    }
    const str = img.image_url || img.url || img.file_path || img.path || img.file_name || img.filename || img.image || img.image_path || '';
    if (str && !str.includes('/') && !str.startsWith('http')) {
      return `/uploads/portfolios/${str}`;
    }
    return str;
  };

  if (Array.isArray(p.images) && p.images.length > 0) {
    return p.images.map(extractUrl).filter(Boolean);
  }
  if (Array.isArray(p.image_urls) && p.image_urls.length > 0) {
    return p.image_urls.map(extractUrl).filter(Boolean);
  }
  if (p.cover_image) return [extractUrl(p.cover_image)].filter(Boolean);
  if (p.image_url) return [extractUrl(p.image_url)].filter(Boolean);
  return [];
};

const getUploaderName = (p, currentUser) => {
  const currentName = currentUser?.full_name || currentUser?.name || currentUser?.username || currentUser?.email;
  if (!p) return currentName || 'Admin Toko';

  // Check nested object properties
  if (p.created_by_user?.full_name) return p.created_by_user.full_name;
  if (p.created_by_user?.name) return p.created_by_user.name;
  if (p.created_by_user?.username) return p.created_by_user.username;

  if (p.user?.full_name) return p.user.full_name;
  if (p.user?.name) return p.user.name;
  if (p.user?.username) return p.user.username;

  if (p.creator?.full_name) return p.creator.full_name;
  if (p.creator?.name) return p.creator.name;

  if (p.uploader?.full_name) return p.uploader.full_name;
  if (p.uploader?.name) return p.uploader.name;

  if (p.admin?.full_name) return p.admin.full_name;
  if (p.admin?.name) return p.admin.name;

  // Direct string properties
  if (p.created_by_name) return p.created_by_name;
  if (p.uploaded_by_name) return p.uploaded_by_name;
  if (p.author_name) return p.author_name;
  if (p.user_name) return p.user_name;
  if (p.full_name) return p.full_name;

  // Object created_by or uploaded_by
  if (typeof p.created_by === 'object' && p.created_by !== null) {
    if (p.created_by.full_name) return p.created_by.full_name;
    if (p.created_by.name) return p.created_by.name;
    if (p.created_by.username) return p.created_by.username;
  }
  if (typeof p.uploaded_by === 'object' && p.uploaded_by !== null) {
    if (p.uploaded_by.full_name) return p.uploaded_by.full_name;
    if (p.uploaded_by.name) return p.uploaded_by.name;
    if (p.uploaded_by.username) return p.uploaded_by.username;
  }

  // String created_by or uploaded_by if not generic 'Admin'
  if (typeof p.created_by === 'string' && p.created_by.trim() && p.created_by !== 'Admin') return p.created_by;
  if (typeof p.uploaded_by === 'string' && p.uploaded_by.trim() && p.uploaded_by !== 'Admin') return p.uploaded_by;

  // Match user ID
  const pUserId = p.user_id || p.created_by_id || p.uploaded_by_id;
  if (pUserId && currentUser && String(pUserId) === String(currentUser.id) && currentName) {
    return currentName;
  }

  // Fallbacks
  if (typeof p.created_by === 'string' && p.created_by.trim()) return p.created_by;
  if (typeof p.uploaded_by === 'string' && p.uploaded_by.trim()) return p.uploaded_by;

  return currentName || 'Admin Toko';
};

const canEditPortfolio = (p, currentUser) => {
  return canEditOrDelete(p, currentUser, currentUser?.role === 'super_admin');
};

// Interactive Slidable Image Showcase Component for Portfolio Card
const PortfolioImageSlider = ({ images, title, onOpenLightbox }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="h-52 bg-slate-950 flex flex-col items-center justify-center text-slate-600 border-b border-slate-800">
        <ImageIcon className="h-12 w-12 stroke-1 mb-1" />
        <span className="text-[10px]">Tanpa Foto</span>
      </div>
    );
  }

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div
      onClick={() => onOpenLightbox(currentIndex)}
      className="h-52 bg-slate-950 flex items-center justify-center border-b border-slate-800 relative overflow-hidden group/slider cursor-pointer"
      title="Klik untuk memperbesar gambar"
    >
      <img
        src={getImageUrl(images[currentIndex])}
        alt={`${title} (${currentIndex + 1})`}
        className="w-full h-full object-cover group-hover/slider:scale-105 transition-transform duration-300"
      />

      {/* Hover Lightbox Indicator */}
      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/slider:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
        <span className="px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-full text-slate-200 text-xs font-bold flex items-center gap-1.5 shadow-lg">
          <Maximize2 className="h-3.5 w-3.5 text-emerald-400" />
          <span>Lihat Ukuran Penuh</span>
        </span>
      </div>

      {/* Navigation Arrows if > 1 Image */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-950/80 hover:bg-slate-900 text-slate-200 border border-slate-800 opacity-0 group-hover/slider:opacity-100 transition-opacity z-10"
            title="Foto Sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-950/80 hover:bg-slate-900 text-slate-200 border border-slate-800 opacity-0 group-hover/slider:opacity-100 transition-opacity z-10"
            title="Foto Selanjutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10 bg-slate-950/60 backdrop-blur-sm px-2 py-1 rounded-full border border-slate-800/80">
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentIndex ? 'w-4 bg-emerald-400' : 'w-1.5 bg-slate-500 hover:bg-slate-300'
                }`}
              />
            ))}
          </div>
        </>
      )}

      {/* Image Count Badge */}
      <span className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur-sm text-slate-200 border border-slate-800 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase flex items-center gap-1 z-10">
        <ImageIcon className="h-3 w-3 text-emerald-400" />
        <span>{images.length} Foto</span>
      </span>
    </div>
  );
};

const Portfolios = () => {
  const { user } = useAuth();

  const [portfolios, setPortfolios] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Modal & Editing State
  const [showModal, setShowModal] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState(null);

  // Lightbox Preview State
  const [lightboxData, setLightboxData] = useState(null); // { portfolio, index }

  // File Upload States
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [existingImageObjects, setExistingImageObjects] = useState([]);

  // Filter & Search States
  const [filterByMe, setFilterByMe] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
    item_id: '',
    client_name: '',
    description: '',
    is_featured: false
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [portRes, catRes, itemsRes] = await Promise.all([
        api.get('/portfolios/').catch(() => ({ data: [] })),
        api.get('/categories/').catch(() => ({ data: [] })),
        api.get('/items/').catch(() => ({ data: [] }))
      ]);

      const rawPortfolios = portRes.data || [];
      const fullPortfolios = await Promise.all(
        rawPortfolios.map(async (p) => {
          const existingImgs = getPortfolioImages(p);
          if (existingImgs.length === 0 && p.id) {
            try {
              const detailRes = await api.get(`/portfolios/${p.id}`);
              if (detailRes.data) return detailRes.data;
            } catch (err) {
              console.error(`Failed to load portfolio #${p.id} detail:`, err);
            }
          }
          return p;
        })
      );

      setPortfolios(fullPortfolios);
      setCategories(catRes.data || []);
      setItems(itemsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setSelectedFiles(prev => [...prev, ...files]);

    const newPreviews = files.map(file => URL.createObjectURL(file));
    setFilePreviews(prev => [...prev, ...newPreviews]);
  };

  const handleRemoveNewFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteExistingImage = async (imgItem, index) => {
    const confirmed = await showConfirm({
      title: 'Hapus Foto Ini?',
      text: 'Foto ini akan dihapus dari portofolio.'
    });
    if (!confirmed) return;

    const imgId = typeof imgItem === 'object' ? (imgItem.id || imgItem.image_id) : null;
    if (imgId && editingPortfolio?.id) {
      try {
        await api.delete(`/portfolios/${editingPortfolio.id}/images/${imgId}`)
          .catch(() => api.delete(`/portfolio-images/${imgId}`))
          .catch(() => api.delete(`/portfolios/images/${imgId}`));
      } catch (err) {
        console.error('Failed to delete image:', err);
      }
    }

    setExistingImageObjects(prev => prev.filter((_, i) => i !== index));
    showSuccess('Berhasil!', 'Foto berhasil dihapus.');
    fetchData();
  };

  const resetForm = () => {
    setEditingPortfolio(null);
    setFormData({
      title: '',
      category_id: '',
      item_id: '',
      client_name: '',
      description: '',
      is_featured: false
    });
    setSelectedFiles([]);
    setFilePreviews([]);
    setExistingImageObjects([]);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (portfolio) => {
    if (!canEditPortfolio(portfolio, user)) {
      showError('Akses Ditolak', 'Hanya admin yang meng-upload portofolio ini atau Super Admin yang berhak mengubahnya.');
      return;
    }
    setEditingPortfolio(portfolio);
    setFormData({
      title: portfolio.title || '',
      category_id: portfolio.category_id ? String(portfolio.category_id) : '',
      item_id: portfolio.item_id ? String(portfolio.item_id) : '',
      client_name: portfolio.client_name || '',
      description: portfolio.description || '',
      is_featured: Boolean(portfolio.is_featured)
    });
    setSelectedFiles([]);
    setFilePreviews([]);
    setExistingImageObjects(Array.isArray(portfolio.images) && portfolio.images.length > 0 ? portfolio.images : getPortfolioImages(portfolio));
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showError('Peringatan', 'Judul portofolio harus diisi.');
      return;
    }

    try {
      setLoading(true);
      const uploaderName = user?.full_name || user?.name || user?.username || user?.email || 'Admin';
      const uploaderId = user?.id || null;

      const payload = {
        title: formData.title.trim(),
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        item_id: formData.item_id ? parseInt(formData.item_id) : null,
        client_name: formData.client_name ? formData.client_name.trim() : null,
        description: formData.description ? formData.description.trim() : null,
        is_featured: Boolean(formData.is_featured),
        is_active: true,
        created_by: uploaderName,
        created_by_id: uploaderId,
        user_id: uploaderId,
        uploaded_by: uploaderName,
        uploaded_by_name: uploaderName,
        created_by_name: uploaderName,
        user_name: uploaderName
      };

      let targetId = null;

      if (editingPortfolio) {
        targetId = editingPortfolio.id;
        await api.put(`/portfolios/${targetId}`, payload)
          .catch(() => api.patch(`/portfolios/${targetId}`, payload));
        showSuccess('Berhasil!', `Portofolio "${formData.title}" telah diperbarui.`);
      } else {
        const res = await api.post('/portfolios', payload);
        targetId = res.data?.id || res.data?.portfolio?.id || res.data?.data?.id;
        showSuccess('Berhasil!', `Portofolio baru "${formData.title}" telah disimpan.`);
      }

      if (selectedFiles.length > 0 && targetId) {
        const uploadData = new FormData();

        // Append files under various field keys to match server expectations
        selectedFiles.forEach(file => {
          uploadData.append('files', file);
          uploadData.append('images', file);
        });
        if (selectedFiles[0]) {
          uploadData.append('file', selectedFiles[0]);
          uploadData.append('image', selectedFiles[0]);
        }

        // Attach admin uploader details to FormData
        if (uploaderName) {
          uploadData.append('created_by', uploaderName);
          uploadData.append('uploaded_by', uploaderName);
          uploadData.append('uploaded_by_name', uploaderName);
          uploadData.append('created_by_name', uploaderName);
          uploadData.append('user_name', uploaderName);
        }
        if (uploaderId) {
          uploadData.append('user_id', String(uploaderId));
          uploadData.append('created_by_id', String(uploaderId));
          uploadData.append('uploaded_by_id', String(uploaderId));
        }

        // Also pass query parameters for endpoints expecting params in URL
        const queryParams = {
          created_by: uploaderName,
          uploaded_by: uploaderName,
          uploaded_by_name: uploaderName,
          ...(uploaderId ? { user_id: uploaderId, created_by_id: uploaderId, uploaded_by_id: uploaderId } : {})
        };

        const config = {
          headers: { 'Content-Type': 'multipart/form-data' },
          params: queryParams
        };

        // Fallback chain for image upload endpoints
        await api.post(`/portfolios/${targetId}/upload-images`, uploadData, config)
        .catch(() => {
          return api.post(`/portfolios/${targetId}/upload-image`, uploadData, config);
        })
        .catch(() => {
          return api.post(`/portfolios/${targetId}/images`, uploadData, config);
        })
        .catch(() => {
          return api.post(`/portfolios/upload-images`, uploadData, config);
        })
        .catch(() => {
          return api.post(`/portfolios/upload`, uploadData, config);
        })
        .catch((err) => {
          console.error('Failed to upload portfolio images:', err);
        });
      }

      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      showError('Gagal!', err.response?.data?.detail || 'Gagal menyimpan data portofolio.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (portfolio) => {
    if (!canEditPortfolio(portfolio, user)) {
      showError('Akses Ditolak', 'Hanya admin yang meng-upload portofolio ini atau Super Admin yang berhak menghapusnya.');
      return;
    }
    const confirmed = await showConfirm({
      title: 'Hapus Portofolio?',
      text: `Hapus portofolio "${portfolio.title}" beserta seluruh gambarnya?`
    });
    if (!confirmed) return;
    try {
      await api.delete(`/portfolios/${portfolio.id}`);
      showSuccess('Terhapus!', `Portofolio "${portfolio.title}" telah dihapus.`);
      fetchData();
    } catch (err) {
      showError('Gagal!', err.response?.data?.detail || 'Gagal menghapus portofolio.');
    }
  };

  const filteredPortfolios = portfolios.filter(p => {
    if (filterByMe && !canEditPortfolio(p, user)) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = p.title?.toLowerCase().includes(q);
      const clientMatch = p.client_name?.toLowerCase().includes(q);
      const descMatch = p.description?.toLowerCase().includes(q);
      const uploaderMatch = getUploaderName(p, user)?.toLowerCase().includes(q);
      return titleMatch || clientMatch || descMatch || uploaderMatch;
    }
    return true;
  });

  const myPortfoliosCount = portfolios.filter(p => canEditPortfolio(p, user)).length;
  const paginatedPortfolios = filteredPortfolios.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Galeri Portofolio</h1>
          <p className="text-sm text-slate-400">Showcase karya & contoh proyek cetakan Primasakti untuk ditayangkan di website</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-md transition-colors flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md transition-all flex items-center gap-2 text-sm shadow-lg shadow-emerald-500/20"
          >
            <Plus className="h-4 w-4" />
            <span>+ Tambah Portofolio Baru</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => { setFilterByMe(false); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              !filterByMe
                ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <span>Semua Portofolio</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-950/60 text-[10px] text-slate-300 font-bold border border-slate-800">
              {portfolios.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setFilterByMe(true); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filterByMe
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <User className="h-3.5 w-3.5 text-emerald-400" />
            <span>Portofolio Saya</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-950/60 text-[10px] text-emerald-300 font-bold border border-slate-800">
              {myPortfoliosCount}
            </span>
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Cari portofolio, klien, admin..."
            className="w-full bg-slate-950 border border-slate-800 rounded-md py-1.5 pl-3 pr-8 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 placeholder-slate-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Gallery Cards Grid */}
      <div className="space-y-4">
        {filteredPortfolios.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center text-slate-500">
            <ImageIcon className="h-12 w-12 mx-auto mb-3 stroke-1 text-slate-600" />
            <p className="text-sm font-medium text-slate-300">
              {filterByMe
                ? 'Anda belum mengunggah portofolio apa pun.'
                : (searchQuery ? 'Tidak ada portofolio yang cocok dengan pencarian.' : 'Belum ada data portofolio ditambahkan.')}
            </p>
            <p className="text-xs text-slate-600 mt-1">Klik "+ Tambah Portofolio Baru" untuk mengunggah foto karya cetak Anda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {paginatedPortfolios.map(p => {
              const pImages = getPortfolioImages(p);
              const uploaderName = getUploaderName(p, user);
              const catObj = p.category || categories.find(c => String(c.id) === String(p.category_id));

              return (
                <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between group">
                  <div>
                    {/* Slidable Portfolio Showcase */}
                    <div className="relative">
                      <PortfolioImageSlider
                        images={pImages}
                        title={p.title}
                        onOpenLightbox={(idx) => setLightboxData({ portfolio: p, index: idx })}
                      />

                      {catObj && (
                        <span className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-sm text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase flex items-center gap-1 z-20 pointer-events-none">
                          <Tag className="h-3 w-3" />
                          <span>{catObj.name}</span>
                        </span>
                      )}

                      {p.is_featured && (
                        <span className="absolute top-3 right-3 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase flex items-center gap-1 z-20 pointer-events-none">
                          <Star className="h-3 w-3 fill-amber-400" />
                          <span>Featured</span>
                        </span>
                      )}
                    </div>

                    <div className="p-4 space-y-2">
                      <h3 className="font-bold text-slate-100 text-base line-clamp-1">{p.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2">{p.description || 'Tanpa deskripsi'}</p>
                      
                      <div className="flex items-start justify-between text-xs pt-2 border-t border-slate-800/40">
                        <div>
                          <span className="text-slate-500 text-[11px] block">Klien :</span>
                          <span className="text-slate-300 font-medium">{p.client_name ? p.client_name : '-'}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-500 text-[11px] block">Diupload oleh :</span>
                          <span className="text-slate-300 font-semibold">{uploaderName}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="p-4 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      <span>{p.views_count || 0} Dilihat</span>
                    </span>
                    <div className="flex items-center gap-1">
                      {canEditPortfolio(p, user) && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Edit Portofolio Ini"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Portofolio"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredPortfolios.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredPortfolios.length}
            pageSize={pageSize}
            pageSizeOptions={[9, 18, 27, 45]}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      {/* LIGHTBOX FULLSIZE IMAGE MODAL */}
      {lightboxData && (
        <div
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxData(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full overflow-hidden shadow-2xl relative flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
              <div>
                <h3 className="font-bold text-slate-100 text-base">{lightboxData.portfolio.title}</h3>
                <div className="flex items-center gap-6 text-xs text-slate-400 mt-1">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Klien :</span>
                    <span className="text-slate-200 font-medium">{lightboxData.portfolio.client_name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Diupload oleh :</span>
                    <span className="text-slate-200 font-semibold">{getUploaderName(lightboxData.portfolio, user)}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLightboxData(null)}
                className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Image Stage */}
            <div className="relative flex-1 bg-slate-950 min-h-[350px] max-h-[65vh] flex items-center justify-center p-2 overflow-hidden">
              {(() => {
                const imgs = getPortfolioImages(lightboxData.portfolio);
                const activeImg = imgs[lightboxData.index] || imgs[0];

                return (
                  <>
                    {activeImg ? (
                      <img
                        src={getImageUrl(activeImg)}
                        alt={lightboxData.portfolio.title}
                        className="max-h-[60vh] max-w-full object-contain rounded-md shadow-2xl"
                      />
                    ) : (
                      <ImageIcon className="h-16 w-16 text-slate-700 stroke-1" />
                    )}

                    {/* Nav Arrows if multiple */}
                    {imgs.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setLightboxData(prev => ({
                              ...prev,
                              index: prev.index === 0 ? imgs.length - 1 : prev.index - 1
                            }))
                          }
                          className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-100 border border-slate-700 shadow-xl transition-all"
                          title="Foto Sebelumnya"
                        >
                          <ChevronLeft className="h-6 w-6" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setLightboxData(prev => ({
                              ...prev,
                              index: prev.index === imgs.length - 1 ? 0 : prev.index + 1
                            }))
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-100 border border-slate-700 shadow-xl transition-all"
                          title="Foto Selanjutnya"
                        >
                          <ChevronRight className="h-6 w-6" />
                        </button>

                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-950/80 backdrop-blur-sm text-slate-200 border border-slate-800 text-xs font-bold px-3 py-1 rounded-full">
                          {lightboxData.index + 1} / {imgs.length}
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Lightbox Footer Info */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 text-xs space-y-1">
              <p className="text-slate-300 font-medium">{lightboxData.portfolio.description || 'Tidak ada deskripsi rincian.'}</p>
            </div>
          </div>
        </div>
      )}

      {/* CREATE & EDIT PORTFOLIO MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-base">
                {editingPortfolio ? 'Edit Portofolio' : 'Tambah Portofolio Baru'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Judul Portofolio *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Contoh: Cetak Spanduk Komunitas Surabaya"
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Kategori (Category)</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Pilih Kategori --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Link Item Katalog (Opsional)</label>
                  <select
                    value={formData.item_id}
                    onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Pilih Item Katalog --</option>
                    {items.map(i => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Klien / Pelanggan (Opsional)</label>
                <input
                  type="text"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="Contoh: PT Surya Indah / Komunitas A"
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Multiple File Upload & Manage Section */}
              <div className="bg-slate-950 p-3 rounded-md border border-slate-800 space-y-2">
                <label className="block text-xs font-semibold text-emerald-400">
                  {editingPortfolio ? 'Kelola Foto Terpasang & Unggah Foto Tambahan' : 'Upload Berkas Gambar Foto Hasil Cetak (Bisa Multiple File) *'}
                </label>

                {/* Display Existing Saved Images with Delete Option when Editing */}
                {existingImageObjects.length > 0 && (
                  <div className="space-y-1.5 pb-2 border-b border-slate-800/80">
                    <span className="text-[11px] font-semibold text-slate-400">Foto Terpasang Saat Ini ({existingImageObjects.length}):</span>
                    <div className="grid grid-cols-4 gap-2">
                      {existingImageObjects.map((imgItem, idx) => {
                        const strUrl = typeof imgItem === 'string'
                          ? imgItem
                          : (imgItem.image_url || imgItem.url || imgItem.file_path || imgItem.path || imgItem.file_name || imgItem.filename || imgItem.image || imgItem.image_path || '');
                        
                        const fullUrl = strUrl && !strUrl.includes('/') && !strUrl.startsWith('http')
                          ? `/uploads/portfolios/${strUrl}`
                          : strUrl;

                        return (
                          <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-800 h-16 bg-slate-900">
                            <img src={getImageUrl(fullUrl)} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleDeleteExistingImage(imgItem, idx)}
                              className="absolute top-1 right-1 p-1 bg-slate-950/85 text-rose-400 rounded-full hover:bg-rose-500 hover:text-slate-950 transition-colors shadow-md"
                              title="Hapus foto ini (hapus duplikat)"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileSelect}
                  className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-lg p-2 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-emerald-500 file:text-slate-950 hover:file:bg-emerald-400 cursor-pointer"
                />

                {filePreviews.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800/80">
                    {filePreviews.map((src, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-800 h-16 bg-slate-900">
                        <img src={src} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveNewFile(idx)}
                          className="absolute top-1 right-1 p-1 bg-slate-950/80 text-rose-400 rounded-full hover:bg-rose-500 hover:text-slate-950 transition-colors"
                          title="Hapus file ini"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Deskripsi Proyek (Opsional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="2"
                  placeholder="Penjelasan bahan, mesin, atau hasil akhir cetakan..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_featured_check"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="rounded border-slate-800 text-emerald-500 focus:ring-0 bg-slate-950"
                />
                <label htmlFor="is_featured_check" className="text-xs text-slate-300 cursor-pointer select-none">
                  Tampilkan sebagai <strong>Portofolio Pilihan (Featured)</strong> di Halaman Utama Website
                </label>
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
                  disabled={loading}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : (editingPortfolio ? 'Update Portofolio' : 'Simpan Portofolio')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Portfolios;
