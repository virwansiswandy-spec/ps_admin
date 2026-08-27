import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Camera, CheckCircle2, AlertTriangle, Plus, Trash2, ShieldCheck, KeyRound, RefreshCw, X, MapPin, Edit3 } from 'lucide-react';
import api, { getFileUrl as getImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { showSuccess, showError, showConfirm } from '../utils/swal';
import Flatpickr from "react-flatpickr";

const Profile = () => {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [phones, setPhones] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Profile Form State (user_profiles table)
  const [gender, setGender] = useState('male');
  const [bornDate, setBornDate] = useState('');
  const [language, setLanguage] = useState('id');
  const [timezone, setTimezone] = useState('Asia/Jakarta');

  // Phone Form State (user_phones table)
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [newPhoneType, setNewPhoneType] = useState('whatsapp');
  const [newIsPrimary, setNewIsPrimary] = useState(false);

  // Address Modal State (user_addresses table - Simplified Admin Residential Address)
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState({
    address_type: 'home',
    street_address: '',
    district: '',
    city: '',
    province: '',
    postal_code: '',
    is_primary: false
  });

  // OTP Modal State
  const [otpModalPhone, setOtpModalPhone] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const [profileRes, phonesRes, addrRes] = await Promise.all([
        api.get('/profile/me').catch(() => ({ data: null })),
        api.get('/phones/').catch(() => ({ data: [] })),
        api.get('/addresses/').catch(() => ({ data: [] }))
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data);
        setGender(profileRes.data.gender || 'male');
        setBornDate(profileRes.data.born_date || '');
        setLanguage(profileRes.data.language || 'id');
        setTimezone(profileRes.data.timezone || 'Asia/Jakarta');
      }

      setPhones(phonesRes.data || []);
      setAddresses(addrRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleAvatarSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/profile/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfile(res.data);
      showSuccess('Berhasil!', 'Foto profil berhasil diperbarui!');
    } catch (err) {
      showError('Gagal!', err.response?.data?.detail || 'Gagal mengunggah foto profil.');
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const payload = {
        gender,
        born_date: bornDate || null,
        language,
        timezone
      };

      const res = await api.put('/profile/me', payload);
      setProfile(res.data);
      showSuccess('Berhasil!', 'Informasi profil berhasil disimpan!');
    } catch (err) {
      showError('Gagal!', err.response?.data?.detail || 'Gagal menyimpan profil.');
    } finally {
      setSavingProfile(false);
    }
  };

  // PHONE HANDLERS
  const handleAddPhone = async (e) => {
    e.preventDefault();
    if (!newPhoneNumber.trim()) {
      showError('Peringatan', 'Nomor telepon harus diisi.');
      return;
    }

    try {
      const payload = {
        phone_number: newPhoneNumber.trim(),
        phone_type: newPhoneType,
        is_primary: newIsPrimary
      };

      const res = await api.post('/phones/', payload);
      const addedPhone = res.data;
      setNewPhoneNumber('');
      setNewIsPrimary(false);
      fetchProfileData();

      // Automatically trigger OTP request for new phone
      handleRequestOtp(addedPhone);
    } catch (err) {
      showError('Gagal!', err.response?.data?.detail || 'Gagal menambahkan nomor telepon.');
    }
  };

  const handleSetPrimaryPhone = async (phoneId) => {
    try {
      await api.put(`/phones/${phoneId}`, { is_primary: true });
      fetchProfileData();
    } catch (err) {
      showError('Gagal!', err.response?.data?.detail || 'Gagal mengubah nomor utama.');
    }
  };

  const handleDeletePhone = async (phone) => {
    const confirmed = await showConfirm({
      title: 'Hapus Nomor Telepon?',
      text: `Nomor ${phone.phone_number} akan dihapus dari akun Anda.`
    });
    if (!confirmed) return;

    try {
      await api.delete(`/phones/${phone.id}`);
      fetchProfileData();
    } catch (err) {
      showError('Gagal!', err.response?.data?.detail || 'Gagal menghapus nomor telepon.');
    }
  };

  const handleRequestOtp = async (phone) => {
    try {
      const res = await api.post(`/phones/${phone.id}/request-otp`);
      setOtpModalPhone(phone);
      setOtpCode('');
      setOtpMessage(res.data.message || `Kode OTP telah dikirim ke nomor ${phone.phone_number}`);
    } catch (err) {
      showError('Gagal!', err.response?.data?.detail || 'Gagal meminta kode OTP verifikasi.');
    }
  };

  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 4) {
      showError('Peringatan', 'Masukkan kode OTP dengan benar.');
      return;
    }

    setVerifyingOtp(true);
    try {
      await api.post(`/phones/${otpModalPhone.id}/verify-otp`, { otp_code: otpCode.trim() });
      showSuccess('Berhasil!', 'Nomor telepon berhasil diverifikasi!');
      setOtpModalPhone(null);
      setOtpCode('');
      fetchProfileData();
    } catch (err) {
      showError('Gagal!', err.response?.data?.detail || 'Kode OTP tidak valid.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // ADDRESS HANDLERS (Simplified for Admin Staff Residential Address)
  const openNewAddressModal = () => {
    setEditingAddressId(null);
    setAddressForm({
      address_type: 'home',
      street_address: '',
      district: '',
      city: '',
      province: '',
      postal_code: '',
      is_primary: addresses.length === 0
    });
    setShowAddressModal(true);
  };

  const openEditAddressModal = (addr) => {
    setEditingAddressId(addr.id);
    setAddressForm({
      address_type: addr.address_type || 'home',
      street_address: addr.street_address || '',
      district: addr.district || '',
      city: addr.city || '',
      province: addr.province || '',
      postal_code: addr.postal_code || '',
      is_primary: addr.is_primary || false
    });
    setShowAddressModal(true);
  };

  const getAddressTypeLabel = (type) => {
    if (type === 'home') return 'Rumah Tempat Tinggal';
    if (type === 'other') return 'Kos / Kontrakan';
    if (type === 'office') return 'Rumah KTP / Asal';
    return 'Alamat Tinggal';
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    if (!addressForm.street_address.trim() || !addressForm.city.trim() || !addressForm.province.trim()) {
      showError('Peringatan', 'Alamat Lengkap, Kota, dan Provinsi wajib diisi.');
      return;
    }

    const typeLabel = getAddressTypeLabel(addressForm.address_type);
    const primaryPhone = phones.length > 0 ? (phones.find(p => p.is_primary)?.phone_number || phones[0].phone_number) : '-';

    try {
      const payload = {
        label: typeLabel,
        address_type: addressForm.address_type,
        recipient_name: user?.full_name || 'Staf Admin',
        phone_number: primaryPhone,
        street_address: addressForm.street_address.trim(),
        district: addressForm.district ? addressForm.district.trim() : null,
        city: addressForm.city.trim(),
        province: addressForm.province.trim(),
        postal_code: addressForm.postal_code ? addressForm.postal_code.trim() : null,
        is_primary: Boolean(addressForm.is_primary)
      };

      if (editingAddressId) {
        await api.put(`/addresses/${editingAddressId}`, payload);
        showSuccess('Berhasil!', 'Alamat tempat tinggal berhasil diperbarui!');
      } else {
        await api.post('/addresses/', payload);
        showSuccess('Berhasil!', 'Alamat tempat tinggal baru berhasil ditambahkan!');
      }
      setShowAddressModal(false);
      fetchProfileData();
    } catch (err) {
      showError('Gagal!', err.response?.data?.detail || 'Gagal menyimpan alamat.');
    }
  };

  const handleSetPrimaryAddress = async (addrId) => {
    try {
      await api.put(`/addresses/${addrId}`, { is_primary: true });
      fetchProfileData();
    } catch (err) {
      showError('Gagal!', err.response?.data?.detail || 'Gagal mengubah alamat utama.');
    }
  };

  const handleDeleteAddress = async (addr) => {
    const typeLabel = getAddressTypeLabel(addr.address_type);
    const confirmed = await showConfirm({
      title: 'Hapus Alamat Tempat Tinggal?',
      text: `Hapus alamat "${typeLabel}"?`
    });
    if (!confirmed) return;

    try {
      await api.delete(`/addresses/${addr.id}`);
      fetchProfileData();
    } catch (err) {
      showError('Gagal!', err.response?.data?.detail || 'Gagal menghapus alamat.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Profil Saya</h1>
          <p className="text-sm text-slate-400">Pengaturan profil staf admin, foto avatar, verifikasi WhatsApp, & alamat tempat tinggal domisili</p>
        </div>
        <button
          onClick={fetchProfileData}
          className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-md transition-colors flex items-center gap-2 text-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-xl flex flex-col md:flex-row items-center gap-6">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full bg-slate-950 border-2 border-emerald-500/50 overflow-hidden flex items-center justify-center text-emerald-400 text-3xl font-extrabold shadow-inner">
            {profile?.avatar_url ? (
              <img src={getImageUrl(profile.avatar_url)} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              user?.full_name?.charAt(0).toUpperCase() || 'A'
            )}
          </div>
          
          <label className="absolute bottom-0 right-0 p-2 bg-emerald-500 text-slate-950 rounded-full cursor-pointer hover:bg-emerald-400 transition-all shadow-lg">
            <Camera className="h-4 w-4" />
            <input type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
          </label>
        </div>

        <div className="space-y-1 text-center md:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <h2 className="text-xl font-bold text-slate-100">{user?.full_name || 'Staf Admin'}</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
              user?.role === 'super_admin' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {user?.role === 'super_admin' ? 'Pemilik Toko (Super Admin)' : 'Staf Admin Toko'}
            </span>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-2 text-xs text-slate-400">
            <Mail className="h-3.5 w-3.5 text-slate-500" />
            <span>{user?.email}</span>
          </div>

          <p className="text-xs text-slate-500 pt-1">
            Status Akun: <span className="text-emerald-400 font-semibold">Aktif & Terautentikasi</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 1: USER PROFILES FORM */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-emerald-400 font-bold text-sm">
            <User className="h-4 w-4" />
            <span>Informasi Detail Profil (user_profiles)</span>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Jenis Kelamin</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="male">Laki-laki (Male)</option>
                <option value="female">Perempuan (Female)</option>
                <option value="other">Lainnya (Other)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Tanggal Lahir</label>
              <Flatpickr
                value={bornDate}
                onChange={([date]) => {
                  if (date) {
                    const yyyy = date.getFullYear();
                    const mm = String(date.getMonth() + 1).padStart(2, '0');
                    const dd = String(date.getDate()).padStart(2, '0');
                    setBornDate(`${yyyy}-${mm}-${dd}`);
                  } else {
                    setBornDate('');
                  }
                }}
                options={{
                  dateFormat: "Y-m-d",
                  altInput: true,
                  altFormat: "d F Y",
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono cursor-pointer"
                placeholder="Pilih Tanggal Lahir"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Bahasa Pengantar</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="id">Bahasa Indonesia (ID)</option>
                  <option value="en">English (EN)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Zona Waktu</label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md text-xs shadow-md shadow-emerald-500/20 disabled:opacity-50 mt-2"
            >
              {savingProfile ? 'Menyimpan...' : 'Simpan Perubahan Profil'}
            </button>
          </form>
        </div>

        {/* SECTION 2: USER PHONES & OTP VERIFICATION */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-emerald-400 font-bold text-sm">
            <Phone className="h-4 w-4" />
            <span>Nomor Telepon & WhatsApp Staf (user_phones)</span>
          </div>

          {/* Registered Phones List */}
          <div className="space-y-2.5">
            {phones.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">Belum ada nomor telepon terdaftar.</p>
            ) : (
              phones.map(p => (
                <div key={p.id} className="bg-slate-950 border border-slate-800 p-2.5 rounded-md flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-100 text-xs">{p.phone_number}</span>
                      {p.is_primary && (
                        <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded text-[10px] font-bold">
                          Utama
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px] uppercase font-semibold">
                        {p.phone_type}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px]">
                      {p.is_verified ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Terverifikasi</span>
                        </span>
                      ) : (
                        <span className="text-amber-400 flex items-center gap-1 font-semibold">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Belum Terverifikasi</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {!p.is_verified && (
                      <button
                        onClick={() => handleRequestOtp(p)}
                        className="py-1 px-2 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 rounded text-[10px] font-bold transition-all flex items-center gap-1"
                      >
                        <ShieldCheck className="h-3 w-3" />
                        <span>Verifikasi OTP</span>
                      </button>
                    )}
                    {!p.is_primary && (
                      <button
                        onClick={() => handleSetPrimaryPhone(p.id)}
                        className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-semibold"
                      >
                        Utama
                      </button>
                    )}
                    <button
                      onClick={() => handleDeletePhone(p)}
                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                      title="Hapus Nomor"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Form Add New Phone */}
          <form onSubmit={handleAddPhone} className="pt-3 border-t border-slate-800 space-y-2 text-xs">
            <span className="font-bold text-slate-200 block">+ Tambah Nomor HP / WhatsApp Baru</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1">Nomor Telepon / WA *</label>
                <input
                  type="text"
                  required
                  value={newPhoneNumber}
                  onChange={(e) => setNewPhoneNumber(e.target.value)}
                  placeholder="Contoh: 08123456789"
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Tipe Telepon</label>
                <select
                  value={newPhoneType}
                  onChange={(e) => setNewPhoneType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="mobile">Mobile (Seluler)</option>
                  <option value="work">Work (Kantor)</option>
                  <option value="home">Home (Rumah)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newIsPrimary}
                  onChange={(e) => setNewIsPrimary(e.target.checked)}
                  className="rounded border-slate-800 text-emerald-500 focus:ring-0 bg-slate-950"
                />
                <span className="text-slate-400 text-xs">Jadikan Nomor Utama</span>
              </label>

              <button
                type="submit"
                className="py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah & Verifikasi OTP</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* SECTION 3: ADMIN RESIDENTIAL ADDRESSES MANAGEMENT (Simplified user_addresses table) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <MapPin className="h-4 w-4" />
              <span>Alamat Tempat Tinggal / Domisili Staf Admin (user_addresses)</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Pencatatan alamat domisili KTP, rumah tempat tinggal, atau kos staf admin</p>
          </div>

          <button
            onClick={openNewAddressModal}
            className="py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Alamat Tinggal</span>
          </button>
        </div>

        {/* Addresses List */}
        {addresses.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-3 text-center">Belum ada alamat tempat tinggal terdaftar. Klik "+ Tambah Alamat Tinggal" untuk menambahkan domisili Anda.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map(addr => {
              const typeLabel = getAddressTypeLabel(addr.address_type);
              return (
                <div key={addr.id} className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2 text-xs flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 text-sm">{typeLabel}</span>
                        {addr.is_primary && (
                          <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded text-[10px] font-bold">
                            Domisili Utama
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-slate-300 leading-relaxed">{addr.street_address}</p>

                    <div className="text-[11px] text-slate-400 space-y-0.5 pt-1">
                      <p>Kecamatan: <strong className="text-slate-200">{addr.district || '-'}</strong>, Kota: <strong className="text-slate-200">{addr.city}</strong></p>
                      <p>Provinsi: <strong className="text-slate-200">{addr.province}</strong> (Kode Pos: {addr.postal_code || '-'})</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <div>
                      {!addr.is_primary && (
                        <button
                          onClick={() => handleSetPrimaryAddress(addr.id)}
                          className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-semibold"
                        >
                          Jadikan Utama
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditAddressModal(addr)}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors"
                        title="Edit Alamat"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAddress(addr)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                        title="Hapus Alamat"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ADDRESS MODAL (CREATE / EDIT SIMPLIFIED RESIDENTIAL ADDRESS) */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-base">
                {editingAddressId ? 'Edit Alamat Tempat Tinggal' : 'Tambah Alamat Tempat Tinggal Staf'}
              </h3>
              <button onClick={() => setShowAddressModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddressSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Tipe Tempat Tinggal *</label>
                <select
                  value={addressForm.address_type}
                  onChange={(e) => setAddressForm({ ...addressForm, address_type: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="home">Rumah Tempat Tinggal (Home)</option>
                  <option value="other">Kos / Kontrakan (Other)</option>
                  <option value="office">Rumah KTP / Asal (Office)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Alamat Lengkap Tempat Tinggal *</label>
                <textarea
                  required
                  rows="3"
                  value={addressForm.street_address}
                  onChange={(e) => setAddressForm({ ...addressForm, street_address: e.target.value })}
                  placeholder="Jl. Raya Tenggilis No. 34-34A, RT 01 / RW 02..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Kecamatan (Opsional)</label>
                  <input
                    type="text"
                    value={addressForm.district}
                    onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value })}
                    placeholder="Contoh: Rungkut"
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Kota / Kabupaten *</label>
                  <input
                    type="text"
                    required
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    placeholder="Contoh: Surabaya"
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Provinsi *</label>
                  <input
                    type="text"
                    required
                    value={addressForm.province}
                    onChange={(e) => setAddressForm({ ...addressForm, province: e.target.value })}
                    placeholder="Contoh: Jawa Timur"
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Kode Pos (Opsional)</label>
                  <input
                    type="text"
                    value={addressForm.postal_code}
                    onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                    placeholder="Contoh: 60292"
                    className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={addressForm.is_primary}
                    onChange={(e) => setAddressForm({ ...addressForm, is_primary: e.target.checked })}
                    className="rounded border-slate-800 text-emerald-500 focus:ring-0 bg-slate-950"
                  />
                  <span className="text-slate-300 text-xs font-semibold">Jadikan Domisili Utama Staf</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-800 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-md text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md text-xs shadow-md shadow-emerald-500/20"
                >
                  {editingAddressId ? 'Simpan Perubahan' : 'Tambah Alamat Tinggal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OTP VERIFICATION MODAL */}
      {otpModalPhone && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-amber-400">
                <KeyRound className="h-5 w-5" />
                <span className="font-bold text-sm">Verifikasi OTP Telepon</span>
              </div>
              <button onClick={() => setOtpModalPhone(null)} className="text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {otpMessage}
            </p>

            <form onSubmit={handleVerifyOtpSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Kode OTP 6 Digit</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Masukkan 6 digit OTP"
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-3 text-center text-lg font-bold font-mono tracking-widest text-emerald-400 focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setOtpModalPhone(null)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-md text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={verifyingOtp}
                  className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-md text-xs shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {verifyingOtp ? 'Memverifikasi...' : 'VERIFIKASI OTP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
