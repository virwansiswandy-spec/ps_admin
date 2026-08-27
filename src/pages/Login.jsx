import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle, ArrowRight, CheckCircle2, UserPlus, KeyRound, User } from 'lucide-react';
import api from '../services/api';

import Particles, { ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

// Stable Particles Configuration (Defined outside component to prevent re-initialization on state keyup renders)
const particlesInit = async (engine) => {
  await loadSlim(engine);
};

const particlesOptions = {
  background: {
    color: {
      value: "transparent",
    },
  },
  fpsLimit: 60,
  interactivity: {
    events: {
      onHover: {
        enable: true,
        mode: "grab",
      },
    },
    modes: {
      grab: {
        distance: 140,
        links: {
          opacity: 0.8,
        },
      },
    },
  },
  particles: {
    color: {
      value: "#10b981",
    },
    links: {
      color: "#10b981",
      distance: 150,
      enable: true,
      opacity: 0.2,
      width: 1,
    },
    move: {
      direction: "none",
      enable: true,
      outModes: {
        default: "bounce",
      },
      random: false,
      speed: 1.2,
      straight: false,
    },
    number: {
      density: {
        enable: true,
        area: 800,
      },
      value: 55,
    },
    opacity: {
      value: 0.4,
    },
    shape: {
      type: "circle",
    },
    size: {
      value: { min: 1, max: 3.5 },
    },
  },
  detectRetina: true,
};

const Login = () => {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot' | 'reset'

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register State
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Forgot / Reset State
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const clearAlerts = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    clearAlerts();
    const result = await login(email, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setErrorMessage(result.message);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    clearAlerts();
    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Konfirmasi password tidak cocok dengan password yang Anda masukkan.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/register', {
        email: regEmail,
        full_name: regFullName,
        password: regPassword
      });
      setSuccessMessage("Registrasi Berhasil! Silakan periksa email Anda dan klik link aktivasi yang kami kirimkan, lalu minta Pemilik Toko untuk menyetujui hak akses Staf Admin Anda.");
      setRegEmail('');
      setRegFullName('');
      setRegPassword('');
      setRegConfirmPassword('');
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || 'Gagal mendaftar akun baru.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    clearAlerts();
    setSubmitting(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail });
      setSuccessMessage(res.data.message || 'Instruksi reset password telah dikirim ke email Anda. Silakan cek inbox/spam email Anda.');
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || 'Gagal memproses permintaan lupa password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    clearAlerts();
    setSubmitting(true);
    try {
      const res = await api.post('/auth/reset-password', { token: resetToken, new_password: newPassword });
      setSuccessMessage(res.data.message || 'Password berhasil diubah! Silakan login.');
      setTimeout(() => {
        setMode('login');
      }, 2000);
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || 'Gagal mengubah password. Token tidak valid.');
    } finally {
      setSubmitting(false);
    }
  };

  // Memoized Particles Background to ensure 100% stable background rendering on input keyup state changes
  const particlesBackground = useMemo(() => (
    <Particles
      id="tsparticles"
      options={particlesOptions}
      className="absolute inset-0 pointer-events-auto"
    />
  ), []);

  return (
    <ParticlesProvider init={particlesInit}>
      <div className="min-h-screen w-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
        {/* Interactive Particles Background */}
        {particlesBackground}

        {/* Glow Orbs Decor */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-700/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 rounded-lg shadow-2xl relative z-10">
          {/* Brand Header with Frameless Logo */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-24 h-24 mb-2 flex items-center justify-center">
              <img src="/logo.png" alt="Primasakti Logo" className="w-full h-full object-contain filter drop-shadow-lg" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">PRIMASAKTI</h1>
            <p className="text-xs text-emerald-400 font-medium uppercase tracking-wider">Sistem POS & Admin Toko</p>
          </div>

          {/* Mode Selector Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-md border border-slate-800 mb-6 text-xs font-semibold">
            <button
              onClick={() => { setMode('login'); clearAlerts(); }}
              className={`flex-1 py-2 rounded-lg transition-colors ${mode === 'login' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Masuk
            </button>
            <button
              onClick={() => { setMode('register'); clearAlerts(); }}
              className={`flex-1 py-2 rounded-lg transition-colors ${mode === 'register' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Daftar Akun Baru
            </button>
          </div>

          {errorMessage && (
            <div className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-md flex items-center gap-3 text-red-400 text-xs leading-relaxed">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-md flex items-center gap-3 text-emerald-400 text-xs leading-relaxed">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Staf Admin</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@toko.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-md py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); clearAlerts(); }}
                    className="text-xs text-emerald-400 hover:underline"
                  >
                    Lupa Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-md py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-md transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2"
              >
                <span>{loading ? 'Memvalidasi Login...' : 'Masuk ke Sistem'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nama Lengkap Staf *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Contoh: Budi Setiawan"
                    className="w-full bg-slate-950 border border-slate-800 rounded-md py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Staf Admin *</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="nama@toko.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-md py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full bg-slate-950 border border-slate-800 rounded-md py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Konfirmasi Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Ulangi password di atas"
                    className="w-full bg-slate-950 border border-slate-800 rounded-md py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-md transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2"
              >
                <UserPlus className="h-4 w-4" />
                <span>{submitting ? 'Mengirim Pendaftaran...' : 'Daftar Akun Staf Baru'}</span>
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Staf Terdaftar *</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="nama@toko.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-md py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-md transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                <span>{submitting ? 'Mengirim Token...' : 'Kirim Instruksi Reset'}</span>
              </button>

              <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-800">
                <span>Sudah Punya Token Reset?</span>
                <button
                  type="button"
                  onClick={() => { setMode('reset'); clearAlerts(); }}
                  className="text-emerald-400 hover:underline font-semibold"
                >
                  Masukkan Token Reset
                </button>
              </div>

              <button
                type="button"
                onClick={() => { setMode('login'); clearAlerts(); }}
                className="w-full text-xs text-slate-400 hover:text-slate-200 text-center"
              >
                Kembali ke Form Login
              </button>
            </form>
          )}

          {/* RESET PASSWORD FORM */}
          {mode === 'reset' && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Token Reset (dari Email) *</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Tempelkan token reset di sini"
                    className="w-full bg-slate-950 border border-slate-800 rounded-md py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password Baru *</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full bg-slate-950 border border-slate-800 rounded-md py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-md transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                <span>{submitting ? 'Memperbarui Password...' : 'Simpan Password Baru'}</span>
              </button>

              <button
                type="button"
                onClick={() => { setMode('login'); clearAlerts(); }}
                className="w-full text-xs text-slate-400 hover:text-slate-200 text-center"
              >
                Kembali ke Form Login
              </button>
            </form>
          )}
        </div>
      </div>
    </ParticlesProvider>
  );
};

export default Login;
