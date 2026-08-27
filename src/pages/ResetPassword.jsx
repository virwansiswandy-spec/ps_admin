import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { KeyRound, CheckCircle2, AlertCircle, ArrowRight, Lock } from 'lucide-react';
import api from '../services/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('input'); // 'input' | 'success' | 'error'
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setStatus('error');
      setMessage('Token reset password tidak ditemukan pada URL link email ini.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus('error');
      setMessage('Konfirmasi password tidak cocok dengan password baru.');
      return;
    }

    setLoading(true);
    setStatus('input');
    setMessage('');
    try {
      const res = await api.post('/auth/reset-password', {
        token: token,
        new_password: newPassword
      });
      setStatus('success');
      setMessage(res.data.message || 'Password Anda telah berhasil diperbarui!');
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.detail || 'Gagal mengubah password. Token mungkin sudah kedaluwarsa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-8 rounded-lg shadow-2xl text-center relative z-10 space-y-6">
        <div className="flex flex-col items-center">
          <img src="/logo.png" alt="Primasakti Logo" className="w-16 h-16 object-contain mb-3" />
          <h1 className="text-xl font-bold text-slate-100">Reset Password Baru</h1>
          <p className="text-xs text-slate-400">Sistem POS & Admin Primasakti</p>
        </div>

        {status === 'error' && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-md flex items-center gap-3 text-red-400 text-xs text-left">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {status === 'success' ? (
          <div className="py-4 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-lg font-bold text-emerald-400">Password Berhasil Diperbarui!</h2>
            <p className="text-xs text-slate-300 bg-slate-950 p-4 rounded-md border border-slate-800">
              {message}
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 px-4 rounded-md text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <span>LOGIN DENGAN PASSWORD BARU</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Password Baru</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-md py-2.5 pl-10 pr-4 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Konfirmasi Password Baru</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-md py-2.5 pl-10 pr-4 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 px-4 rounded-md text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span>Memproses Reset...</span>
              ) : (
                <>
                  <span>SIMPAN PASSWORD BARU</span>
                  <KeyRound className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
