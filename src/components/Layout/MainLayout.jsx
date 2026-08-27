import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingBag, ShoppingCart, Package, Grid,
  Award, Truck, Star, Image, LogOut, Wallet, User as UserIcon, RefreshCw, Layers, UserCheck, FileText, Receipt, MessageSquare, Settings, Menu, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api, { getFileUrl as getImageUrl, getWsUrl, SERVER_ORIGIN } from '../../services/api';

const SidebarContent = ({ isCollapsed, toggleSidebar, closeMobileMenu, isMobile = false }) => {
  const { isSuperAdmin } = useAuth();
  const [unreadWaCount, setUnreadWaCount] = useState(0);
  const [orderBadges, setOrderBadges] = useState({ pending: 0, processing: 0 });

  const fetchBadgeCounts = async () => {
    try {
      const [waRes, orderRes] = await Promise.all([
        api.get('/wa/unread-count').catch(() => ({ data: { unread_count: 0 } })),
        api.get('/orders/active-count').catch(() => ({ data: { pending: 0, processing: 0 } }))
      ]);
      if (waRes.data && waRes.data.unread_count !== undefined) {
        setUnreadWaCount(waRes.data.unread_count);
      }
      if (orderRes.data) {
        setOrderBadges({
          pending: orderRes.data.pending || 0,
          processing: orderRes.data.processing || 0
        });
      }
    } catch (err) {
      // Quiet fail if endpoints not ready
    }
  };

  useEffect(() => {
    fetchBadgeCounts();
    const interval = setInterval(fetchBadgeCounts, 10000);

    const wsUrl = getWsUrl('/api/v1/wa/ws');
    let ws = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'new_message' || data.event === 'unread_count_update') {
            fetchBadgeCounts();
          }
        } catch (e) {}
      };
    } catch (e) {}

    return () => {
      clearInterval(interval);
      if (ws) ws.close();
    };
  }, []);

  const allMenuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/pos', label: 'Buat Nota / Tanda Terima', icon: Receipt },
    {
      path: '/orders',
      label: 'Order / Nota',
      icon: ShoppingBag,
      badges: [
        { count: orderBadges.pending, label: 'Pending / Menunggu', color: 'bg-amber-400 text-slate-950 font-bold shadow-amber-500/20' },
        { count: orderBadges.processing, label: 'Diproses Cetak', color: 'bg-sky-400 text-slate-950 font-bold shadow-sky-500/20' }
      ]
    },
    {
      path: '/whatsapp',
      label: 'WhatsApp Toko',
      icon: MessageSquare,
      badges: [
        { count: unreadWaCount, label: 'Pesan Belum Dibaca', color: 'bg-emerald-500 text-slate-950 font-bold shadow-emerald-500/20' }
      ]
    },
    { path: '/categories', label: 'Kategori', icon: Grid },
    { path: '/items', label: 'Katalog Barang', icon: Package },
    { path: '/compositions', label: 'Katalog Komposisi', icon: Layers },
    { path: '/bonuses', label: 'Insentif & Bonus Staf', icon: Award },
    { path: '/purchases', label: 'Pembelian & Stok In', icon: Truck, superAdminOnly: true },
    { path: '/users', label: 'Manajemen Staf', icon: UserIcon, superAdminOnly: true },
    { path: '/ratings', label: 'Ulasan & Performa Staf', icon: Star },
    { path: '/portfolios', label: 'Galeri Portofolio', icon: Image },
    { path: '/settings', label: 'Pengaturan Toko', icon: Settings, superAdminOnly: true },
    { path: '/profile', label: 'Profil Saya', icon: UserCheck },
  ];

  const menuItems = allMenuItems.filter(item => !item.superAdminOnly || isSuperAdmin);
  const showLabels = isMobile || !isCollapsed;

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Primasakti Logo" className="h-10 w-10 object-contain" />
          {showLabels && (
            <div className="flex flex-col">
              <span className="font-bold text-lg text-emerald-400 leading-tight">PRIMASAKTI</span>
              <span className="text-xs text-slate-400">ATK & Printing Admin</span>
            </div>
          )}
        </div>
        {isMobile && (
          <button
            onClick={closeMobileMenu}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={isMobile ? closeMobileMenu : undefined}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
            >
              <div className="flex items-center min-w-0">
                <Icon className="h-5 w-5 flex-shrink-0" />
                {showLabels && <span className="ml-3 truncate">{item.label}</span>}
              </div>

              {item.badges && (
                <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                  {item.badges.map((b, idx) => (
                    b.count > 0 && (
                      <span
                        key={idx}
                        title={`${b.label}: ${b.count}`}
                        className={`${b.color} text-[10px] font-black rounded-full flex items-center justify-center ${!showLabels ? 'w-4 h-4 text-[9px]' : 'px-1.5 py-0.5'}`}
                      >
                        {b.count > 99 ? '99+' : b.count}
                      </span>
                    )
                  ))}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Sidebar Footer (Desktop only) */}
      {!isMobile && (
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={toggleSidebar}
            className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-2"
          >
            <span>{isCollapsed ? '«' : '« Ciutkan Sidebar'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

const Header = ({ toggleMobileMenu, isMobileOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [bonusSummary, setBonusSummary] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);

  const fetchHeaderInfo = async () => {
    try {
      const [bonusRes, profileRes] = await Promise.all([
        api.get('/bonuses/me').catch(() => ({ data: { summary: null } })),
        api.get('/profile/me').catch(() => ({ data: null }))
      ]);

      if (bonusRes.data?.summary) {
        setBonusSummary(bonusRes.data.summary);
      }
      if (profileRes.data?.avatar_url) {
        setAvatarUrl(profileRes.data.avatar_url);
      }
    } catch (err) {
      // Quiet fail
    }
  };

  useEffect(() => {
    fetchHeaderInfo();
    const interval = setInterval(fetchHeaderInfo, 30000);
    return () => clearInterval(interval);
  }, []);



  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 sm:px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Menu Toggle Button */}
        <button
          onClick={toggleMobileMenu}
          title="Buka Navigasi Menu Admin"
          className="p-2 text-slate-300 hover:bg-slate-800 rounded-lg md:hidden border border-slate-800 flex items-center justify-center"
        >
          {isMobileOpen ? <X className="h-5 w-5 text-emerald-400" /> : <Menu className="h-5 w-5 text-emerald-400" />}
        </button>

        {/* Brand Header for Mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <img src="/logo.png" alt="Logo" className="h-7 w-7 object-contain" />
          <span className="font-bold text-emerald-400 text-sm leading-none">PRIMASAKTI</span>
        </div>

        {/* Desktop Online Status */}
        <div className="hidden lg:flex items-center gap-3 text-slate-400 text-sm">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Backend Online: <strong className="text-slate-200">{SERVER_ORIGIN}</strong></span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Bonus Badge (Hidden on very small screens) */}
        {bonusSummary && (
          <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-full text-xs font-semibold">
            <Wallet className="h-4 w-4" />
            <span>Bonus Cair: Rp {bonusSummary.total_earned.toLocaleString('id-ID')}</span>
          </div>
        )}

        {/* User Info & Clickable Avatar + Name */}
        <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-slate-800">
          <div
            onClick={() => navigate('/profile')}
            className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 hover:border-emerald-500 transition-all flex items-center justify-center text-emerald-400 font-extrabold cursor-pointer overflow-hidden shadow-sm flex-shrink-0"
            title="Klik untuk Pengaturan Profil Staf"
          >
            {avatarUrl ? (
              <img src={getImageUrl(avatarUrl)} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              user?.full_name?.charAt(0).toUpperCase() || 'A'
            )}
          </div>

          <div
            onClick={() => navigate('/profile')}
            className="hidden sm:flex flex-col text-left cursor-pointer group"
            title="Klik untuk Pengaturan Profil Staf"
          >
            <span className="text-sm font-semibold text-slate-200 leading-tight group-hover:text-emerald-400 transition-colors truncate max-w-[120px]">
              {user?.full_name || 'Staf Admin'}
            </span>
            <span className={`text-[10px] font-mono font-bold uppercase ${user?.role === 'super_admin' ? 'text-amber-400' : 'text-emerald-400'}`}>
              {user?.role === 'super_admin' ? 'Pemilik Toko' : 'Admin Kasir'}
            </span>
          </div>

          <button
            onClick={logout}
            title="Logout Akun"
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

const MainLayout = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile sidebar whenever route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex bg-slate-900 border-r border-slate-800 transition-all duration-300 flex-col ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <SidebarContent isCollapsed={isCollapsed} toggleSidebar={() => setIsCollapsed(!isCollapsed)} />
      </aside>

      {/* Mobile Sidebar Overlay Drawer */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 transition-transform duration-300 flex flex-col md:hidden shadow-2xl ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent
          isMobile={true}
          closeMobileMenu={() => setIsMobileOpen(false)}
        />
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <Header toggleMobileMenu={() => setIsMobileOpen(!isMobileOpen)} isMobileOpen={isMobileOpen} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 bg-slate-950 flex flex-col min-h-0">
          <div key={location.pathname} className="page-transition h-full w-full flex flex-col min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
