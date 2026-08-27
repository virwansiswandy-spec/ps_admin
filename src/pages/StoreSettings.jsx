import React, { useState, useEffect } from 'react';
import Flatpickr from 'react-flatpickr';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Store,
  Clock,
  CreditCard,
  Calendar,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Bot,
  MapPin,
  Phone,
  Globe,
  Loader2,
  ShieldAlert
} from 'lucide-react';

export default function StoreSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text: '' }

  const [formData, setFormData] = useState({
    STORE_NAME: '',
    STORE_DESCRIPTION: '',
    STORE_ADDRESS: '',
    STORE_MAPS_URL: '',
    STORE_PHONE: '',
    STORE_WEBSITE: '',
    STORE_HOURS_START: 8,
    STORE_HOURS_END: 17,
    STORE_AUTO_REPLY_ENABLED: true,
    STORE_CLOSED_DATES: [],
    BANK_BCA_ACCOUNT_NO: '',
    BANK_BCA_ACCOUNT_NAME: '',
    BANK_MANDIRI_ACCOUNT_NO: '',
    BANK_MANDIRI_ACCOUNT_NAME: '',
    STATIC_QRIS_BCA_IMAGE_URL: ''
  });

  const [newDateInput, setNewDateInput] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings/store');
      setFormData(res.data);
    } catch (err) {
      console.error('Failed to load store settings:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Gagal memuat konfigurasi toko.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddClosedDate = () => {
    if (!newDateInput) return;
    if (formData.STORE_CLOSED_DATES.includes(newDateInput)) {
      setMessage({ type: 'error', text: 'Tanggal libur tersebut sudah ada di daftar.' });
      return;
    }
    setFormData((prev) => ({
      ...prev,
      STORE_CLOSED_DATES: [...prev.STORE_CLOSED_DATES, newDateInput].sort()
    }));
    setNewDateInput('');
    setMessage(null);
  };

  const handleRemoveClosedDate = (dateToRemove) => {
    setFormData((prev) => ({
      ...prev,
      STORE_CLOSED_DATES: prev.STORE_CLOSED_DATES.filter((d) => d !== dateToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (user?.role !== 'super_admin') {
      setMessage({
        type: 'error',
        text: 'Akses ditolak: Hanya Super Admin yang diizinkan mengedit konfigurasi toko.'
      });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const res = await api.put('/settings/store', formData);
      setFormData(res.data);
      setMessage({
        type: 'success',
        text: 'Konfigurasi toko berhasil diperbarui dan disimpan ke file .env!'
      });
    } catch (err) {
      console.error('Failed to update store settings:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Gagal memperbarui konfigurasi toko.'
      });
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <ShieldAlert className="h-16 w-16 text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-100 mb-2">Akses Terbatas</h2>
        <p className="text-slate-400 text-sm max-w-md">
          Halaman Pengaturan Konfigurasi Toko hanya dapat diakses oleh pengguna dengan kewenangan <strong>Super Admin</strong>.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-3" />
        <p className="text-sm">Memuat pengaturan toko...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Store className="h-7 w-7 text-emerald-400" />
            Pengaturan Toko
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Kelola konfigurasi identitas toko, jam operasional, AI auto-reply, rekening bank, dan tanggal libur khusus.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-lg transition-all shadow-lg shadow-emerald-500/20"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Simpan Konfigurasi (.env)
            </>
          )}
        </button>
      </div>

      {/* Alert Notification */}
      {message && (
        <div
          className={`p-4 rounded-lg border flex items-center gap-3 text-xs ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Identitas & Kontak Toko */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-slate-200 border-b border-slate-800 pb-3">
            <Store className="h-5 w-5 text-emerald-400" />
            <h2 className="font-bold text-sm">Identitas & Informasi Toko</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Nama Toko (STORE_NAME)</label>
              <input
                type="text"
                value={formData.STORE_NAME}
                onChange={(e) => handleInputChange('STORE_NAME', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">No. Telepon Toko (STORE_PHONE)</label>
              <div className="relative">
                <Phone className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={formData.STORE_PHONE}
                  onChange={(e) => handleInputChange('STORE_PHONE', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1">Deskripsi Singkat (STORE_DESCRIPTION)</label>
              <input
                type="text"
                value={formData.STORE_DESCRIPTION}
                onChange={(e) => handleInputChange('STORE_DESCRIPTION', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1">Alamat Toko (STORE_ADDRESS)</label>
              <div className="relative">
                <MapPin className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={formData.STORE_ADDRESS}
                  onChange={(e) => handleInputChange('STORE_ADDRESS', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Google Maps Link (STORE_MAPS_URL)</label>
              <input
                type="text"
                value={formData.STORE_MAPS_URL}
                onChange={(e) => handleInputChange('STORE_MAPS_URL', e.target.value)}
                placeholder="https://maps.google.com/..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Website Toko (STORE_WEBSITE)</label>
              <div className="relative">
                <Globe className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={formData.STORE_WEBSITE}
                  onChange={(e) => handleInputChange('STORE_WEBSITE', e.target.value)}
                  placeholder="www.primasakti.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Jam Operasional Toko & AI Auto-Reply */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-slate-200 border-b border-slate-800 pb-3">
            <Clock className="h-5 w-5 text-emerald-400" />
            <h2 className="font-bold text-sm">Jam Operasional & Auto-Reply WhatsApp</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Jam Buka (STORE_HOURS_START)</label>
              <div className="flex items-center gap-2">
                <Flatpickr
                  options={{
                    enableTime: true,
                    noCalendar: true,
                    dateFormat: "H:i",
                    time_24hr: true,
                    disableMobile: true
                  }}
                  value={`${String(formData.STORE_HOURS_START).padStart(2, '0')}:00`}
                  onChange={([date]) => {
                    if (date) {
                      handleInputChange('STORE_HOURS_START', date.getHours());
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono cursor-pointer"
                />
                <span className="text-xs text-slate-400 font-semibold">WIB</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Jam Tutup (STORE_HOURS_END)</label>
              <div className="flex items-center gap-2">
                <Flatpickr
                  options={{
                    enableTime: true,
                    noCalendar: true,
                    dateFormat: "H:i",
                    time_24hr: true,
                    disableMobile: true
                  }}
                  value={`${String(formData.STORE_HOURS_END).padStart(2, '0')}:00`}
                  onChange={([date]) => {
                    if (date) {
                      handleInputChange('STORE_HOURS_END', date.getHours());
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono cursor-pointer"
                />
                <span className="text-xs text-slate-400 font-semibold">WIB</span>
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-300">AI Auto-Reply</span>
              </div>
              <button
                type="button"
                onClick={() => handleInputChange('STORE_AUTO_REPLY_ENABLED', !formData.STORE_AUTO_REPLY_ENABLED)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  formData.STORE_AUTO_REPLY_ENABLED ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    formData.STORE_AUTO_REPLY_ENABLED ? 'translate-x-4.5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Rekening Pembayaran & QRIS */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-slate-200 border-b border-slate-800 pb-3">
            <CreditCard className="h-5 w-5 text-emerald-400" />
            <h2 className="font-bold text-sm">Rekening Pembayaran Bank & QRIS</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">No. Rekening BCA</label>
              <input
                type="text"
                value={formData.BANK_BCA_ACCOUNT_NO}
                onChange={(e) => handleInputChange('BANK_BCA_ACCOUNT_NO', e.target.value)}
                placeholder="Contoh: 0882772718"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Atas Nama (A.N.) BCA</label>
              <input
                type="text"
                value={formData.BANK_BCA_ACCOUNT_NAME}
                onChange={(e) => handleInputChange('BANK_BCA_ACCOUNT_NAME', e.target.value)}
                placeholder="Contoh: Prima Sakti"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">No. Rekening Mandiri</label>
              <input
                type="text"
                value={formData.BANK_MANDIRI_ACCOUNT_NO}
                onChange={(e) => handleInputChange('BANK_MANDIRI_ACCOUNT_NO', e.target.value)}
                placeholder="Contoh: 1410012345678"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Atas Nama (A.N.) Mandiri</label>
              <input
                type="text"
                value={formData.BANK_MANDIRI_ACCOUNT_NAME}
                onChange={(e) => handleInputChange('BANK_MANDIRI_ACCOUNT_NAME', e.target.value)}
                placeholder="Contoh: Prima Sakti"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1">URL Gambar Static QRIS BCA</label>
              <input
                type="text"
                value={formData.STATIC_QRIS_BCA_IMAGE_URL}
                onChange={(e) => handleInputChange('STATIC_QRIS_BCA_IMAGE_URL', e.target.value)}
                placeholder="/uploads/store/qr-bca.jpeg"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Kalender Libur Khusus Toko (STORE_CLOSED_DATES) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-slate-200 border-b border-slate-800 pb-3">
            <Calendar className="h-5 w-5 text-emerald-400" />
            <h2 className="font-bold text-sm">Kalender Tanggal Libur Khusus Toko (STORE_CLOSED_DATES)</h2>
          </div>

          <p className="text-xs text-slate-400">
            Libur Nasional resmi Indonesia sudah terdeteksi otomatis oleh AI. Gunakan daftar di bawah ini untuk menambahkan <strong>tanggal libur khusus toko</strong> (misal: acara keluarga/renovasi toko).
          </p>

          <div className="flex gap-2">
            <Flatpickr
              value={newDateInput}
              onChange={([date]) => {
                if (date) {
                  const yyyy = date.getFullYear();
                  const mm = String(date.getMonth() + 1).padStart(2, '0');
                  const dd = String(date.getDate()).padStart(2, '0');
                  setNewDateInput(`${yyyy}-${mm}-${dd}`);
                } else {
                  setNewDateInput('');
                }
              }}
              options={{
                dateFormat: "Y-m-d",
                altInput: true,
                altFormat: "d F Y",
                disableMobile: true
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono cursor-pointer"
              placeholder="Pilih Tanggal Libur..."
            />
            <button
              type="button"
              onClick={handleAddClosedDate}
              className="flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-lg text-xs font-bold transition-colors"
            >
              <Plus className="h-4 w-4" />
              Tambah Tanggal
            </button>
          </div>

          {formData.STORE_CLOSED_DATES.length === 0 ? (
            <div className="p-4 bg-slate-950 border border-slate-800/60 rounded-lg text-xs text-slate-500 text-center italic">
              Belum ada tanggal libur khusus yang ditambahkan.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 pt-2">
              {formData.STORE_CLOSED_DATES.map((dateStr) => (
                <span
                  key={dateStr}
                  className="inline-flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono text-amber-400"
                >
                  <Calendar className="h-3.5 w-3.5 text-amber-500" />
                  {dateStr}
                  <button
                    type="button"
                    onClick={() => handleRemoveClosedDate(dateStr)}
                    className="text-slate-500 hover:text-red-400 transition-colors ml-1"
                    title="Hapus Tanggal"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
