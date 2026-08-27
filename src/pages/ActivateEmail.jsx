import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import api from '../services/api';

const ActivateEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('processing'); // 'processing' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setStatus('error');
      setMessage('Token aktivasi tidak ditemukan pada URL link email ini.');
      return;
    }

    const activate = async () => {
      try {
        const res = await api.get(`/auth/activate?token=${token}`);
        setStatus('success');
        setMessage(res.data.message || 'Email Anda berhasil diverifikasi!');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.detail || 'Gagal memverifikasi email. Token mungkin tidak valid atau sudah kedaluwarsa.');
      } finally {
        setLoading(false);
      }
    };

    activate();
  }, [token]);

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-8 rounded-lg shadow-2xl text-center relative z-10 space-y-6">
        <div className="flex flex-col items-center">
          <img src="/logo.png" alt="Primasakti Logo" className="w-16 h-16 object-contain mb-3" />
          <h1 className="text-xl font-bold text-slate-100">Verifikasi Email Staf</h1>
          <p className="text-xs text-slate-400">Sistem POS & Admin Primasakti</p>
        </div>

        {loading && (
          <div className="py-8 flex flex-col items-center gap-3 text-emerald-400 font-semibold text-sm">
            <RefreshCw className="h-8 w-8 animate-spin" />
            <span>Memproses verifikasi token email Anda...</span>
          </div>
        )}

        {!loading && status === 'success' && (
          <div className="py-4 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-lg font-bold text-emerald-400">Verifikasi Email Berhasil!</h2>
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-md border border-slate-800">
              {message}
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 px-4 rounded-md text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <span>KEMBALI KE HALAMAN LOGIN</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        {!loading && status === 'error' && (
          <div className="py-4 space-y-4">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center text-red-400 mx-auto">
              <AlertCircle className="h-10 w-10" />
            </div>
            <h2 className="text-lg font-bold text-red-400">Verifikasi Gagal</h2>
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-md border border-slate-800">
              {message}
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 px-4 rounded-md text-sm transition-all block"
              >
                Kembali ke Halaman Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivateEmail;
